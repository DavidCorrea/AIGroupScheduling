import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schedules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveGroupBySlug } from "@/lib/group";
import { buildPublicScheduleResponse } from "@/lib/public-schedule";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const group = await resolveGroupBySlug(slug);
  if (!group) {
    return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const schedule = (await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.groupId, group.id),
        eq(schedules.month, currentMonth),
        eq(schedules.year, currentYear),
        eq(schedules.status, "committed")
      )
    ))[0];

  if (!schedule) {
    return NextResponse.json(
      { error: "No hay agenda creada para este mes." },
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
