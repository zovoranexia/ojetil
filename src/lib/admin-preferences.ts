import "server-only";
import { cookies } from "next/headers";
import {
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_COOKIE,
  ADMIN_THEME_COOKIE,
  isAdminTheme,
  PREFERENCE_COOKIE_MAX_AGE,
  type AdminTheme,
} from "@/config/admin-preferences";
import { isAppLocale, type AppLocale } from "@/config/locales";

/** Backoffice UI language for this request (cookie, else English). */
export async function getAdminLocale(): Promise<AppLocale> {
  const value = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  return isAppLocale(value) ? value : ADMIN_DEFAULT_LOCALE;
}

/** Explicit theme choice, or null to follow the OS (`prefers-color-scheme`). */
export async function getAdminTheme(): Promise<AdminTheme | null> {
  const value = (await cookies()).get(ADMIN_THEME_COOKIE)?.value;
  return isAdminTheme(value) ? value : null;
}

/** Only callable from Server Actions / Route Handlers (cookies are read-only while rendering). */
export async function writeAdminLocaleCookie(locale: AppLocale): Promise<void> {
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: PREFERENCE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
