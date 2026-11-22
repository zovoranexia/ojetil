import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/config/locales";
import { routing } from "./routing";

/**
 * Validates the [locale] segment for a page. Pages render in parallel with
 * their layout, so each page must reject unknown segments itself (e.g. a
 * stray "/something.txt" request) before using the value in a query.
 */
export async function getPageLocale(params: Promise<{ locale: string }>): Promise<AppLocale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

/** For generateMetadata: returns null instead of throwing for unknown segments. */
export async function getMetadataLocale(params: Promise<{ locale: string }>): Promise<AppLocale | null> {
  const { locale } = await params;
  return hasLocale(routing.locales, locale) ? locale : null;
}
