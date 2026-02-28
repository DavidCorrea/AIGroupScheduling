/**
 * Helpers for recurring-event–schedule-date flows (affected dates, recalc).
 */

export interface AffectedScheduleRow {
  scheduleId: number;
  month: number;
  year: number;
}

export interface AffectedScheduleSummary {
  count: number;
  schedules: { scheduleId: number; month: number; year: number; dateCount: number }[];
}

/**
 * Aggregate raw rows (one per schedule_date) into a count and per-schedule breakdown.
 * Used by GET affected-schedule-dates and by tests.
 */
export function aggregateAffectedScheduleDates(
  rows: AffectedScheduleRow[]
): AffectedScheduleSummary {
  const bySchedule = new Map<
    string,
    { scheduleId: number; month: number; year: number; dateCount: number }
  >();
  for (const r of rows) {
    const key = `${r.scheduleId}`;
    const existing = bySchedule.get(key);
    if (existing) {
      existing.dateCount += 1;
    } else {
      bySchedule.set(key, {
        scheduleId: r.scheduleId,
        month: r.month,
        year: r.year,
        dateCount: 1,
      });
    }
  }
  const scheduleList = [...bySchedule.values()];
  const count = scheduleList.reduce((acc, s) => acc + s.dateCount, 0);
  return { count, schedules: scheduleList };
}
