/**
 * In-memory store for admin bootstrap tokens.
 * Used so the cookie never contains ADMIN_PASSWORD; only a short-lived random token.
 * Prune expired entries on read/write. Not shared across serverless invocations.
 */

const BOOTSTRAP_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

const store = new Map<string, number>();

function prune(now: number): void {
  const cutoff = now - BOOTSTRAP_TOKEN_MAX_AGE_MS;
  for (const [token, createdAt] of store.entries()) {
    if (createdAt < cutoff) store.delete(token);
  }
}

export function createBootstrapToken(): string {
  const now = Date.now();
  prune(now);
  const token = crypto.randomUUID();
  store.set(token, now);
  return token;
}

/** Validate token (cookie can be reused until expiry). */
export function validateBootstrapToken(value: string): boolean {
  const now = Date.now();
  prune(now);
  const createdAt = store.get(value);
  if (createdAt == null) return false;
  if (now - createdAt > BOOTSTRAP_TOKEN_MAX_AGE_MS) {
    store.delete(value);
    return false;
  }
  return true;
}
