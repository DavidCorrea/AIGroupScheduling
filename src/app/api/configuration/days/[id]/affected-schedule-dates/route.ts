import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduleDate, schedules, recurringEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireGroupAccess } from "@/lib/api-helpers";
import { aggregateAffectedScheduleDates } from "@/lib/affected-schedule-dates";

/**
 * GET: Return how many schedule_date rows reference this recurring event,
 * and per-schedule breakdown (scheduleId, month, year, dateCount).
 * Used to ask the user whether to remove those dates when deleting the event.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

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

  const rows = await db
    .select({
      scheduleId: scheduleDate.scheduleId,
      month: schedules.month,
      year: schedules.year,
    })
    .from(scheduleDate)
    .innerJoin(schedules, eq(scheduleDate.scheduleId, schedules.id))
    .where(
      and(
        eq(scheduleDate.recurringEventId, recurringEventId),
        eq(schedules.groupId, groupId)
      )
    );

  const { count, schedules: scheduleList } = aggregateAffectedScheduleDates(rows);

  return NextResponse.json({ count, schedules: scheduleList });
}
