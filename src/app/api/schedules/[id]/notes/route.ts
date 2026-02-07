import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleDateNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const notes = db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, scheduleId))
    .all();

  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);
  const body = await request.json();
  const { date, description } = body;

  if (!date || !description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "date and description are required" },
      { status: 400 }
    );
  }

  // Check if a note already exists for this date
  const existing = db
    .select()
    .from(scheduleDateNotes)
    .where(
      and(
        eq(scheduleDateNotes.scheduleId, scheduleId),
        eq(scheduleDateNotes.date, date)
      )
    )
    .get();

  if (existing) {
    // Update existing note
    db.update(scheduleDateNotes)
      .set({ description: description.trim() })
      .where(eq(scheduleDateNotes.id, existing.id))
      .run();

    return NextResponse.json({ ...existing, description: description.trim() });
  }

  // Create new note
  const note = db
    .insert(scheduleDateNotes)
    .values({ scheduleId, date, description: description.trim() })
    .returning()
    .get();

  return NextResponse.json(note, { status: 201 });
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

  db.delete(scheduleDateNotes)
    .where(
      and(
        eq(scheduleDateNotes.scheduleId, scheduleId),
        eq(scheduleDateNotes.date, date)
      )
    )
    .run();

  return NextResponse.json({ success: true });
}
