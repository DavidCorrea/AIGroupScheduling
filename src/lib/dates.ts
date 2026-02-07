/**
 * Returns all dates in a given month/year that fall on the specified days of the week.
 * @param month 1-based month (1 = January, 12 = December)
 * @param year 4-digit year
 * @param activeDays Array of day-of-week names (e.g. ["Wednesday", "Friday", "Sunday"])
 * @returns Array of ISO date strings (YYYY-MM-DD) sorted chronologically
 */
export function getScheduleDates(
  month: number,
  year: number,
  activeDays: string[]
): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayName = date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });

    if (activeDays.includes(dayName)) {
      const iso = date.toISOString().split("T")[0];
      dates.push(iso);
    }
  }

  return dates;
}

/**
 * Returns all dates in a given month/year that fall on rehearsal days.
 * @param month 1-based month (1 = January, 12 = December)
 * @param year 4-digit year
 * @param rehearsalDays Array of day-of-week names for recurring rehearsals
 * @returns Array of ISO date strings (YYYY-MM-DD) sorted chronologically
 */
export function getRehearsalDates(
  month: number,
  year: number,
  rehearsalDays: string[]
): string[] {
  if (rehearsalDays.length === 0) return [];

  const dates: string[] = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayName = date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });

    if (rehearsalDays.includes(dayName)) {
      const iso = date.toISOString().split("T")[0];
      dates.push(iso);
    }
  }

  return dates;
}
