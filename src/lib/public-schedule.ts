import { revalidatePath } from "next/cache";
import { db } from "./db";
import {
  schedules,
  scheduleDateAssignments,
  scheduleDate,
  members,
  roles,
  groups,
  recurringEvents,
} from "@/db/schema";
import { eq, and, or, lt, gt, asc, desc, inArray } from "drizzle-orm";
import { holidays } from "@/db/schema";
import { findHolidayConflicts } from "./holiday-conflicts";

/**
 * Revalidate the public cronograma page for a schedule's month.
 * Call after any mutation that changes the public view (commit, assignment
 * edit, date add/remove, note change, schedule delete).
 */
export async function revalidateCronograma(groupId: number, month: number, year: number) {
  const group = await db
    .select({ slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, groupId))
    .then((rows) => rows[0]);
  if (group) {
    revalidatePath(`/${group.slug}/cronograma/${year}/${month}`);
  }
}

/**
 * Build the full public schedule response for a committed schedule.
 * Used by both the current-month and specific-month public APIs.
 */
export async function buildPublicScheduleResponse(schedule: {
  id: number;
  month: number;
  year: number;
  groupId: number;
}) {
  const { id, month, year, groupId } = schedule;

  const [
    group,
    entriesWithDate,
    allMembers,
    allRoles,
    scheduleDatesResult,
    prevSchedule,
    nextSchedule,
  ] = await Promise.all([
    db
      .select({ name: groups.name, calendarExportEnabled: groups.calendarExportEnabled })
      .from(groups)
      .where(eq(groups.id, groupId))
      .then((rows) => rows[0]),

    db
      .select({
        id: scheduleDateAssignments.id,
        scheduleDateId: scheduleDateAssignments.scheduleDateId,
        date: scheduleDate.date,
        roleId: scheduleDateAssignments.roleId,
        memberId: scheduleDateAssignments.memberId,
      })
      .from(scheduleDateAssignments)
      .innerJoin(scheduleDate, eq(scheduleDateAssignments.scheduleDateId, scheduleDate.id))
      .where(eq(scheduleDate.scheduleId, id)),

    db
      .select({
        id: members.id,
        name: members.name,
        groupId: members.groupId,
        userId: members.userId,
      })
      .from(members)
      .where(eq(members.groupId, groupId)),

    db.select().from(roles).where(eq(roles.groupId, groupId)),

    db
      .select({
        id: scheduleDate.id,
        date: scheduleDate.date,
        type: scheduleDate.type,
        label: scheduleDate.label,
        note: scheduleDate.note,
        startTimeUtc: scheduleDate.startTimeUtc,
        endTimeUtc: scheduleDate.endTimeUtc,
        recurringEventId: scheduleDate.recurringEventId,
        recurringEventLabel: recurringEvents.label,
      })
      .from(scheduleDate)
      .leftJoin(recurringEvents, eq(scheduleDate.recurringEventId, recurringEvents.id))
      .where(eq(scheduleDate.scheduleId, id))
      .orderBy(asc(scheduleDate.date), asc(scheduleDate.startTimeUtc)),

    db
      .select({ month: schedules.month, year: schedules.year })
      .from(schedules)
      .where(
        and(
          eq(schedules.groupId, groupId),
          eq(schedules.status, "committed"),
          or(
            lt(schedules.year, year),
            and(eq(schedules.year, year), lt(schedules.month, month))
          )
        )
      )
      .orderBy(desc(schedules.year), desc(schedules.month))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    db
      .select({ month: schedules.month, year: schedules.year })
      .from(schedules)
      .where(
        and(
          eq(schedules.groupId, groupId),
          eq(schedules.status, "committed"),
          or(
            gt(schedules.year, year),
            and(eq(schedules.year, year), gt(schedules.month, month))
          )
        )
      )
      .orderBy(asc(schedules.year), asc(schedules.month))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  // Round 2: holidays (depends on entries + members from round 1)
  const memberIds = [...new Set(entriesWithDate.map((e) => e.memberId))];
  const linkedUserIds = allMembers
    .filter((m) => m.userId != null && memberIds.includes(m.id))
    .map((m) => m.userId!);

  const holidayConditions = [];
  if (memberIds.length > 0) {
    holidayConditions.push(inArray(holidays.memberId, memberIds));
  }
  if (linkedUserIds.length > 0) {
    holidayConditions.push(inArray(holidays.userId, linkedUserIds));
  }

  const allHolidays = holidayConditions.length > 0
    ? await db.select().from(holidays).where(or(...holidayConditions))
    : [];

  const holidayConflicts = findHolidayConflicts(
    entriesWithDate.map((e) => ({ date: e.date, memberId: e.memberId })),
    allMembers.map((m) => ({ id: m.id, name: m.name, userId: m.userId })),
    allHolidays,
  );

  // Pure computation
  const dependentRoleIds = allRoles
    .filter((r) => r.dependsOnRoleId != null)
    .map((r) => r.id);

  const enrichedEntries = entriesWithDate.map((entry) => ({
    ...entry,
    memberName:
      allMembers.find((m) => m.id === entry.memberId)?.name ?? "Desconocido",
    roleName: allRoles.find((r) => r.id === entry.roleId)?.name ?? "Desconocido",
  }));

  const uniqueMembers = [
    ...new Map(
      entriesWithDate.map((e) => {
        const member = allMembers.find((m) => m.id === e.memberId);
        return [e.memberId, { id: e.memberId, name: member?.name ?? "Desconocido" }];
      })
    ).values(),
  ].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const notes = scheduleDatesResult
    .filter((sd) => sd.note != null && sd.note.trim() !== "")
    .map((sd) => ({ scheduleDateId: sd.id, date: sd.date, description: sd.note! }));

  return {
    groupName: group?.name ?? undefined,
    calendarExportEnabled: group?.calendarExportEnabled ?? false,
    month,
    year,
    entries: enrichedEntries,
    members: uniqueMembers,
    notes,
    scheduleDates: scheduleDatesResult.map((sd) => ({
      id: sd.id,
      date: sd.date,
      type: (String(sd.type).toLowerCase() === "for_everyone" ? "for_everyone" : "assignable") as "assignable" | "for_everyone",
      label: sd.label,
      note: sd.note,
      startTimeUtc: sd.startTimeUtc ?? "00:00",
      endTimeUtc: sd.endTimeUtc ?? "23:59",
      recurringEventId: sd.recurringEventId ?? null,
      recurringEventLabel: sd.recurringEventLabel ?? null,
    })),
    dependentRoleIds,
    roles: allRoles,
    prevSchedule,
    nextSchedule,
    holidayConflicts,
  };
}
