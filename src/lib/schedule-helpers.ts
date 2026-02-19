import { db } from "./db";
import {
  members,
  roles,
  memberRoles,
  memberAvailability,
  scheduleDays,
  holidays,
  dayRolePriorities,
  schedules,
  scheduleEntries,
} from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { MemberInfo, RoleDefinition } from "./scheduler.types";

export interface ScheduleConfig {
  activeDayNames: string[];
  rehearsalDayNames: string[];
  roleDefinitions: RoleDefinition[];
  allRoles: typeof roles.$inferSelect[];
  memberInfos: MemberInfo[];
  dayRolePriorityMap: Record<string, Record<number, number>>;
}

/**
 * Load all configuration needed to run the scheduler for a group.
 */
export async function loadScheduleConfig(groupId: number): Promise<ScheduleConfig> {
  const allDayRows = await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.groupId, groupId));
  const activeDayRows = allDayRows.filter((d) => d.active);
  const activeDayNames = activeDayRows.map((d) => d.dayOfWeek);
  const rehearsalDayNames = allDayRows
    .filter((d) => d.isRehearsal)
    .map((d) => d.dayOfWeek);

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId));
  const roleDefinitions: RoleDefinition[] = allRoles
    .filter((r) => r.dependsOnRoleId == null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      requiredCount: r.requiredCount,
      exclusiveGroupId: r.exclusiveGroupId,
    }));

  const allMembers = await db
    .select({
      id: members.id,
      name: members.name,
      userId: members.userId,
      groupId: members.groupId,
    })
    .from(members)
    .where(eq(members.groupId, groupId));

  const linkedUserIds = allMembers
    .filter((m) => m.userId != null)
    .map((m) => m.userId!);
  const memberIds = allMembers.map((m) => m.id);

  const holidayConditions = [];
  if (linkedUserIds.length > 0) {
    holidayConditions.push(inArray(holidays.userId, linkedUserIds));
  }
  if (memberIds.length > 0) {
    holidayConditions.push(inArray(holidays.memberId, memberIds));
  }

  const allHolidays = holidayConditions.length > 0
    ? await db.select().from(holidays).where(or(...holidayConditions))
    : [];

  const memberInfos: MemberInfo[] = [];
  for (const m of allMembers) {
    const mRoles = await db
      .select()
      .from(memberRoles)
      .where(eq(memberRoles.memberId, m.id));

    const mAvailability = await db
      .select()
      .from(memberAvailability)
      .where(eq(memberAvailability.memberId, m.id));

    const availDayNames = mAvailability.map((a) => {
      const day = allDayRows.find((d) => d.id === a.scheduleDayId);
      return day?.dayOfWeek ?? "";
    }).filter(Boolean);

    const mHolidays = allHolidays
      .filter((h) => h.userId === m.userId || h.memberId === m.id)
      .map((h) => ({ startDate: h.startDate, endDate: h.endDate }));

    memberInfos.push({
      id: m.id,
      name: m.name,
      roleIds: mRoles.map((r) => r.roleId),
      availableDays: availDayNames,
      holidays: mHolidays,
    });
  }

  // Build day role priorities map
  const dayIds = allDayRows.map((d) => d.id);
  const allPriorities = dayIds.length > 0
    ? await db.select().from(dayRolePriorities).where(inArray(dayRolePriorities.scheduleDayId, dayIds))
    : [];
  const dayRolePriorityMap: Record<string, Record<number, number>> = {};
  for (const p of allPriorities) {
    const day = allDayRows.find((d) => d.id === p.scheduleDayId);
    if (day) {
      if (!dayRolePriorityMap[day.dayOfWeek]) {
        dayRolePriorityMap[day.dayOfWeek] = {};
      }
      dayRolePriorityMap[day.dayOfWeek][p.roleId] = p.priority;
    }
  }

  return {
    activeDayNames,
    rehearsalDayNames,
    roleDefinitions,
    allRoles,
    memberInfos,
    dayRolePriorityMap,
  };
}

/**
 * Gather previous assignments from committed schedules for rotation continuity.
 */
export async function getPreviousAssignments(groupId: number) {
  const committedSchedules = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.groupId, groupId), eq(schedules.status, "committed")));

  const previousAssignments: { date: string; roleId: number; memberId: number }[] = [];
  for (const s of committedSchedules) {
    const entries = await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.scheduleId, s.id));

    previousAssignments.push(
      ...entries.map((e) => ({
        date: e.date,
        roleId: e.roleId,
        memberId: e.memberId,
      }))
    );
  }
  return previousAssignments;
}
