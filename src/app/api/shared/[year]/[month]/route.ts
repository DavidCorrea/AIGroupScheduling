import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  schedules,
  scheduleEntries,
  scheduleDateNotes,
  scheduleRehearsalDates,
  members,
  roles,
} from "@/db/schema";
import { eq, and, or, lt, gt, asc, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 }
    );
  }

  const schedule = (await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.month, month),
        eq(schedules.year, year),
        eq(schedules.status, "committed")
      )
    ))[0];

  if (!schedule) {
    return NextResponse.json(
      { error: "Agenda no encontrada" },
      { status: 404 }
    );
  }

  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, schedule.id));

  const allMembers = await db.select().from(members);
  const allRoles = await db.select().from(roles);

  // Detect dependent role IDs for frontend highlighting (roles that depend on another role)
  const dependentRoleIds = allRoles
    .filter((r) => r.dependsOnRoleId != null)
    .map((r) => r.id);

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    memberName:
      allMembers.find((m) => m.id === entry.memberId)?.name ?? "Unknown",
    roleName: allRoles.find((r) => r.id === entry.roleId)?.name ?? "Unknown",
  }));

  // Build unique members list for filtering
  const uniqueMembers = [
    ...new Map(
      entries.map((e) => {
        const member = allMembers.find((m) => m.id === e.memberId);
        return [e.memberId, { id: e.memberId, name: member?.name ?? "Unknown" }];
      })
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const notes = await db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, schedule.id));

  const rehearsalDates = await db
    .select()
    .from(scheduleRehearsalDates)
    .where(eq(scheduleRehearsalDates.scheduleId, schedule.id));

  // Find previous and next committed schedules for navigation
  const prevSchedule = (await db
    .select({ month: schedules.month, year: schedules.year })
    .from(schedules)
    .where(
      and(
        eq(schedules.status, "committed"),
        or(
          lt(schedules.year, year),
          and(eq(schedules.year, year), lt(schedules.month, month))
        )
      )
    )
    .orderBy(desc(schedules.year), desc(schedules.month))
    .limit(1))[0] ?? null;

  const nextSchedule = (await db
    .select({ month: schedules.month, year: schedules.year })
    .from(schedules)
    .where(
      and(
        eq(schedules.status, "committed"),
        or(
          gt(schedules.year, year),
          and(eq(schedules.year, year), gt(schedules.month, month))
        )
      )
    )
    .orderBy(asc(schedules.year), asc(schedules.month))
    .limit(1))[0] ?? null;

  return NextResponse.json({
    month: schedule.month,
    year: schedule.year,
    entries: enrichedEntries,
    members: uniqueMembers,
    notes,
    rehearsalDates: rehearsalDates.map((r) => r.date),
    dependentRoleIds,
    roles: allRoles,
    prevSchedule,
    nextSchedule,
  });
}
