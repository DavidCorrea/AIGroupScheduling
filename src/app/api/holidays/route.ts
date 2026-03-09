import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, parseBody, apiError } from "@/lib/api-helpers";
import { loadUserHolidays } from "@/lib/data-access";
import { userHolidayCreateSchema } from "@/lib/schemas/holidays";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const userHolidays = await loadUserHolidays(authResult.user.id);
  return NextResponse.json(userHolidays);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const parsed = parseBody(userHolidayCreateSchema, body);
  if (parsed.error) return parsed.error;
  const { startDate, endDate, description } = parsed.data;

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
    return apiError("id es obligatorio", 400, "VALIDATION");
  }

  const holidayId = parseInt(id, 10);
  const existing = (await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, holidayId)))[0];

  if (!existing) {
    return apiError("Fecha no encontrada", 404, "NOT_FOUND");
  }

  // Verify the holiday belongs to the current user
  if (existing.userId !== authResult.user.id) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

  await db.delete(holidays).where(eq(holidays.id, holidayId));

  return NextResponse.json({ success: true });
}
