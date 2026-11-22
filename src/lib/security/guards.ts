import "server-only";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { satisfies, type PermissionRequirement } from "@/config/rbac";
import { ForbiddenError, requirePermission, UnauthorizedError } from "@/lib/security/permissions";

/**
 * Layer 2 of RBAC: session-aware guards for Server Components, Server Actions
 * and Route Handlers. `auth()` re-validates the session against the database
 * on every call (see src/auth.ts), so a deactivated user is rejected here even
 * if the middleware let a request through with a still-unexpired cookie.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Still using an admin-issued temporary password. */
  mustChangePassword: boolean;
}

export const CHANGE_PASSWORD_PATH = "/admin/akun/password";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, mustChangePassword: Boolean(u.mustChangePassword) };
}

/**
 * For Server Actions and services: throws UnauthorizedError / ForbiddenError.
 * Accounts on a temporary password can do nothing but change it.
 */
export async function requireUser(
  requirement?: PermissionRequirement,
  opts: { allowPendingPasswordChange?: boolean } = {},
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  if (user.mustChangePassword && !opts.allowPendingPasswordChange) {
    throw new ForbiddenError(requirement ?? "dashboard:view", "Choose a new password before continuing.");
  }
  if (requirement) requirePermission(user.role, requirement);
  return user;
}

/** For admin pages (RSC): redirects to login, the change-password page, or the 403 page instead of throwing. */
export async function requirePageAccess(requirement: PermissionRequirement, currentPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/admin/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  if (user.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);
  if (!satisfies(user.role, requirement)) redirect("/admin/forbidden");
  return user;
}

/** Non-throwing check for conditional rendering in Server Components. */
export async function can(requirement: PermissionRequirement): Promise<boolean> {
  const user = await getSessionUser();
  return user ? satisfies(user.role, requirement) : false;
}

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps an App Router route handler with authentication + authorisation.
 * Responds 401/403 JSON on failure; never leaks internal errors.
 *
 *   export const GET = withApiAuth("members:export", async (req, user) => …);
 */
export function withApiAuth<P = Record<string, string>>(
  requirement: PermissionRequirement,
  handler: (request: Request, user: SessionUser, context: RouteContext<P>) => Promise<Response>,
) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    try {
      const user = await requireUser(requirement);
      return await handler(request, user, context);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: error.message }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: "FORBIDDEN", message: error.message }, { status: 403 });
      }
      console.error("[api] unhandled error", error);
      return NextResponse.json({ error: "INTERNAL", message: "Unexpected server error." }, { status: 500 });
    }
  };
}
