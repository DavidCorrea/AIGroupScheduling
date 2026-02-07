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
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.shareToken, token))
    .get();

  if (!schedule || schedule.status !== "committed") {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  const entries = db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, schedule.id))
    .all();

  const allMembers = db.select().from(members).all();
  const allRoles = db.select().from(roles).all();

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

  const notes = db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, schedule.id))
    .all();

  const rehearsalDates = db
    .select()
    .from(scheduleRehearsalDates)
    .where(eq(scheduleRehearsalDates.scheduleId, schedule.id))
    .all();

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
