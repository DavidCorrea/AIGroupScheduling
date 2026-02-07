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
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();

  if (!schedule) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  const entries = db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, scheduleId))
    .all();

  const allMembers = db.select().from(members).all();
  const allRoles = db.select().from(roles).all();

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    memberName:
      allMembers.find((m) => m.id === entry.memberId)?.name ?? "Unknown",
    roleName: allRoles.find((r) => r.id === entry.roleId)?.name ?? "Unknown",
  }));

  const notes = db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, scheduleId))
    .all();

  const rehearsalDates = db
    .select()
    .from(scheduleRehearsalDates)
    .where(eq(scheduleRehearsalDates.scheduleId, scheduleId))
    .all();

  return NextResponse.json({
    ...schedule,
    entries: enrichedEntries,
    notes,
    rehearsalDates: rehearsalDates.map((r) => r.date),
    roles: allRoles,
  });
}

/**
 * PUT: Update a schedule entry (manual swap) or commit the schedule.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);
  const body = await request.json();

  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();

  if (!schedule) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  // Commit action
  if (body.action === "commit") {
    const shareToken = crypto.randomUUID();
    db.update(schedules)
      .set({ status: "committed", shareToken })
      .where(eq(schedules.id, scheduleId))
      .run();

    return NextResponse.json({
      ...schedule,
      status: "committed",
      shareToken,
    });
  }

  // Swap entry
  if (body.action === "swap" && body.entryId && body.newMemberId) {
    const entry = db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId))
      .get();

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    db.update(scheduleEntries)
      .set({ memberId: body.newMemberId })
      .where(eq(scheduleEntries.id, body.entryId))
      .run();

    return NextResponse.json({ success: true });
  }

  // Assign a member to a dependent role on a specific date
  if (body.action === "assign" && body.date && body.roleId && body.memberId) {
    const role = db
      .select()
      .from(roles)
      .where(eq(roles.id, body.roleId))
      .get();

    if (!role || role.dependsOnRoleId == null) {
      return NextResponse.json(
        { error: "Role is not a dependent role" },
        { status: 400 }
      );
    }

    // Validate that the member is assigned to the source role on that date
    const sourceEntry = db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.scheduleId, scheduleId),
          eq(scheduleEntries.date, body.date),
          eq(scheduleEntries.roleId, role.dependsOnRoleId),
          eq(scheduleEntries.memberId, body.memberId)
        )
      )
      .get();

    if (!sourceEntry) {
      return NextResponse.json(
        { error: "Member is not assigned to the source role on this date" },
        { status: 400 }
      );
    }

    // Remove any existing entry for this dependent role on this date
    const existingEntries = db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.scheduleId, scheduleId),
          eq(scheduleEntries.date, body.date),
          eq(scheduleEntries.roleId, body.roleId)
        )
      )
      .all();

    for (const existing of existingEntries) {
      db.delete(scheduleEntries)
        .where(eq(scheduleEntries.id, existing.id))
        .run();
    }

    // Create the new entry
    db.insert(scheduleEntries)
      .values({
        scheduleId,
        date: body.date,
        roleId: body.roleId,
        memberId: body.memberId,
      })
      .run();

    return NextResponse.json({ success: true });
  }

  // Unassign a dependent role entry
  if (body.action === "unassign" && body.entryId) {
    const entry = db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId))
      .get();

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Verify the role is a dependent role
    const role = db
      .select()
      .from(roles)
      .where(eq(roles.id, entry.roleId))
      .get();

    if (!role || role.dependsOnRoleId == null) {
      return NextResponse.json(
        { error: "Entry role is not a dependent role" },
        { status: 400 }
      );
    }

    db.delete(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId))
      .run();

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const existing = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .get();

  if (!existing) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  db.delete(schedules).where(eq(schedules.id, scheduleId)).run();
  return NextResponse.json({ success: true });
}
