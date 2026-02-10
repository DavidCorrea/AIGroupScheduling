import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberRoles, memberAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = parseInt(id, 10);

  const member = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const roles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId));

  const availability = await db
    .select()
    .from(memberAvailability)
    .where(eq(memberAvailability.memberId, memberId));

  return NextResponse.json({
    ...member,
    roleIds: roles.map((r) => r.roleId),
    availableDayIds: availability.map((a) => a.scheduleDayId),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  const body = await request.json();
  const { name, roleIds, availableDayIds } = body;

  const existing = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }
    await db.update(members)
      .set({ name: name.trim() })
      .where(eq(members.id, memberId));
  }

  if (roleIds !== undefined) {
    // Replace all role assignments
    await db.delete(memberRoles)
      .where(eq(memberRoles.memberId, memberId));
    for (const roleId of roleIds) {
      await db.insert(memberRoles)
        .values({ memberId, roleId });
    }
  }

  if (availableDayIds !== undefined) {
    // Replace all availability assignments
    await db.delete(memberAvailability)
      .where(eq(memberAvailability.memberId, memberId));
    for (const dayId of availableDayIds) {
      await db.insert(memberAvailability)
        .values({ memberId, scheduleDayId: dayId });
    }
  }

  // Return updated member
  const updated = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  const updatedRoles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId));

  const updatedAvailability = await db
    .select()
    .from(memberAvailability)
    .where(eq(memberAvailability.memberId, memberId));

  return NextResponse.json({
    ...updated,
    roleIds: updatedRoles.map((r) => r.roleId),
    availableDayIds: updatedAvailability.map((a) => a.scheduleDayId),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = parseInt(id, 10);

  const existing = (await db
    .select()
    .from(members)
    .where(eq(members.id, memberId)))[0];

  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await db.delete(members).where(eq(members.id, memberId));

  return NextResponse.json({ success: true });
}
