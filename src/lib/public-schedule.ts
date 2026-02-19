import { db } from "./db";
import {
  schedules,
  scheduleEntries,
  scheduleDateNotes,
  scheduleRehearsalDates,
  members,
  roles,
} from "@/db/schema";
import { eq, and, or, lt, gt, asc, desc } from "drizzle-orm";
import { getHolidayConflicts } from "./holiday-conflicts";

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

  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, id));

  // Get members (use members.name directly)
  const allMembers = await db
    .select({
      id: members.id,
      name: members.name,
      groupId: members.groupId,
    })
    .from(members)
    .where(eq(members.groupId, groupId));

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId));

  const dependentRoleIds = allRoles
    .filter((r) => r.dependsOnRoleId != null)
    .map((r) => r.id);

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    memberName:
      allMembers.find((m) => m.id === entry.memberId)?.name ?? "Desconocido",
    roleName: allRoles.find((r) => r.id === entry.roleId)?.name ?? "Desconocido",
  }));

  const uniqueMembers = [
    ...new Map(
      entries.map((e) => {
        const member = allMembers.find((m) => m.id === e.memberId);
        return [e.memberId, { id: e.memberId, name: member?.name ?? "Desconocido" }];
      })
    ).values(),
  ].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const notes = await db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, id));

  const rehearsalDates = await db
    .select()
    .from(scheduleRehearsalDates)
    .where(eq(scheduleRehearsalDates.scheduleId, id));

  // Find previous and next committed schedules for navigation (same group)
  const prevSchedule =
    (await db
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
      .limit(1))[0] ?? null;

  const nextSchedule =
    (await db
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
      .limit(1))[0] ?? null;

  const holidayConflicts = await getHolidayConflicts(entries, groupId);

  return {
    month,
    year,
    entries: enrichedEntries,
    members: uniqueMembers,
    notes,
    rehearsalDates: rehearsalDates.map((r) => r.date),
    dependentRoleIds,
    roles: allRoles,
    prevSchedule,
    nextSchedule,
    holidayConflicts,
  };
}
