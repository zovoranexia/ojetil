"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { fromDbLocale } from "@/config/locales";
import { fieldErrorsFrom, type ActionResult } from "@/lib/actions";
import { writeAdminLocaleCookie } from "@/lib/admin-preferences";
import { db } from "@/lib/db";
import { msg } from "@/lib/i18n-message";
import { loginSchema, safeAdminCallback, type LoginInput } from "@/modules/auth/schemas";

/** One message for every failure reason, so the form never reveals which accounts exist or are locked. */
const GENERIC_LOGIN_ERROR = msg("admin.errors.loginFailed");

/**
 * Signs a staff member in. On success Auth.js sets the HTTP-only session
 * cookie; the account's saved backoffice language (if any) is copied into the
 * UI-language cookie, then we redirect to the sanitised callback URL.
 */
export async function loginAction(input: LoginInput): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: msg("admin.errors.validation"), fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }

  const target = safeAdminCallback(parsed.data.callbackUrl);
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: { code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR } };
    }
    throw error;
  }

  const account = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { uiLocale: true },
  });
  if (account?.uiLocale) await writeAdminLocaleCookie(fromDbLocale(account.uiLocale));

  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
