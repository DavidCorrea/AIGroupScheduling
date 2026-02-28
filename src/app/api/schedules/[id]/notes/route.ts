import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleDate } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";
import { logScheduleAction } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = parseInt(id, 10);

  const rows = await db
    .select({ date: scheduleDate.date, note: scheduleDate.note })
    .from(scheduleDate)
    .where(eq(scheduleDate.scheduleId, scheduleId));

  const notes = rows
    .filter((r) => r.note != null && r.note.trim() !== "")
    .map((r) => ({ date: r.date, description: r.note! }));

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
    .from(scheduleDate)
    .where(
      and(
        eq(scheduleDate.scheduleId, scheduleId),
        eq(scheduleDate.date, date)
      )
    ))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "La fecha no existe en el cronograma" },
      { status: 404 }
    );
  }

  await db
    .update(scheduleDate)
    .set({ note: description.trim() })
    .where(eq(scheduleDate.id, existing.id));

  await logScheduleAction(scheduleId, authResult.user.id, "note_saved", `Nota guardada para ${date}`);
  return NextResponse.json({ date: existing.date, description: description.trim() });
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

  const existing = (await db
    .select()
    .from(scheduleDate)
    .where(
      and(
        eq(scheduleDate.scheduleId, scheduleId),
        eq(scheduleDate.date, date)
      )
    ))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Fecha no encontrada" },
      { status: 404 }
    );
  }

  await db
    .update(scheduleDate)
    .set({ note: null })
    .where(eq(scheduleDate.id, existing.id));

  await logScheduleAction(scheduleId, authResult.user.id, "note_deleted", `Nota eliminada para ${date}`);
  return NextResponse.json({ success: true });
}
