/**
 * Canonical order of days of the week in Spanish (Lunes → Domingo).
 * Used for consistent sorting across the application.
 */
export const DAY_ORDER: readonly string[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/**
 * Returns the sort index for a Spanish day name.
 * Unknown names are pushed to the end.
 */
export function dayIndex(dayOfWeek: string): number {
  const idx = DAY_ORDER.indexOf(dayOfWeek);
  return idx === -1 ? DAY_ORDER.length : idx;
}
