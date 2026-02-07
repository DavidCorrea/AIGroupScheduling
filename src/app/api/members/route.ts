import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberRoles, memberAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allMembers = db
    .select()
    .from(members)
    .orderBy(members.name)
    .all();

  const result = allMembers.map((member) => {
    const roles = db
      .select()
      .from(memberRoles)
      .where(eq(memberRoles.memberId, member.id))
      .all();

    const availability = db
      .select()
      .from(memberAvailability)
      .where(eq(memberAvailability.memberId, member.id))
      .all();

    return {
      ...member,
      roleIds: roles.map((r) => r.roleId),
      availableDayIds: availability.map((a) => a.scheduleDayId),
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, roleIds = [], availableDayIds = [] } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const member = db
    .insert(members)
    .values({ name: name.trim() })
    .returning()
    .get();

  // Assign roles
  for (const roleId of roleIds) {
    db.insert(memberRoles)
      .values({ memberId: member.id, roleId })
      .run();
  }

  // Assign availability
  for (const dayId of availableDayIds) {
    db.insert(memberAvailability)
      .values({ memberId: member.id, scheduleDayId: dayId })
      .run();
  }

  return NextResponse.json(
    {
      ...member,
      roleIds,
      availableDayIds,
    },
    { status: 201 }
  );
}
