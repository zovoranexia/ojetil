import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import type { RequestContext } from "@/lib/request-context";
import { getDummyPasswordHash, verifyPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { recordAudit } from "@/modules/audit/service";

/** Consecutive failures before an account is locked, and for how long. */
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export interface AuthenticatedStaff {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionVersion: number;
  mustChangePassword: boolean;
}

export type LoginOutcome =
  | { ok: true; user: AuthenticatedStaff }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "LOCKED" | "INACTIVE" };

/** Per-client-IP ceiling on sign-in attempts across all accounts (password spraying). */
export const MAX_LOGINS_PER_IP = 20;
const IP_WINDOW_MS = 15 * 60_000;

/**
 * Verifies staff credentials with brute-force protection:
 *  • unknown emails still run an argon2 verification (no timing oracle);
 *  • each attempt is reserved atomically BEFORE the password is checked
 *    (UPDATE … WHERE failedLoginCount < MAX RETURNING), so parallel requests
 *    can never test more than 5 passwords before the account locks;
 *  • 5 consecutive failures lock the account for 15 minutes;
 *  • at most 20 attempts per client IP per 15 minutes;
 *  • deactivated accounts cannot sign in;
 *  • every attempt — success or failure — is written to the audit trail.
 * Callers must show one generic error for every failure reason.
 */
export async function authenticateStaff(
  rawEmail: string,
  password: string,
  context: RequestContext,
  now: Date = new Date(),
): Promise<LoginOutcome> {
  const email = rawEmail.trim().toLowerCase();

  if (!rateLimit("login-ip", context.ipAddress ?? "unknown", MAX_LOGINS_PER_IP, IP_WINDOW_MS).ok) {
    await recordAudit({ action: "LOGIN_FAILED", actor: null, metadata: { email, reason: "RATE_LIMITED" }, context });
    return { ok: false, reason: "LOCKED" };
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(await getDummyPasswordHash(), password);
    await recordAudit({ action: "LOGIN_FAILED", actor: null, metadata: { email, reason: "UNKNOWN_EMAIL" }, context });
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const target = { type: "User", id: user.id };

  // Reserve this attempt; concurrent requests serialise on the row lock this UPDATE takes.
  const reserved = await db.$queryRaw<Array<{ failedLoginCount: number }>>`
    UPDATE "users" SET "failedLoginCount" = "failedLoginCount" + 1
    WHERE "id" = ${user.id}
      AND ("lockedUntil" IS NULL OR "lockedUntil" <= ${now})
      AND "failedLoginCount" < ${MAX_FAILED_LOGINS}
    RETURNING "failedLoginCount"`;
  const attempt = reserved[0]?.failedLoginCount;

  if (attempt === undefined) {
    await verifyPassword(await getDummyPasswordHash(), password);
    await recordAudit({ action: "LOGIN_FAILED", actor: null, target, metadata: { email, reason: "LOCKED" }, context });
    return { ok: false, reason: "LOCKED" };
  }

  const valid = await verifyPassword(user.passwordHash, password);

  if (!valid) {
    await recordAudit({
      action: "LOGIN_FAILED",
      actor: null,
      target,
      metadata: { email, reason: "INVALID_PASSWORD", consecutiveFailures: attempt },
      context,
    });

    if (attempt >= MAX_FAILED_LOGINS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60_000);
      await db.user.update({ where: { id: user.id }, data: { lockedUntil, failedLoginCount: 0 } });
      await recordAudit({
        action: "ACCOUNT_LOCKED",
        actor: null,
        target,
        metadata: { email, lockedUntil: lockedUntil.toISOString(), afterFailures: MAX_FAILED_LOGINS },
        context,
      });
      return { ok: false, reason: "LOCKED" };
    }
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (!user.isActive) {
    // Correct password: release the reserved attempt so it doesn't count toward a lockout.
    await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0 } });
    await recordAudit({ action: "LOGIN_FAILED", actor: null, target, metadata: { email, reason: "INACTIVE" }, context });
    return { ok: false, reason: "INACTIVE" };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  await recordAudit({
    action: "LOGIN_SUCCEEDED",
    actor: { id: user.id, email: user.email, role: user.role },
    target,
    context,
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

/**
 * Session revalidation: a session stays valid only while the account is active
 * and its sessionVersion is unchanged (bumped on role change, deactivation or
 * password reset). Returns fresh claims, or null to end the session.
 */
export async function revalidateSession(userId: string, sessionVersion: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, sessionVersion: true, mustChangePassword: true },
  });
  if (!user || !user.isActive || user.sessionVersion !== sessionVersion) return null;
  return user;
}
