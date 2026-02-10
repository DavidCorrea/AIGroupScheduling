import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberRoles, memberAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractGroupId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const allMembers = await db
    .select()
    .from(members)
    .where(eq(members.groupId, groupId))
    .orderBy(members.name);

  const result = await Promise.all(allMembers.map(async (member) => {
    const roles = await db
      .select()
      .from(memberRoles)
      .where(eq(memberRoles.memberId, member.id));

    const availability = await db
      .select()
      .from(memberAvailability)
      .where(eq(memberAvailability.memberId, member.id));

    return {
      ...member,
      roleIds: roles.map((r) => r.roleId),
      availableDayIds: availability.map((a) => a.scheduleDayId),
    };
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const body = await request.json();
  const { name, roleIds = [], availableDayIds = [] } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const member = (await db
    .insert(members)
    .values({ name: name.trim(), groupId })
    .returning())[0];

  // Assign roles
  for (const roleId of roleIds) {
    await db.insert(memberRoles)
      .values({ memberId: member.id, roleId });
  }

  // Assign availability
  for (const dayId of availableDayIds) {
    await db.insert(memberAvailability)
      .values({ memberId: member.id, scheduleDayId: dayId });
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
