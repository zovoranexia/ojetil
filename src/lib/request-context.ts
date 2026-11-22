import { headers } from "next/headers";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

const EMPTY: RequestContext = { ipAddress: null, userAgent: null };

/**
 * Number of reverse proxies in front of the app that APPEND the address they
 * saw to X-Forwarded-For (nginx `$proxy_add_x_forwarded_for`, most load
 * balancers). The client address is the entry written by the outermost
 * trusted proxy, i.e. `hops` positions from the right. Everything to its left
 * was sent by the client and can be forged, so it is never used.
 *
 * Without any proxy, Next.js only sets X-Forwarded-For when the client did not
 * send one, so a client could choose its own value: always deploy behind a
 * proxy that sets or appends this header (see .env.example).
 */
function trustedProxyHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Extracts client IP / user agent from a Headers object (proxy-aware, spoof-resistant). */
export function contextFromHeaders(h: Headers): RequestContext {
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = chain.length ? chain[Math.max(chain.length - trustedProxyHops(), 0)]! : null;
  const ua = h.get("user-agent");
  return {
    ipAddress: ip ? ip.slice(0, 64) : null,
    userAgent: ua ? ua.slice(0, 512) : null,
  };
}

/**
 * Request context inside Server Components, Server Actions and Route Handlers.
 * Returns empty values outside a request (scripts, seed, background work).
 */
export async function getRequestContext(): Promise<RequestContext> {
  try {
    return contextFromHeaders(await headers());
  } catch {
    return EMPTY;
  }
}
