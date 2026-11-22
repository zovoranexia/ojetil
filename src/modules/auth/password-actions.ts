"use server";

import { fieldErrorsFrom, type ActionResult } from "@/lib/actions";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { requireUser } from "@/lib/security/guards";
import { msg } from "@/lib/i18n-message";
import { isAuthError } from "@/lib/security/permissions";
import { recordAudit } from "@/modules/audit/service";
import { changePasswordSchema, type ChangePasswordInput } from "./password-schema";

/**
 * Any signed-in staff member can change their own password — and must, while
 * on a temporary one. Success bumps sessionVersion, which ends every session of
 * this account (including the current one); the client then signs in again.
 */
export async function changeOwnPassword(input: ChangePasswordInput): Promise<ActionResult<{ email: string }>> {
  try {
    const user = await requireUser(undefined, { allowPendingPasswordChange: true });
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: { code: "VALIDATION", message: msg("admin.errors.validation"), fieldErrors: fieldErrorsFrom(parsed.error) } };
    }

    const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!row || !(await verifyPassword(row.passwordHash, parsed.data.currentPassword))) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: msg("admin.account.errors.currentIncorrect"), fieldErrors: { currentPassword: [msg("admin.account.errors.incorrectPassword")] } },
      };
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date(), sessionVersion: { increment: 1 } },
      });
      await recordAudit({ action: "USER_PASSWORD_CHANGED", actor: user, target: { type: "User", id: user.id }, metadata: { email: user.email } }, tx);
    });
    return { ok: true, data: { email: user.email } };
  } catch (error) {
    if (isAuthError(error)) return { ok: false, error: { code: "UNAUTHORIZED", message: msg("admin.account.errors.sessionExpired") } };
    console.error("[auth] password change failed", error);
    return { ok: false, error: { code: "INTERNAL", message: msg("admin.errors.internal") } };
  }
}
