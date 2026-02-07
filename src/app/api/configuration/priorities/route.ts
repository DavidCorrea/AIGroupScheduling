import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayRolePriorities, scheduleDays, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { seedDefaults } from "@/lib/seed";

export async function GET() {
  seedDefaults();

  const allPriorities = db.select().from(dayRolePriorities).all();
  const allDays = db.select().from(scheduleDays).all();
  const allRoles = db.select().from(roles).all();

  // Enrich with names
  const enriched = allPriorities.map((p) => ({
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
  const existing = db
    .select()
    .from(dayRolePriorities)
    .where(
      and(
        eq(dayRolePriorities.scheduleDayId, scheduleDayId),
        eq(dayRolePriorities.roleId, roleId)
      )
    )
    .get();

  if (existing) {
    // Update
    db.update(dayRolePriorities)
      .set({ priority })
      .where(eq(dayRolePriorities.id, existing.id))
      .run();

    return NextResponse.json({ ...existing, priority });
  }

  // Create
  const created = db
    .insert(dayRolePriorities)
    .values({ scheduleDayId, roleId, priority })
    .returning()
    .get();

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
  db.delete(dayRolePriorities)
    .where(eq(dayRolePriorities.scheduleDayId, scheduleDayId))
    .run();

  // Insert new priorities
  for (const { roleId, priority } of priorities) {
    db.insert(dayRolePriorities)
      .values({ scheduleDayId, roleId, priority })
      .run();
  }

  const updated = db
    .select()
    .from(dayRolePriorities)
    .where(eq(dayRolePriorities.scheduleDayId, scheduleDayId))
    .all();

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

  db.delete(dayRolePriorities)
    .where(eq(dayRolePriorities.scheduleDayId, parseInt(scheduleDayId, 10)))
    .run();

  return NextResponse.json({ success: true });
}
