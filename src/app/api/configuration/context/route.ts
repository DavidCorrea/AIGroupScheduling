import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  groups,
  members,
  memberRoles,
  memberAvailability,
  users,
  roles,
  recurringEvents,
  weekdays,
  exclusiveGroups,
  schedules,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireGroupAccess } from "@/lib/api-helpers";
import { dayIndex } from "@/lib/constants";

/**
 * BFF-style endpoint: returns everything the config shell needs for first paint.
 * Accepts ?slug= or ?groupId=. Reduces round-trips for config layout and list pages.
 */
export async function GET(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const group = (
    await db
      .select({ id: groups.id, name: groups.name, slug: groups.slug })
      .from(groups)
      .where(eq(groups.id, groupId))
  )[0];

  if (!group) {
    return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
  }

  const [allMembers, allRoles, allDaysRows, allExclusiveGroups, allSchedules] =
    await Promise.all([
      loadMembers(groupId),
      db
        .select()
        .from(roles)
        .where(eq(roles.groupId, groupId))
        .orderBy(roles.displayOrder),
      db
        .select({
          id: recurringEvents.id,
          weekdayId: recurringEvents.weekdayId,
          dayOfWeek: weekdays.name,
          active: recurringEvents.active,
          type: recurringEvents.type,
          label: recurringEvents.label,
          startTimeUtc: recurringEvents.startTimeUtc,
          endTimeUtc: recurringEvents.endTimeUtc,
          groupId: recurringEvents.groupId,
          notes: recurringEvents.notes,
        })
        .from(recurringEvents)
        .innerJoin(weekdays, eq(recurringEvents.weekdayId, weekdays.id))
        .where(eq(recurringEvents.groupId, groupId)),
      db
        .select()
        .from(exclusiveGroups)
        .where(eq(exclusiveGroups.groupId, groupId))
        .orderBy(exclusiveGroups.name),
      db
        .select()
        .from(schedules)
        .where(eq(schedules.groupId, groupId))
        .orderBy(schedules.year, schedules.month),
    ]);

  const days = [...allDaysRows].sort(
    (a, b) => dayIndex(a.dayOfWeek ?? "") - dayIndex(b.dayOfWeek ?? "")
  );

  return NextResponse.json({
    group: { id: group.id, name: group.name, slug: group.slug },
    members: allMembers,
    roles: allRoles,
    days,
    exclusiveGroups: allExclusiveGroups,
    schedules: allSchedules,
  });
}

async function loadMembers(groupId: number) {
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      memberEmail: members.email,
      userId: members.userId,
      groupId: members.groupId,
      userEmail: users.email,
      userImage: users.image,
      userName: users.name,
    })
    .from(members)
    .leftJoin(users, eq(members.userId, users.id))
    .where(eq(members.groupId, groupId))
    .orderBy(members.name);

  return Promise.all(
    rows.map(async (member) => {
      const memberRolesList = await db
        .select()
        .from(memberRoles)
        .where(eq(memberRoles.memberId, member.id));
      const availability = await db
        .select({
          weekdayId: memberAvailability.weekdayId,
          startTimeUtc: memberAvailability.startTimeUtc,
          endTimeUtc: memberAvailability.endTimeUtc,
        })
        .from(memberAvailability)
        .where(eq(memberAvailability.memberId, member.id));

      return {
        id: member.id,
        name: member.name,
        memberEmail: member.memberEmail,
        userId: member.userId,
        groupId: member.groupId,
        email: member.userEmail,
        image: member.userImage,
        userName: member.userName,
        roleIds: memberRolesList.map((r) => r.roleId),
        availability: availability.map((a) => ({
          weekdayId: a.weekdayId,
          startTimeUtc: a.startTimeUtc ?? "00:00",
          endTimeUtc: a.endTimeUtc ?? "23:59",
        })),
        availableDayIds: [...new Set(availability.map((a) => a.weekdayId))],
      };
    })
  );
}
