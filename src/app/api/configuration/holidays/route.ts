import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays, members } from "@/db/schema";
import { eq, and, inArray, isNotNull, gte } from "drizzle-orm";
import { requireGroupAccess } from "@/lib/api-helpers";

/**
 * Admin-managed member-level holidays for a group.
 * GET also returns user-scoped holidays for linked members.
 */

export async function GET(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const today = new Date().toISOString().split("T")[0];

  // Get all members for this group (including userId for linked members)
  const groupMembers = await db
    .select({ id: members.id, name: members.name, userId: members.userId })
    .from(members)
    .where(eq(members.groupId, groupId));

  const memberIds = groupMembers.map((m) => m.id);

  if (memberIds.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch member-level holidays (admin-set, where memberId is set)
  const memberHolidays = await db
    .select()
    .from(holidays)
    .where(
      and(
        inArray(holidays.memberId, memberIds),
        isNotNull(holidays.memberId),
        gte(holidays.endDate, today)
      )
    );

  const result: Array<{
    id: number;
    memberId: number | null;
    userId: string | null;
    startDate: string;
    endDate: string;
    description: string | null;
    memberName: string;
    source: "member" | "user";
  }> = memberHolidays.map((h) => ({
    id: h.id,
    memberId: h.memberId,
    userId: h.userId,
    startDate: h.startDate,
    endDate: h.endDate,
    description: h.description,
    memberName: groupMembers.find((m) => m.id === h.memberId)?.name ?? "Desconocido",
    source: "member" as const,
  }));

  // Fetch user-scoped holidays for linked members
  const linkedMembers = groupMembers.filter((m) => m.userId != null);
  if (linkedMembers.length > 0) {
    const linkedUserIds = linkedMembers.map((m) => m.userId!);
    const userHolidays = await db
      .select()
      .from(holidays)
      .where(
        and(
          inArray(holidays.userId, linkedUserIds),
          isNotNull(holidays.userId),
          gte(holidays.endDate, today)
        )
      );

    for (const h of userHolidays) {
      const member = linkedMembers.find((m) => m.userId === h.userId);
      result.push({
        id: h.id,
        memberId: null,
        userId: h.userId,
        startDate: h.startDate,
        endDate: h.endDate,
        description: h.description,
        memberName: member?.name ?? "Desconocido",
        source: "user" as const,
      });
    }
  }

  // Sort by start date
  result.sort((a, b) => a.startDate.localeCompare(b.startDate));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const { memberId, startDate, endDate, description } = body;

  if (!memberId || typeof memberId !== "number") {
    return NextResponse.json(
      { error: "memberId es obligatorio" },
      { status: 400 }
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate y endDate son obligatorios" },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "La fecha de inicio debe ser anterior o igual a la fecha de fin" },
      { status: 400 }
    );
  }

  // Verify member belongs to this group
  const member = (await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId))))[0];

  if (!member) {
    return NextResponse.json(
      { error: "Miembro no encontrado en este grupo" },
      { status: 404 }
    );
  }

  const holiday = (await db
    .insert(holidays)
    .values({
      memberId,
      startDate,
      endDate,
      description: description ?? null,
    })
    .returning())[0];

  return NextResponse.json(
    { ...holiday, memberName: member.name },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id es obligatorio" },
      { status: 400 }
    );
  }

  const holidayId = parseInt(id, 10);
  const existing = (await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, holidayId)))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Fecha no encontrada" },
      { status: 404 }
    );
  }

  // Verify the holiday belongs to a member in this group
  if (existing.memberId) {
    const member = (await db
      .select()
      .from(members)
      .where(and(eq(members.id, existing.memberId), eq(members.groupId, groupId))))[0];

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Esta fecha no es de un miembro" }, { status: 400 });
  }

  await db.delete(holidays).where(eq(holidays.id, holidayId));

  return NextResponse.json({ success: true });
}
