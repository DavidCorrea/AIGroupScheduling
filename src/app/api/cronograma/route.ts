import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  schedules,
  scheduleEntries,
  scheduleDateNotes,
  scheduleRehearsalDates,
  members,
  roles,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-based
  const currentYear = now.getFullYear();

  const schedule = (await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.month, currentMonth),
        eq(schedules.year, currentYear),
        eq(schedules.status, "committed")
      )
    ))[0];

  if (!schedule) {
    return NextResponse.json(
      { error: "No hay agenda comprometida para este mes." },
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

  const uniqueMembers = [
    ...new Map(
      entries.map((e) => {
        const member = allMembers.find((m) => m.id === e.memberId);
        return [
          e.memberId,
          { id: e.memberId, name: member?.name ?? "Unknown" },
        ];
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

  return NextResponse.json({
    month: schedule.month,
    year: schedule.year,
    entries: enrichedEntries,
    members: uniqueMembers,
    notes,
    rehearsalDates: rehearsalDates.map((r) => r.date),
    dependentRoleIds,
    roles: allRoles,
  });
}
