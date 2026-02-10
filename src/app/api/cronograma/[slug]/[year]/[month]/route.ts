import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schedules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveGroupBySlug } from "@/lib/group";
import { buildPublicScheduleResponse } from "@/lib/public-schedule";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; year: string; month: string }> }
) {
  const { slug, year: yearStr, month: monthStr } = await params;

  const group = await resolveGroupBySlug(slug);
  if (!group) {
    return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 }
    );
  }

  const schedule = (await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.groupId, group.id),
        eq(schedules.month, month),
        eq(schedules.year, year),
        eq(schedules.status, "committed")
      )
    ))[0];

  if (!schedule) {
    return NextResponse.json(
      { error: "Agenda no encontrada" },
      { status: 404 }
    );
  }

  const data = await buildPublicScheduleResponse({
    id: schedule.id,
    month: schedule.month,
    year: schedule.year,
    groupId: group.id,
  });

  return NextResponse.json(data);
}
