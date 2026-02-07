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

  const member = db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .get();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const roles = db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))
    .all();

  const availability = db
    .select()
    .from(memberAvailability)
    .where(eq(memberAvailability.memberId, memberId))
    .all();

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

  const existing = db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .get();

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
    db.update(members)
      .set({ name: name.trim() })
      .where(eq(members.id, memberId))
      .run();
  }

  if (roleIds !== undefined) {
    // Replace all role assignments
    db.delete(memberRoles)
      .where(eq(memberRoles.memberId, memberId))
      .run();
    for (const roleId of roleIds) {
      db.insert(memberRoles)
        .values({ memberId, roleId })
        .run();
    }
  }

  if (availableDayIds !== undefined) {
    // Replace all availability assignments
    db.delete(memberAvailability)
      .where(eq(memberAvailability.memberId, memberId))
      .run();
    for (const dayId of availableDayIds) {
      db.insert(memberAvailability)
        .values({ memberId, scheduleDayId: dayId })
        .run();
    }
  }

  // Return updated member
  const updated = db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .get();

  const updatedRoles = db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))
    .all();

  const updatedAvailability = db
    .select()
    .from(memberAvailability)
    .where(eq(memberAvailability.memberId, memberId))
    .all();

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

  const existing = db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  db.delete(members).where(eq(members.id, memberId)).run();

  return NextResponse.json({ success: true });
}
