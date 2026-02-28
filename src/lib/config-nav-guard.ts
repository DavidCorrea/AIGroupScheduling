/**
 * Returns true when pathname is a config sub-page that uses unsaved-changes
 * guard (so the layout should confirm before navigating away when dirty).
 */
export function isConfigFormPageWithUnsavedGuard(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.endsWith("/configuration")) return true;
  if (pathname.includes("/config/roles/new")) return true;
  if (/\/config\/roles\/\d+$/.test(pathname)) return true;
  if (/\/config\/schedules$/.test(pathname)) return true;
  return false;
}
