import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayRolePriorities, scheduleDays, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { extractGroupId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const allDays = await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.groupId, groupId));
  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.groupId, groupId));

  const allPriorities = await db.select().from(dayRolePriorities);

  // Filter priorities to only those belonging to this group's days and roles
  const dayIds = new Set(allDays.map((d) => d.id));
  const roleIds = new Set(allRoles.map((r) => r.id));
  const filtered = allPriorities.filter(
    (p) => dayIds.has(p.scheduleDayId) && roleIds.has(p.roleId)
  );

  // Enrich with names
  const enriched = filtered.map((p) => ({
    ...p,
    dayOfWeek: allDays.find((d) => d.id === p.scheduleDayId)?.dayOfWeek ?? "Unknown",
    roleName: allRoles.find((r) => r.id === p.roleId)?.name ?? "Unknown",
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scheduleDayId, roleId, priority } = body;

  if (!scheduleDayId || !roleId || priority === undefined) {
    return NextResponse.json(
      { error: "scheduleDayId, roleId, and priority are required" },
      { status: 400 }
    );
  }

  // Check if priority already exists for this day+role combo
  const existing = (await db
    .select()
    .from(dayRolePriorities)
    .where(
      and(
        eq(dayRolePriorities.scheduleDayId, scheduleDayId),
        eq(dayRolePriorities.roleId, roleId)
      )
    ))[0];

  if (existing) {
    // Update
    await db.update(dayRolePriorities)
      .set({ priority })
      .where(eq(dayRolePriorities.id, existing.id));

    return NextResponse.json({ ...existing, priority });
  }

  // Create
  const created = (await db
    .insert(dayRolePriorities)
    .values({ scheduleDayId, roleId, priority })
    .returning())[0];

  return NextResponse.json(created, { status: 201 });
}

/**
 * PUT: Bulk update priorities for a specific day.
 * Body: { scheduleDayId, priorities: [{ roleId, priority }] }
 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { scheduleDayId, priorities } = body;

  if (!scheduleDayId || !Array.isArray(priorities)) {
    return NextResponse.json(
      { error: "scheduleDayId and priorities array are required" },
      { status: 400 }
    );
  }

  // Delete all existing priorities for this day
  await db.delete(dayRolePriorities)
    .where(eq(dayRolePriorities.scheduleDayId, scheduleDayId));

  // Insert new priorities
  for (const { roleId, priority } of priorities) {
    await db.insert(dayRolePriorities)
      .values({ scheduleDayId, roleId, priority });
  }

  const updated = await db
    .select()
    .from(dayRolePriorities)
    .where(eq(dayRolePriorities.scheduleDayId, scheduleDayId));

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scheduleDayId = searchParams.get("scheduleDayId");

  if (!scheduleDayId) {
    return NextResponse.json(
      { error: "scheduleDayId query param is required" },
      { status: 400 }
    );
  }

  await db.delete(dayRolePriorities)
    .where(eq(dayRolePriorities.scheduleDayId, parseInt(scheduleDayId, 10)));

  return NextResponse.json({ success: true });
}
