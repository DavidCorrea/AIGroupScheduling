import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schedules, scheduleDate } from "@/db/schema";
import { eq, and, desc, asc, or, gt, gte } from "drizzle-orm";
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
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let schedule = (await db
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
    const closest = (await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.groupId, group.id),
          eq(schedules.status, "committed")
        )
      )
      .orderBy(desc(schedules.year), desc(schedules.month))
      .limit(1))[0];
    schedule = closest ?? null;
  }

  if (schedule) {
    const hasFutureDate = (await db
      .select({ date: scheduleDate.date })
      .from(scheduleDate)
      .where(
        and(
          eq(scheduleDate.scheduleId, schedule.id),
          gte(scheduleDate.date, todayStr)
        )
      )
      .limit(1)).length > 0;

    if (!hasFutureDate) {
      const nextSchedule = (await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.groupId, group.id),
            eq(schedules.status, "committed"),
            or(
              gt(schedules.year, currentYear),
              and(eq(schedules.year, currentYear), gt(schedules.month, currentMonth))
            )
          )
        )
        .orderBy(asc(schedules.year), asc(schedules.month))
        .limit(1))[0];
      if (nextSchedule) schedule = nextSchedule;
    }
  }

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
