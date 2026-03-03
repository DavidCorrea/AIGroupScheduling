import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays, members } from "@/db/schema";
import { eq, and, inArray, isNotNull, gte } from "drizzle-orm";
import { requireGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { configHolidayCreateSchema } from "@/lib/schemas";

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

  const raw = await request.json();
  const parsed = parseBody(configHolidayCreateSchema, raw);
  if (parsed.error) return parsed.error;
  const { memberId, startDate, endDate, description } = parsed.data;

  // Verify member belongs to this group
  const member = (await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId))))[0];

  if (!member) {
    return apiError("Miembro no encontrado en este grupo", 404, "NOT_FOUND");
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

// DELETE by id: use DELETE /api/configuration/holidays/[id]?groupId= or ?slug=
