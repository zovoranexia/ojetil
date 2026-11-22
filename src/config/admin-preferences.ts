import type { AppLocale } from "@/config/locales";

/**
 * Backoffice UI preferences. Safe to import from client components.
 *
 *  • Language: cookie (read on every request, so the first paint is already in the
 *    right language) mirrored to `User.uiLocale`, which re-seeds the cookie at sign-in
 *    on a new device. Independent of the public site's locale (URL prefix).
 *  • Theme: cookie only (a per-device choice). No cookie = follow the OS setting
 *    (`prefers-color-scheme`), resolved by an inline script before first paint.
 */
export const ADMIN_LOCALE_COOKIE = "ojetil_admin_locale";
export const ADMIN_THEME_COOKIE = "ojetil_admin_theme";

/** Staff UI language when nothing has been chosen yet (the backoffice was English-only before). */
export const ADMIN_DEFAULT_LOCALE: AppLocale = "en";

export const ADMIN_THEMES = ["light", "dark"] as const;
export type AdminTheme = (typeof ADMIN_THEMES)[number];

export function isAdminTheme(value: unknown): value is AdminTheme {
  return value === "light" || value === "dark";
}

/** One year; preferences are not sensitive. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
