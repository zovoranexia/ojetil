import "server-only";

/**
 * Fixed-window, in-memory rate limiter keyed by (bucket, client IP).
 * Sufficient for a single Node.js instance; a multi-instance deployment should
 * swap the Map for Redis or a database table behind the same interface.
 */
interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of store) if (w.resetAt <= now) store.delete(key);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(bucket: string, clientKey: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = `${bucket}:${clientKey}`;
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  current.count++;
  const ok = current.count <= limit;
  return {
    ok,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: ok ? 0 : Math.ceil((current.resetAt - now) / 1000),
  };
}

/** Test helper. */
export function resetRateLimits(): void {
  store.clear();
}

/** Read-only check: is `clientKey` currently over `limit` in `bucket`? (Does not count an attempt.) */
export function isRateLimited(bucket: string, clientKey: string, limit: number): RateLimitResult {
  const now = Date.now();
  const w = store.get(`${bucket}:${clientKey}`);
  if (!w || w.resetAt <= now || w.count < limit) return { ok: true, remaining: w ? Math.max(limit - w.count, 0) : limit, retryAfterSeconds: 0 };
  return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((w.resetAt - now) / 1000) };
}
