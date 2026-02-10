import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleDays } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDefaults } from "@/lib/seed";
import { dayIndex } from "@/lib/constants";

export async function GET() {
  seedDefaults();
  const allDays = await db.select().from(scheduleDays);
  allDays.sort((a, b) => dayIndex(a.dayOfWeek) - dayIndex(b.dayOfWeek));
  return NextResponse.json(allDays);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, active, isRehearsal } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Day id is required" },
      { status: 400 }
    );
  }

  const existing = (await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.id, id)))[0];

  if (!existing) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  const updates: Partial<{ active: boolean; isRehearsal: boolean }> = {};
  if (typeof active === "boolean") updates.active = active;
  if (typeof isRehearsal === "boolean") updates.isRehearsal = isRehearsal;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "active or isRehearsal must be provided" },
      { status: 400 }
    );
  }

  await db.update(scheduleDays)
    .set(updates)
    .where(eq(scheduleDays.id, id));

  const updated = (await db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.id, id)))[0];

  return NextResponse.json(updated);
}
