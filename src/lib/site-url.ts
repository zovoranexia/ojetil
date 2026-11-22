/**
 * Absolute URLs for the public site. Dependency-free on purpose: also used by
 * plain Node scripts (e.g. the event-reminder job) outside Next.js.
 */

/** Public origin of the site (APP_URL), without a trailing slash. */
export function siteOrigin(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Absolute URL for a site path ("/notisia" → "https://ojetil.tl/notisia"); absolute URLs pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
