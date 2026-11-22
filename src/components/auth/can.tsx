import "server-only";
import type { ReactNode } from "react";
import type { PermissionRequirement } from "@/config/rbac";
import { can } from "@/lib/security/guards";

/**
 * Layer 3 (Server Components): render children only when the current user
 * satisfies `permission`. UI hiding is a convenience — layers 1 and 2 are the
 * actual enforcement.
 *
 *   <Can permission="content:publish"><PublishButton /></Can>
 */
export async function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionRequirement;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (await can(permission)) ? children : fallback;
}
