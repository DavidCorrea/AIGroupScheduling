import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const userHolidays = await db
    .select()
    .from(holidays)
    .where(eq(holidays.userId, authResult.user.id));

  return NextResponse.json(userHolidays);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const { startDate, endDate, description } = body;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate y endDate son obligatorios" },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "La fecha de inicio debe ser anterior o igual a la fecha de fin" },
      { status: 400 }
    );
  }

  const holiday = (await db
    .insert(holidays)
    .values({
      userId: authResult.user.id,
      startDate,
      endDate,
      description: description ?? null,
    })
    .returning())[0];

  return NextResponse.json(holiday, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id es obligatorio" },
      { status: 400 }
    );
  }

  const holidayId = parseInt(id, 10);
  const existing = (await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, holidayId)))[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Fecha no encontrada" },
      { status: 404 }
    );
  }

  // Verify the holiday belongs to the current user
  if (existing.userId !== authResult.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(holidays).where(eq(holidays.id, holidayId));

  return NextResponse.json({ success: true });
}
