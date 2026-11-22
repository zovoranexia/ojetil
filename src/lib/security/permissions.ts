import type { Role } from "@prisma/client";
import { satisfies, type PermissionRequirement } from "@/config/rbac";

/** 401 — no valid session. */
export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";
  readonly status = 401;
  constructor(message = "Authentication required.") {
    super(message);
  }
}

/** 403 — authenticated but not allowed. */
export class ForbiddenError extends Error {
  override name = "ForbiddenError";
  readonly status = 403;
  constructor(readonly requirement: PermissionRequirement, message = "You do not have permission to perform this action.") {
    super(message);
  }
}

/**
 * Centralised authorisation check (layer 2). Throws ForbiddenError when `role`
 * does not satisfy `permission`; returns normally otherwise.
 *
 *   requirePermission(user.role, "members:pii");
 *   requirePermission(user.role, { anyOf: ["audit:read:all", "audit:read:verification"] });
 */
export function requirePermission(role: Role | null | undefined, permission: PermissionRequirement): void {
  if (!role) throw new UnauthorizedError();
  if (!satisfies(role, permission)) throw new ForbiddenError(permission);
}

export function isAuthError(error: unknown): error is UnauthorizedError | ForbiddenError {
  return error instanceof UnauthorizedError || error instanceof ForbiddenError;
}
