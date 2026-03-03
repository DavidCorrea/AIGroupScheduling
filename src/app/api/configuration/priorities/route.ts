import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventRolePriorities, recurringEvents, weekdays, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireGroupAccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const allRecurring = await db
    .select({
      id: recurringEvents.id,
      weekdayId: recurringEvents.weekdayId,
      dayOfWeek: weekdays.name,
      active: recurringEvents.active,
      type: recurringEvents.type,
      label: recurringEvents.label,
      groupId: recurringEvents.groupId,
    })
    .from(recurringEvents)
    .innerJoin(weekdays, eq(recurringEvents.weekdayId, weekdays.id))
    .where(eq(recurringEvents.groupId, groupId));
  const assignableDays = allRecurring.filter((d) => d.type === "assignable");

  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId));

  const allPriorities = await db.select().from(eventRolePriorities);

  const assignableIds = new Set(assignableDays.map((d) => d.id));
  const roleIds = new Set(allRoles.map((r) => r.id));
  const filtered = allPriorities.filter(
    (p) => assignableIds.has(p.recurringEventId) && roleIds.has(p.roleId)
  );

  const enriched = filtered.map((p) => ({
    ...p,
    dayOfWeek: assignableDays.find((d) => d.id === p.recurringEventId)?.dayOfWeek ?? "Unknown",
    roleName: allRoles.find((r) => r.id === p.roleId)?.name ?? "Unknown",
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const { recurringEventId, roleId, priority } = body;

  if (!recurringEventId || !roleId || priority === undefined) {
    return NextResponse.json(
      { error: "recurringEventId, roleId, and priority are required" },
      { status: 400 }
    );
  }

  const event = (await db.select({ groupId: recurringEvents.groupId }).from(recurringEvents).where(eq(recurringEvents.id, recurringEventId)))[0];
  const role = (await db.select({ groupId: roles.groupId }).from(roles).where(eq(roles.id, roleId)))[0];
  if (!event || event.groupId !== groupId || !role || role.groupId !== groupId) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  const existing = (await db
    .select()
    .from(eventRolePriorities)
    .where(
      and(
        eq(eventRolePriorities.recurringEventId, recurringEventId),
        eq(eventRolePriorities.roleId, roleId)
      )
    ))[0];

  if (existing) {
    await db.update(eventRolePriorities)
      .set({ priority })
      .where(eq(eventRolePriorities.id, existing.id));

    return NextResponse.json({ ...existing, priority });
  }

  const created = (await db
    .insert(eventRolePriorities)
    .values({ recurringEventId, roleId, priority })
    .returning())[0];

  return NextResponse.json(created, { status: 201 });
}

/**
 * PUT: Bulk update priorities for a specific recurring event.
 * Body: { recurringEventId, priorities: [{ roleId, priority }] }
 */
export async function PUT(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const { recurringEventId, priorities } = body;

  if (!recurringEventId || !Array.isArray(priorities)) {
    return NextResponse.json(
      { error: "recurringEventId and priorities array are required" },
      { status: 400 }
    );
  }

  const event = (await db.select({ groupId: recurringEvents.groupId }).from(recurringEvents).where(eq(recurringEvents.id, recurringEventId)))[0];
  if (!event || event.groupId !== groupId) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  await db.delete(eventRolePriorities)
    .where(eq(eventRolePriorities.recurringEventId, recurringEventId));

  for (const { roleId, priority } of priorities) {
    await db.insert(eventRolePriorities)
      .values({ recurringEventId, roleId, priority });
  }

  const updated = await db
    .select()
    .from(eventRolePriorities)
    .where(eq(eventRolePriorities.recurringEventId, recurringEventId));

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const { searchParams } = new URL(request.url);
  const recurringEventId = searchParams.get("recurringEventId");

  if (!recurringEventId) {
    return NextResponse.json(
      { error: "recurringEventId query param is required" },
      { status: 400 }
    );
  }

  const eventId = parseInt(recurringEventId, 10);
  const event = (await db.select({ groupId: recurringEvents.groupId }).from(recurringEvents).where(eq(recurringEvents.id, eventId)))[0];
  if (!event || event.groupId !== groupId) {
    return apiError("Forbidden", 403, "FORBIDDEN");
  }

  await db.delete(eventRolePriorities)
    .where(eq(eventRolePriorities.recurringEventId, eventId));

  return NextResponse.json({ success: true });
}
