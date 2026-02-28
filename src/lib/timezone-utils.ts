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
