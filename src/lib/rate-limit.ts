/**
 * In-memory rate limiter for public cronograma endpoints.
 * Limits are per Node instance (not shared across serverless invocations).
 * For production at scale, use @upstash/ratelimit (Redis-backed) instead.
 */

const windowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 120; // per IP per minute

const store = new Map<string, number[]>();

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
