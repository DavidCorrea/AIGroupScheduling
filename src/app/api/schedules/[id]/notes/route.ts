import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleDateNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";
import { logScheduleAction } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const notes = await db
    .select()
    .from(scheduleDateNotes)
    .where(eq(scheduleDateNotes.scheduleId, scheduleId));

  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

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

  const existing = (await db
    .select()
    .from(scheduleDateNotes)
    .where(
      and(
        eq(scheduleDateNotes.scheduleId, scheduleId),
        eq(scheduleDateNotes.date, date)
      )
    ))[0];

  if (existing) {
    await db.update(scheduleDateNotes)
      .set({ description: description.trim() })
      .where(eq(scheduleDateNotes.id, existing.id));

    await logScheduleAction(scheduleId, authResult.user.id, "note_saved", `Nota guardada para ${date}`);
    return NextResponse.json({ ...existing, description: description.trim() });
  }

  const note = (await db
    .insert(scheduleDateNotes)
    .values({ scheduleId, date, description: description.trim() })
    .returning())[0];

  await logScheduleAction(scheduleId, authResult.user.id, "note_saved", `Nota guardada para ${date}`);
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

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

  await db.delete(scheduleDateNotes)
    .where(
      and(
        eq(scheduleDateNotes.scheduleId, scheduleId),
        eq(scheduleDateNotes.date, date)
      )
    );

  await logScheduleAction(scheduleId, authResult.user.id, "note_deleted", `Nota eliminada para ${date}`);
  return NextResponse.json({ success: true });
}
