"use client";

import type { Role } from "@prisma/client";
import { createContext, useContext, type ReactNode } from "react";
import { satisfies, type PermissionRequirement } from "@/config/rbac";

/**
 * Layer 3 (Client Components): the admin layout passes the server-verified
 * role down once; client components ask `useCan(...)` to decide what to show.
 */
const RoleContext = createContext<Role | null>(null);

export function PermissionsProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): Role | null {
  return useContext(RoleContext);
}

export function useCan(requirement: PermissionRequirement): boolean {
  return satisfies(useContext(RoleContext), requirement);
}

export function ClientCan({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionRequirement;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
