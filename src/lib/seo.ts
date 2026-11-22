import type { Metadata } from "next";
import { LOCALES, type AppLocale } from "@/config/locales";
import { getPathname } from "@/i18n/navigation";

/** Canonical + hreflang alternates for a locale-agnostic path such as "/notisia". */
export function localizedAlternates(path: string, locale: AppLocale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = getPathname({ href: path, locale: l });
  languages["x-default"] = getPathname({ href: path, locale: "tet" });
  return { canonical: getPathname({ href: path, locale }), languages };
}

/** Public origin of the site (APP_URL), without a trailing slash. */
export function siteOrigin(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Absolute URL for a site path ("/notisia" → "https://ojetil.tl/notisia"); absolute URLs pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
