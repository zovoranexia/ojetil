"use server";

import { isAppLocale, toDbLocale } from "@/config/locales";
import { writeAdminLocaleCookie } from "@/lib/admin-preferences";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/security/guards";

/**
 * Top-bar language picker. Sets the cookie the whole backoffice renders from and,
 * for a signed-in user, remembers the choice on the account so it follows them to
 * other devices (applied again at sign-in). The caller refreshes the route.
 *
 * (The theme is a per-device choice: the toggle writes its cookie client-side.)
 */
export async function setAdminLocaleAction(locale: string): Promise<{ ok: boolean }> {
  if (!isAppLocale(locale)) return { ok: false };
  await writeAdminLocaleCookie(locale);
  const user = await getSessionUser();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { uiLocale: toDbLocale(locale) } });
  }
  return { ok: true };
}
