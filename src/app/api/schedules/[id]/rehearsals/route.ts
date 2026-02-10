import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleRehearsalDates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const dates = await db
    .select()
    .from(scheduleRehearsalDates)
    .where(eq(scheduleRehearsalDates.scheduleId, scheduleId));

  return NextResponse.json(dates.map((d) => d.date));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);
  const body = await request.json();
  const { date } = body;

  if (!date) {
    return NextResponse.json(
      { error: "date is required" },
      { status: 400 }
    );
  }

  // Check if already exists
  const existing = (await db
    .select()
    .from(scheduleRehearsalDates)
    .where(
      and(
        eq(scheduleRehearsalDates.scheduleId, scheduleId),
        eq(scheduleRehearsalDates.date, date)
      )
    ))[0];

  if (existing) {
    return NextResponse.json({ date }, { status: 200 });
  }

  await db.insert(scheduleRehearsalDates)
    .values({ scheduleId, date });

  return NextResponse.json({ date }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "date query param is required" },
      { status: 400 }
    );
  }

  await db.delete(scheduleRehearsalDates)
    .where(
      and(
        eq(scheduleRehearsalDates.scheduleId, scheduleId),
        eq(scheduleRehearsalDates.date, date)
      )
    );

  return NextResponse.json({ success: true });
}
