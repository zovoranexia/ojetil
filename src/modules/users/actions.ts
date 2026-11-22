"use server";

import { Prisma, type PrismaClient, type Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security/password";
import { generateTemporaryPassword } from "@/lib/security/password-generator";
import { recordAudit } from "@/modules/audit/service";
import { changeRoleSchema, createUserSchema, setActiveSchema, userIdSchema } from "./schema";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * The organisation must never be left without an active Super Admin.
 * Locks every active Super Admin row first (FOR UPDATE), so two admins
 * demoting/deactivating each other at the same moment are serialised: the
 * second transaction re-reads after the first commits and sees the change.
 */
async function assertNotLastSuperAdmin(tx: Tx, userId: string, message: string) {
  const active = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "users" WHERE "role" = 'SUPER_ADMIN' AND "isActive" = TRUE FOR UPDATE`;
  if (!active.some((u) => u.id === userId)) return;
  if (active.length <= 1) throw new ActionError("CONFLICT", message);
}

export const createStaffUser = authorizedAction("users:manage", createUserSchema, async (input, actor) => {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: input.name, email: input.email, role: input.role, passwordHash, mustChangePassword: true, createdById: actor.id },
        select: { id: true },
      });
      await recordAudit({ action: "USER_CREATED", actor, target: { type: "User", id: created.id }, metadata: { email: input.email, role: input.role } }, tx);
      return created;
    });
    revalidatePath("/admin/users");
    return { id: user.id, email: input.email, temporaryPassword };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ActionError("CONFLICT", "An account with this email already exists.", { email: ["Already in use."] });
    }
    throw error;
  }
});

/** Role change bumps sessionVersion, so the user's open sessions end immediately. */
export const changeStaffRole = authorizedAction("users:manage", changeRoleSchema, async ({ id, role }, actor) => {
  if (id === actor.id) throw new ActionError("FORBIDDEN", "You cannot change your own role.");
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, select: { email: true, role: true } });
    if (!user) throw new ActionError("NOT_FOUND", "User not found.");
    if (user.role === role) return { role };
    if (role !== "SUPER_ADMIN") await assertNotLastSuperAdmin(tx, id, "This is the last active Super Admin; promote someone else first.");
    await tx.user.update({ where: { id }, data: { role, sessionVersion: { increment: 1 } } });
    await recordAudit({ action: "USER_ROLE_CHANGED", actor, target: { type: "User", id }, metadata: { email: user.email, from: user.role, to: role } }, tx);
    return { role: role as Role };
  });
  revalidatePath("/admin/users");
  return result;
});

export const setStaffActive = authorizedAction("users:manage", setActiveSchema, async ({ id, active }, actor) => {
  if (id === actor.id) throw new ActionError("FORBIDDEN", "You cannot deactivate your own account.");
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, select: { email: true, isActive: true } });
    if (!user) throw new ActionError("NOT_FOUND", "User not found.");
    if (user.isActive === active) return;
    if (!active) await assertNotLastSuperAdmin(tx, id, "This is the last active Super Admin and cannot be deactivated.");
    await tx.user.update({
      where: { id },
      data: { isActive: active, sessionVersion: { increment: 1 }, ...(active ? { failedLoginCount: 0, lockedUntil: null } : {}) },
    });
    await recordAudit({ action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED", actor, target: { type: "User", id }, metadata: { email: user.email } }, tx);
  });
  revalidatePath("/admin/users");
  return { active };
});

/** Issues a new temporary password (shown once), unlocks the account and signs out all sessions. The user must replace it at next sign-in. */
export const resetStaffPassword = authorizedAction("users:manage", userIdSchema, async ({ id }, actor) => {
  if (id === actor.id) throw new ActionError("FORBIDDEN", "Use “Change my password” for your own account.");
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const email = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, select: { email: true } });
    if (!user) throw new ActionError("NOT_FOUND", "User not found.");
    await tx.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date(), sessionVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
    });
    await recordAudit({ action: "USER_PASSWORD_RESET", actor, target: { type: "User", id }, metadata: { email: user.email } }, tx);
    return user.email;
  });
  revalidatePath("/admin/users");
  return { email, temporaryPassword };
});
