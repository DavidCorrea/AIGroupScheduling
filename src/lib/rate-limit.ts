/**
 * In-memory rate limiter for public cronograma endpoints.
 * Limits are per Node instance (not shared across serverless invocations).
 * For production at scale, use @upstash/ratelimit (Redis-backed) instead.
 *
 * Client identification: uses x-forwarded-for or x-real-ip when present. When the app
 * is behind a trusted reverse proxy (e.g. Vercel), ensure the proxy sets/overwrites
 * these headers; the app trusts them for rate limiting. See docs/API.md.
 */

const windowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 120; // per IP per minute

/** Admin bootstrap auth: strict limit to mitigate brute force. */
const ADMIN_AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ADMIN_AUTH_MAX_ATTEMPTS = 5;

const store = new Map<string, number[]>();
const adminAuthStore = new Map<string, number[]>();

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function prune(key: string, now: number): void {
  const timestamps = store.get(key);
  if (!timestamps) return;
  const cutoff = now - windowMs;
  const kept = timestamps.filter((t) => t > cutoff);
  if (kept.length === 0) store.delete(key);
  else store.set(key, kept);
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * Call this at the start of the handler; if false, return 429.
 */
export function checkCronogramaRateLimit(request: Request): boolean {
  const key = `cronograma:${getClientIdentifier(request)}`;
  const now = Date.now();
  prune(key, now);
  const timestamps = store.get(key) ?? [];
  if (timestamps.length >= maxRequestsPerWindow) {
    return false;
  }
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/**
 * Rate limit for POST /api/admin/auth (bootstrap login). Returns false if limit exceeded.
 */
export function checkAdminAuthRateLimit(request: Request): boolean {
  const key = `admin_auth:${getClientIdentifier(request)}`;
  const now = Date.now();
  const cutoff = now - ADMIN_AUTH_WINDOW_MS;
  const timestamps = adminAuthStore.get(key) ?? [];
  const kept = timestamps.filter((t) => t > cutoff);
  if (kept.length >= ADMIN_AUTH_MAX_ATTEMPTS) {
    return false;
  }
  kept.push(now);
  adminAuthStore.set(key, kept);
  return true;
}

/**
 * Rate limit for GET /api/users/search. Returns false if limit exceeded.
 */
export function checkUserSearchRateLimit(request: Request): boolean {
  const key = `user_search:${getClientIdentifier(request)}`;
  const now = Date.now();
  prune(key, now);
  const timestamps = store.get(key) ?? [];
  if (timestamps.length >= 30) {
    return false;
  }
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
