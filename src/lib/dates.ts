/**
 * Canonical Spanish weekday names by UTC day index (0 = Sunday, 1 = Monday, … 6 = Saturday).
 * Use this instead of toLocaleDateString so schedule generation always matches the weekdays table.
 */
const UTC_DAY_TO_SPANISH = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/**
 * Returns the capitalised Spanish day-of-week name for a Date (UTC).
 */
export function spanishDayName(date: Date): string {
  return UTC_DAY_TO_SPANISH[date.getUTCDay()];
}

/**
 * Returns the Spanish day-of-week name for an ISO date string (YYYY-MM-DD).
 */
export function getDayNameFromDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return spanishDayName(date);
}

/**
 * Returns all dates in a given month/year that fall on the specified days of the week.
 * @param month 1-based month (1 = January, 12 = December)
 * @param year 4-digit year
 * @param activeDays Array of day-of-week names (e.g. ["Miércoles", "Viernes", "Domingo"])
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
    const dayName = spanishDayName(date);

    if (activeDays.includes(dayName)) {
      const iso = date.toISOString().split("T")[0];
      dates.push(iso);
    }
  }

  return dates;
}

