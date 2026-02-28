/**
 * Convert UTC time "HH:MM" to local time "HH:MM" for display.
 * Uses a fixed date (2000-01-01) to avoid DST edge cases.
 */
export function utcTimeToLocalDisplay(utcHHMM: string): string {
  const [h, m] = parseHHMM(utcHHMM);
  const date = new Date(Date.UTC(2000, 0, 1, h, m));
  const lh = date.getHours();
  const lm = date.getMinutes();
  return `${String(lh).padStart(2, "0")}:${String(lm).padStart(2, "0")}`;
}

/**
 * Convert local time "HH:MM" (user input) to UTC "HH:MM" for storage.
 * Uses a fixed date in the local timezone.
 */
export function localTimeToUtc(localHHMM: string): string {
  const [h, m] = parseHHMM(localHHMM);
  const date = new Date(2000, 0, 1, h, m);
  const uh = date.getUTCHours();
  const um = date.getUTCMinutes();
  return `${String(uh).padStart(2, "0")}:${String(um).padStart(2, "0")}`;
}

function parseHHMM(s: string): [number, number] {
  const trimmed = (s ?? "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return [0, 0];
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return [h, m];
}

/** Format "HH:MM" for input[type="time"] (always HH:MM). */
export function toTimeInputValue(hhmm: string): string {
  const [h, m] = parseHHMM(hhmm);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse YYYY-MM-DD as local date (user's timezone) for display. */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string (YYYY-MM-DD) in the user's timezone.
 * Uses browser locale and timezone so dates and times show in user time.
 */
export function formatDateLong(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format date as "Domingo, 1" (weekday long + day of month) in user timezone. */
export function formatDateWeekdayDay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const weekday = date.toLocaleDateString("es-ES", { weekday: "long" });
  const dayNum = date.getDate();
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayNum}`;
}

/** Format "d mes" (e.g. "3 mar") in user timezone. */
export function formatDayMonth(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

/** Format date range "d mes – d mes" in user timezone. */
export function formatDateRange(startDateStr: string, endDateStr: string): string {
  return `${formatDayMonth(startDateStr)} – ${formatDayMonth(endDateStr)}`;
}

/** Format single date as "d mes year" in user timezone (e.g. "15 mar 2025"). */
export function formatDateWithYear(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format date range "d mes year — d mes year" in user timezone. */
export function formatDateRangeWithYear(startDateStr: string, endDateStr: string): string {
  const s = formatDateWithYear(startDateStr);
  const e = formatDateWithYear(endDateStr);
  return startDateStr === endDateStr ? s : `${s} — ${e}`;
}

/** Get Spanish weekday name (e.g. "lunes") for a YYYY-MM-DD date in user timezone. */
export function getWeekdayName(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString("es-ES", { weekday: "long" });
}

/** Get Spanish weekday name capitalized (e.g. "Lunes") for a YYYY-MM-DD date in user timezone. */
export function getDayOfWeek(dateStr: string): string {
  const raw = getWeekdayName(dateStr);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Format ISO datetime string in user's timezone (date + time). */
export function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
