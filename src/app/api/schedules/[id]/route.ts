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
import { requireAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const schedule = (await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId)))[0];

  if (!schedule) {
    return NextResponse.json(
      { error: "Cronograma no encontrado" },
      { status: 404 }
    );
  }

  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.scheduleId, scheduleId));

  // Get members (use members.name directly)
  const allMembers = await db
    .select({
      id: members.id,
      name: members.name,
      groupId: members.groupId,
    })
    .from(members)
    .where(eq(members.groupId, schedule.groupId));

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, schedule.groupId));

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    memberName:
      allMembers.find((m) => m.id === entry.memberId)?.name ?? "Desconocido",
    roleName: allRoles.find((r) => r.id === entry.roleId)?.name ?? "Desconocido",
  }));

  const notes = await db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, scheduleId));

  const rehearsalDates = await db
    .select()
    .from(scheduleRehearsalDates)
    .where(eq(scheduleRehearsalDates.scheduleId, scheduleId));

  // Find previous and next schedules (any status) for admin navigation, scoped to same group
  const { month, year, groupId } = schedule;

  const prevSchedule = (await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(
      and(
        eq(schedules.groupId, groupId),
        or(
          lt(schedules.year, year),
          and(eq(schedules.year, year), lt(schedules.month, month))
        )
      )
    )
    .orderBy(desc(schedules.year), desc(schedules.month))
    .limit(1))[0] ?? null;

  const nextSchedule = (await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(
      and(
        eq(schedules.groupId, groupId),
        or(
          gt(schedules.year, year),
          and(eq(schedules.year, year), gt(schedules.month, month))
        )
      )
    )
    .orderBy(asc(schedules.year), asc(schedules.month))
    .limit(1))[0] ?? null;

  return NextResponse.json({
    ...schedule,
    entries: enrichedEntries,
    notes,
    rehearsalDates: rehearsalDates.map((r) => r.date),
    roles: allRoles,
    prevScheduleId: prevSchedule?.id ?? null,
    nextScheduleId: nextSchedule?.id ?? null,
  });
}

/**
 * PUT: Update a schedule entry (manual swap) or commit the schedule.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const scheduleId = parseInt(id, 10);
  const body = await request.json();

  const schedule = (await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId)))[0];

  if (!schedule) {
    return NextResponse.json(
      { error: "Cronograma no encontrado" },
      { status: 404 }
    );
  }

  // Commit action
  if (body.action === "commit") {
    await db.update(schedules)
      .set({ status: "committed" })
      .where(eq(schedules.id, scheduleId));

    return NextResponse.json({
      ...schedule,
      status: "committed",
    });
  }

  // Swap entry
  if (body.action === "swap" && body.entryId && body.newMemberId) {
    const entry = (await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId)))[0];

    if (!entry) {
      return NextResponse.json(
        { error: "Entrada no encontrada" },
        { status: 404 }
      );
    }

    await db.update(scheduleEntries)
      .set({ memberId: body.newMemberId })
      .where(eq(scheduleEntries.id, body.entryId));

    return NextResponse.json({ success: true });
  }

  // Remove an entry (empty the slot)
  if (body.action === "remove" && body.entryId) {
    const entry = (await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId)))[0];

    if (!entry) {
      return NextResponse.json(
        { error: "Entrada no encontrada" },
        { status: 404 }
      );
    }

    await db.delete(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId));

    return NextResponse.json({ success: true });
  }

  // Assign a member to a dependent role on a specific date
  if (body.action === "assign" && body.date && body.roleId && body.memberId) {
    const role = (await db
      .select()
      .from(roles)
      .where(eq(roles.id, body.roleId)))[0];

    if (!role || role.dependsOnRoleId == null) {
      return NextResponse.json(
        { error: "El rol no es un rol dependiente" },
        { status: 400 }
      );
    }

    // Validate that the member is assigned to the source role on that date
    const sourceEntry = (await db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.scheduleId, scheduleId),
          eq(scheduleEntries.date, body.date),
          eq(scheduleEntries.roleId, role.dependsOnRoleId),
          eq(scheduleEntries.memberId, body.memberId)
        )
      ))[0];

    if (!sourceEntry) {
      return NextResponse.json(
        { error: "El miembro no está asignado al rol fuente en esta fecha" },
        { status: 400 }
      );
    }

    // Remove any existing entry for this dependent role on this date
    const existingEntries = await db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.scheduleId, scheduleId),
          eq(scheduleEntries.date, body.date),
          eq(scheduleEntries.roleId, body.roleId)
        )
      );

    for (const existing of existingEntries) {
      await db.delete(scheduleEntries)
        .where(eq(scheduleEntries.id, existing.id));
    }

    // Create the new entry
    await db.insert(scheduleEntries)
      .values({
        scheduleId,
        date: body.date,
        roleId: body.roleId,
        memberId: body.memberId,
      });

    return NextResponse.json({ success: true });
  }

  // Unassign a dependent role entry
  if (body.action === "unassign" && body.entryId) {
    const entry = (await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId)))[0];

    if (!entry) {
      return NextResponse.json(
        { error: "Entrada no encontrada" },
        { status: 404 }
      );
    }

    // Verify the role is a dependent role
    const role = (await db
      .select()
      .from(roles)
      .where(eq(roles.id, entry.roleId)))[0];

    if (!role || role.dependsOnRoleId == null) {
      return NextResponse.json(
        { error: "El rol de la entrada no es un rol dependiente" },
        { status: 400 }
      );
    }

    await db.delete(scheduleEntries)
      .where(eq(scheduleEntries.id, body.entryId));

    return NextResponse.json({ success: true });
  }

  // Bulk update entries: replaces all entries for the schedule
  if (body.action === "bulk_update" && Array.isArray(body.entries)) {
    // body.entries: Array<{ date: string, roleId: number, memberId: number | null }>
    // Each item represents a single slot. Multiple items with the same date+roleId
    // represent multiple slots for roles with requiredCount > 1.
    // We delete all existing non-dependent-role entries and re-insert the provided ones.

    const allRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.groupId, schedule.groupId));
    const dependentRoleIdSet = new Set(
      allRoles.filter((r) => r.dependsOnRoleId != null).map((r) => r.id)
    );

    // Separate dependent vs non-dependent entries in the payload
    const regularEntries: Array<{ date: string; roleId: number; memberId: number | null }> = [];
    const dependentEntries: Array<{ date: string; roleId: number; memberId: number | null }> = [];

    for (const entry of body.entries) {
      if (dependentRoleIdSet.has(entry.roleId)) {
        dependentEntries.push(entry);
      } else {
        regularEntries.push(entry);
      }
    }

    // Delete all existing entries for this schedule
    await db.delete(scheduleEntries)
      .where(eq(scheduleEntries.scheduleId, scheduleId));

    // Insert all non-empty entries
    const toInsert = [...regularEntries, ...dependentEntries]
      .filter((e) => e.memberId != null)
      .map((e) => ({
        scheduleId,
        date: e.date,
        roleId: e.roleId,
        memberId: e.memberId!,
      }));

    if (toInsert.length > 0) {
      await db.insert(scheduleEntries).values(toInsert);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const existing = (await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId)))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Cronograma no encontrado" },
      { status: 404 }
    );
  }

  await db.delete(schedules).where(eq(schedules.id, scheduleId));
  return NextResponse.json({ success: true });
}
