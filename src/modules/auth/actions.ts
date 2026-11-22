"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { fieldErrorsFrom, type ActionResult } from "@/lib/actions";
import { loginSchema, safeAdminCallback, type LoginInput } from "@/modules/auth/schemas";

/** One message for every failure reason, so the form never reveals which accounts exist or are locked. */
const GENERIC_LOGIN_ERROR =
  "Email or password is incorrect, or the account is temporarily locked. After 5 failed attempts an account is locked for 15 minutes.";

/**
 * Signs a staff member in. On success Auth.js sets the HTTP-only session
 * cookie and throws a redirect (to the sanitised callback URL), which Next.js
 * propagates to the client.
 */
export async function loginAction(input: LoginInput): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Please correct the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeAdminCallback(parsed.data.callbackUrl),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: { code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR } };
    }
    throw error; // NEXT_REDIRECT on success, or a genuine failure
  }

  return { ok: false, error: { code: "INTERNAL", message: "Sign-in did not complete. Please try again." } };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
