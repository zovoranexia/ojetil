import type { Metadata } from "next";
import { LOCALES, type AppLocale } from "@/config/locales";
import { getPathname } from "@/i18n/navigation";

export { absoluteUrl, siteOrigin } from "./site-url";

/** Canonical + hreflang alternates for a locale-agnostic path such as "/notisia". */
export function localizedAlternates(path: string, locale: AppLocale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = getPathname({ href: path, locale: l });
  languages["x-default"] = getPathname({ href: path, locale: "tet" });
  return { canonical: getPathname({ href: path, locale }), languages };
}
