import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringEvents, scheduleDate } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireGroupAccess } from "@/lib/api-helpers";
import { rebuildScheduleFutureAssignments } from "@/lib/schedule-helpers";

/**
 * POST: Re-run the assignment algorithm for all schedules that have assignable
 * schedule_date rows linked to this recurring event. Used after the user changes
 * the event's day or times so assignments respect the new config.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { user, groupId } = accessResult;

  const { id } = await params;
  const recurringEventId = parseInt(id, 10);
  if (isNaN(recurringEventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const event = (await db
    .select({ id: recurringEvents.id, groupId: recurringEvents.groupId })
    .from(recurringEvents)
    .where(eq(recurringEvents.id, recurringEventId)))[0];

  if (!event || event.groupId !== groupId) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  const assignableDatesWithSchedule = await db
    .select({ scheduleId: scheduleDate.scheduleId })
    .from(scheduleDate)
    .where(
      and(
        eq(scheduleDate.recurringEventId, recurringEventId),
        eq(scheduleDate.type, "assignable")
      )
    );

  const scheduleIds = [...new Set(assignableDatesWithSchedule.map((r) => r.scheduleId))];
  if (scheduleIds.length === 0) {
    return NextResponse.json({ success: true, schedulesUpdated: 0 });
  }

  let totalApplied = 0;
  const errors: string[] = [];
  for (const scheduleId of scheduleIds) {
    try {
      const { applied } = await rebuildScheduleFutureAssignments(scheduleId, user.id);
      totalApplied += applied;
    } catch (e) {
      errors.push(String(e));
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Error al recalcular algunas asignaciones", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    schedulesUpdated: scheduleIds.length,
    assignmentsApplied: totalApplied,
  });
}
