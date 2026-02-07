import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleDays } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDefaults } from "@/lib/seed";

export async function GET() {
  seedDefaults();
  const allDays = db.select().from(scheduleDays).all();
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

  const existing = db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.id, id))
    .get();

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

  db.update(scheduleDays)
    .set(updates)
    .where(eq(scheduleDays.id, id))
    .run();

  const updated = db
    .select()
    .from(scheduleDays)
    .where(eq(scheduleDays.id, id))
    .get();

  return NextResponse.json(updated);
}
