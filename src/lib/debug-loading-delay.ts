/**
 * Debug-only delay so loading animations are visible for a bit.
 * No-op in production.
 */
export function debugLoadingDelay(ms: number = 2000): Promise<void> {
  if (process.env.NODE_ENV !== "development") return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}
