import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  schedules,
  scheduleEntries,
  scheduleDateNotes,
  scheduleRehearsalDates,
  scheduleExtraDates,
  scheduleAuditLog,
  members,
  roles,
  users,
} from "@/db/schema";
import { eq, and, or, lt, gt, asc, desc, gte } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";
import { getHolidayConflicts } from "@/lib/holiday-conflicts";
import { loadScheduleConfig, getPreviousAssignments } from "@/lib/schedule-helpers";
import { generateSchedule } from "@/lib/scheduler";
import { getScheduleDates } from "@/lib/dates";
import { logScheduleAction } from "@/lib/audit-log";

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

  const holidayConflicts = await getHolidayConflicts(entries, groupId);

  const extraDates = await db
    .select()
    .from(scheduleExtraDates)
    .where(eq(scheduleExtraDates.scheduleId, scheduleId));

  const auditLogRows = await db
    .select({
      id: scheduleAuditLog.id,
      action: scheduleAuditLog.action,
      detail: scheduleAuditLog.detail,
      createdAt: scheduleAuditLog.createdAt,
      userName: users.name,
    })
    .from(scheduleAuditLog)
    .leftJoin(users, eq(scheduleAuditLog.userId, users.id))
    .where(eq(scheduleAuditLog.scheduleId, scheduleId))
    .orderBy(desc(scheduleAuditLog.createdAt));

  return NextResponse.json({
    ...schedule,
    entries: enrichedEntries,
    notes,
    rehearsalDates: rehearsalDates.map((r) => r.date),
    roles: allRoles,
    prevScheduleId: prevSchedule?.id ?? null,
    nextScheduleId: nextSchedule?.id ?? null,
    holidayConflicts,
    extraDates: extraDates.map((d) => ({ date: d.date, type: d.type })),
    auditLog: auditLogRows,
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

    await logScheduleAction(scheduleId, authResult.user.id, "published", "Cronograma publicado");

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
    const allRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.groupId, schedule.groupId));
    const dependentRoleIdSet = new Set(
      allRoles.filter((r) => r.dependsOnRoleId != null).map((r) => r.id)
    );

    // Snapshot old entries for diff
    const oldEntries = await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.scheduleId, scheduleId));

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

    // Build diff for audit log
    const allMembers = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(eq(members.groupId, schedule.groupId));
    const memberMap = new Map(allMembers.map((m) => [m.id, m.name]));
    const roleMap = new Map(allRoles.map((r) => [r.id, r.name]));

    // Build lookup from old entries: key "date|roleId|slotIdx" -> memberId
    const oldBySlot = new Map<string, number>();
    const oldSlotCount = new Map<string, number>();
    for (const e of oldEntries) {
      const baseKey = `${e.date}|${e.roleId}`;
      const idx = oldSlotCount.get(baseKey) ?? 0;
      oldBySlot.set(`${baseKey}|${idx}`, e.memberId);
      oldSlotCount.set(baseKey, idx + 1);
    }

    const newBySlot = new Map<string, number | null>();
    const newSlotCount = new Map<string, number>();
    for (const e of body.entries) {
      const baseKey = `${e.date}|${e.roleId}`;
      const idx = newSlotCount.get(baseKey) ?? 0;
      newBySlot.set(`${baseKey}|${idx}`, e.memberId ?? null);
      newSlotCount.set(baseKey, idx + 1);
    }

    const changes: { date: string; role: string; from: string | null; to: string | null }[] = [];
    const allKeys = new Set([...oldBySlot.keys(), ...newBySlot.keys()]);
    for (const key of allKeys) {
      const oldMid = oldBySlot.get(key) ?? null;
      const newMid = newBySlot.get(key) ?? null;
      if (oldMid !== newMid) {
        const [date, roleIdStr] = key.split("|");
        changes.push({
          date,
          role: roleMap.get(parseInt(roleIdStr, 10)) ?? "?",
          from: oldMid != null ? (memberMap.get(oldMid) ?? "?") : null,
          to: newMid != null ? (memberMap.get(newMid) ?? "?") : null,
        });
      }
    }

    if (changes.length > 0) {
      await logScheduleAction(scheduleId, authResult.user.id, "bulk_update", {
        message: `Cambios guardados: ${changes.length} asignacion${changes.length === 1 ? "" : "es"} actualizada${changes.length === 1 ? "" : "s"}`,
        changes,
      });
    }

    return NextResponse.json({ success: true });
  }

  // Rebuild: preview or apply
  if (
    (body.action === "rebuild_preview" || body.action === "rebuild_apply") &&
    (body.mode === "overwrite" || body.mode === "fill_empty")
  ) {
    const { mode } = body;
    const { groupId } = schedule;
    const today = new Date().toISOString().split("T")[0];

    const config = await loadScheduleConfig(groupId);

    // Get all regular dates for this month (recurring + extra regular)
    const recurringDates = getScheduleDates(schedule.month, schedule.year, config.activeDayNames);
    const extraRegular = await db
      .select()
      .from(scheduleExtraDates)
      .where(
        and(
          eq(scheduleExtraDates.scheduleId, scheduleId),
          eq(scheduleExtraDates.type, "regular")
        )
      );
    const extraRegularDates = extraRegular.map((d) => d.date);
    const allRegularDates = [...new Set([...recurringDates, ...extraRegularDates])].sort();

    // Only dates from today onwards
    const futureDates = allRegularDates.filter((d) => d >= today);

    if (futureDates.length === 0) {
      return NextResponse.json(
        { error: "No hay fechas futuras para reconstruir" },
        { status: 400 }
      );
    }

    // Current entries for this schedule
    const currentEntries = await db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.scheduleId, scheduleId));

    const pastEntries = currentEntries.filter((e) => e.date < today);
    const futureEntries = currentEntries.filter((e) => e.date >= today);

    // Previous assignments for rotation continuity
    const previousAssignments = await getPreviousAssignments(groupId);
    // Also include past entries from this schedule
    const allPrevious = [
      ...previousAssignments,
      ...pastEntries.map((e) => ({ date: e.date, roleId: e.roleId, memberId: e.memberId })),
    ];

    let datesToGenerate: string[];
    let keptFutureEntries: typeof futureEntries = [];

    if (mode === "overwrite") {
      datesToGenerate = futureDates;
    } else {
      // fill_empty: find dates/roles that have unfilled slots
      const dependentRoleIdSet = new Set(
        config.allRoles.filter((r) => r.dependsOnRoleId != null).map((r) => r.id)
      );
      const filledSlots = new Map<string, number>();
      for (const e of futureEntries) {
        if (dependentRoleIdSet.has(e.roleId)) continue;
        const key = `${e.date}|${e.roleId}`;
        filledSlots.set(key, (filledSlots.get(key) ?? 0) + 1);
      }

      const datesWithGaps = new Set<string>();
      for (const date of futureDates) {
        for (const role of config.roleDefinitions) {
          const filled = filledSlots.get(`${date}|${role.id}`) ?? 0;
          if (filled < role.requiredCount) {
            datesWithGaps.add(date);
          }
        }
      }
      datesToGenerate = [...datesWithGaps].sort();
      keptFutureEntries = futureEntries;

      // Include kept future entries as previous assignments so the scheduler
      // doesn't duplicate them
      allPrevious.push(
        ...keptFutureEntries.map((e) => ({ date: e.date, roleId: e.roleId, memberId: e.memberId }))
      );
    }

    if (datesToGenerate.length === 0) {
      return NextResponse.json({
        preview: [],
        removedCount: 0,
      });
    }

    const result = generateSchedule({
      dates: datesToGenerate,
      roles: config.roleDefinitions,
      members: config.memberInfos,
      previousAssignments: allPrevious,
      dayRolePriorities:
        Object.keys(config.dayRolePriorityMap).length > 0
          ? config.dayRolePriorityMap
          : undefined,
    });

    // Enrich assignments with names
    const memberMap = new Map(config.memberInfos.map((m) => [m.id, m.name]));
    const roleMap = new Map(config.allRoles.map((r) => [r.id, r.name]));

    const preview = result.assignments.map((a) => ({
      date: a.date,
      roleId: a.roleId,
      roleName: roleMap.get(a.roleId) ?? "Desconocido",
      memberId: a.memberId,
      memberName: memberMap.get(a.memberId) ?? "Desconocido",
    }));

    const removedCount = mode === "overwrite" ? futureEntries.length : 0;

    if (body.action === "rebuild_preview") {
      return NextResponse.json({ preview, removedCount });
    }

    // rebuild_apply: persist the changes
    if (mode === "overwrite") {
      for (const e of futureEntries) {
        await db.delete(scheduleEntries).where(eq(scheduleEntries.id, e.id));
      }
    }

    if (result.assignments.length > 0) {
      await db.insert(scheduleEntries).values(
        result.assignments.map((a) => ({
          scheduleId,
          date: a.date,
          roleId: a.roleId,
          memberId: a.memberId,
        }))
      );
    }

    const modeLabel = mode === "overwrite" ? "regenerar todo" : "llenar vacios";
    await logScheduleAction(scheduleId, authResult.user.id, "rebuild", {
      message: `Reconstruccion aplicada (${modeLabel}): ${preview.length} asignacion${preview.length === 1 ? "" : "es"} nueva${preview.length === 1 ? "" : "s"}`,
      mode,
      removedCount,
      added: preview,
    });

    return NextResponse.json({ success: true });
  }

  // Add a one-off extra date
  if (body.action === "add_date" && body.date && body.type) {
    const dateStr = body.date as string;
    const type = body.type as string;

    if (type !== "regular" && type !== "rehearsal") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    // Validate the date belongs to the schedule's month/year
    const [dy, dm] = dateStr.split("-").map(Number);
    if (dy !== schedule.year || dm !== schedule.month) {
      return NextResponse.json(
        { error: "La fecha debe estar dentro del mes del cronograma" },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = (await db
      .select()
      .from(scheduleExtraDates)
      .where(
        and(
          eq(scheduleExtraDates.scheduleId, scheduleId),
          eq(scheduleExtraDates.date, dateStr)
        )
      ))[0];

    if (existing) {
      return NextResponse.json(
        { error: "Esa fecha ya fue agregada" },
        { status: 409 }
      );
    }

    await db.insert(scheduleExtraDates).values({
      scheduleId,
      date: dateStr,
      type,
    });

    if (type === "rehearsal") {
      await db.insert(scheduleRehearsalDates).values({
        scheduleId,
        date: dateStr,
      });
    }

    const typeLabel = type === "regular" ? "Asignacion" : "Ensayo";
    await logScheduleAction(scheduleId, authResult.user.id, "add_date", `Fecha extra agregada: ${dateStr} (${typeLabel})`);

    return NextResponse.json({ success: true });
  }

  // Remove a one-off extra date
  if (body.action === "remove_extra_date" && body.date) {
    const dateStr = body.date as string;

    const extra = (await db
      .select()
      .from(scheduleExtraDates)
      .where(
        and(
          eq(scheduleExtraDates.scheduleId, scheduleId),
          eq(scheduleExtraDates.date, dateStr)
        )
      ))[0];

    if (!extra) {
      return NextResponse.json(
        { error: "Fecha extra no encontrada" },
        { status: 404 }
      );
    }

    await db.delete(scheduleExtraDates).where(eq(scheduleExtraDates.id, extra.id));

    // Remove rehearsal date entry if it was a rehearsal
    if (extra.type === "rehearsal") {
      await db.delete(scheduleRehearsalDates).where(
        and(
          eq(scheduleRehearsalDates.scheduleId, scheduleId),
          eq(scheduleRehearsalDates.date, dateStr)
        )
      );
    }

    // Remove any schedule entries on that date
    await db.delete(scheduleEntries).where(
      and(
        eq(scheduleEntries.scheduleId, scheduleId),
        eq(scheduleEntries.date, dateStr)
      )
    );

    await logScheduleAction(scheduleId, authResult.user.id, "remove_extra_date", `Fecha extra eliminada: ${dateStr}`);

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
