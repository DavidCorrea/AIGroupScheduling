import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringEvents, weekdays, scheduleDate } from "@/db/schema";
import { eq } from "drizzle-orm";
import { dayIndex } from "@/lib/constants";
import { extractGroupId, requireGroupAccess } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const allDays = await db
    .select({
      id: recurringEvents.id,
      weekdayId: recurringEvents.weekdayId,
      dayOfWeek: weekdays.name,
      active: recurringEvents.active,
      type: recurringEvents.type,
      label: recurringEvents.label,
      startTimeUtc: recurringEvents.startTimeUtc,
      endTimeUtc: recurringEvents.endTimeUtc,
      groupId: recurringEvents.groupId,
    })
    .from(recurringEvents)
    .innerJoin(weekdays, eq(recurringEvents.weekdayId, weekdays.id))
    .where(eq(recurringEvents.groupId, groupId));
  allDays.sort((a, b) => dayIndex(a.dayOfWeek ?? "") - dayIndex(b.dayOfWeek ?? ""));
  return NextResponse.json(allDays);
}

export async function PUT(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const { id, active, type, label, startTimeUtc, endTimeUtc, dayOfWeek: bodyDayOfWeek } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Day id is required" },
      { status: 400 }
    );
  }

  const existing = (await db
    .select()
    .from(recurringEvents)
    .where(eq(recurringEvents.id, id)))[0];

  if (!existing || existing.groupId !== groupId) {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }

  const updates: Partial<{
    active: boolean;
    weekdayId: number;
    type: string;
    label: string;
    startTimeUtc: string;
    endTimeUtc: string;
  }> = {};
  if (typeof active === "boolean") updates.active = active;
  if (typeof bodyDayOfWeek === "string" && bodyDayOfWeek.trim() !== "") {
    const dayOfWeek = bodyDayOfWeek.trim();
    const weekdayRow = (await db.select().from(weekdays).where(eq(weekdays.name, dayOfWeek)))[0];
    if (!weekdayRow) {
      return NextResponse.json(
        { error: "Invalid dayOfWeek" },
        { status: 400 }
      );
    }
    updates.weekdayId = weekdayRow.id;
  }
  if (type === "assignable" || type === "for_everyone") {
    updates.type = type;
    if (type === "for_everyone") updates.active = true;
  } else if (typeof type === "string" && type.toLowerCase() === "for_everyone") {
    updates.type = "for_everyone";
    updates.active = true;
  } else if (typeof type === "string" && type.toLowerCase() === "assignable") {
    updates.type = "assignable";
  }
  if (typeof label === "string") {
    updates.label = label.trim() || "Evento";
  }
  if (typeof startTimeUtc === "string" && /^\d{1,2}:\d{2}$/.test(startTimeUtc)) {
    updates.startTimeUtc = startTimeUtc;
  }
  if (typeof endTimeUtc === "string" && /^\d{1,2}:\d{2}$/.test(endTimeUtc)) {
    updates.endTimeUtc = endTimeUtc;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "At least one of active, dayOfWeek, type, label, startTimeUtc, or endTimeUtc must be provided" },
      { status: 400 }
    );
  }

  // When deactivating, remove this event's dates from all schedules so they are "hidden"
  if (updates.active === false) {
    await db.delete(scheduleDate).where(eq(scheduleDate.recurringEventId, id));
  }

  await db.update(recurringEvents)
    .set(updates)
    .where(eq(recurringEvents.id, id));

  const updated = (await db
    .select({
      id: recurringEvents.id,
      weekdayId: recurringEvents.weekdayId,
      dayOfWeek: weekdays.name,
      active: recurringEvents.active,
      type: recurringEvents.type,
      label: recurringEvents.label,
      startTimeUtc: recurringEvents.startTimeUtc,
      endTimeUtc: recurringEvents.endTimeUtc,
      groupId: recurringEvents.groupId,
    })
    .from(recurringEvents)
    .innerJoin(weekdays, eq(recurringEvents.weekdayId, weekdays.id))
    .where(eq(recurringEvents.id, id)))[0];

  return NextResponse.json(updated);
}

export async function POST(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const body = await request.json();
  const dayOfWeek = typeof body.dayOfWeek === "string" ? body.dayOfWeek.trim() : "";
  const active = typeof body.active === "boolean" ? body.active : true;
  let type: string = "assignable";
  if (body.type === "for_everyone" || (typeof body.type === "string" && body.type.toLowerCase() === "for_everyone")) {
    type = "for_everyone";
  } else if (body.type === "assignable" || (typeof body.type === "string" && body.type.toLowerCase() === "assignable")) {
    type = "assignable";
  }
  const label =
    typeof body.label === "string" && body.label.trim() !== ""
      ? body.label.trim()
      : "Evento";
  const startTimeUtc = typeof body.startTimeUtc === "string" && /^\d{1,2}:\d{2}$/.test(body.startTimeUtc)
    ? body.startTimeUtc
    : "00:00";
  const endTimeUtc = typeof body.endTimeUtc === "string" && /^\d{1,2}:\d{2}$/.test(body.endTimeUtc)
    ? body.endTimeUtc
    : "23:59";

  if (!dayOfWeek) {
    return NextResponse.json(
      { error: "dayOfWeek is required" },
      { status: 400 }
    );
  }

  const weekdayRow = (await db.select().from(weekdays).where(eq(weekdays.name, dayOfWeek)))[0];
  if (!weekdayRow) {
    return NextResponse.json(
      { error: "Invalid dayOfWeek" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(recurringEvents)
    .values({
      weekdayId: weekdayRow.id,
      groupId,
      active: type === "for_everyone" ? true : active,
      type,
      label,
      startTimeUtc,
      endTimeUtc,
    })
    .returning();

  const withDay = await db
    .select({
      id: recurringEvents.id,
      weekdayId: recurringEvents.weekdayId,
      dayOfWeek: weekdays.name,
      active: recurringEvents.active,
      type: recurringEvents.type,
      label: recurringEvents.label,
      startTimeUtc: recurringEvents.startTimeUtc,
      endTimeUtc: recurringEvents.endTimeUtc,
      groupId: recurringEvents.groupId,
    })
    .from(recurringEvents)
    .innerJoin(weekdays, eq(recurringEvents.weekdayId, weekdays.id))
    .where(eq(recurringEvents.id, created.id));

  return NextResponse.json(withDay[0], { status: 201 });
}
