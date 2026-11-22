import type { PermissionRequirement } from "@/config/rbac";

/** Backoffice navigation. Items are shown only to roles that satisfy `requires` (RBAC layer 3). */
export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "dashboard", requires: "dashboard:view" },
  { href: "/admin/anggota", label: "Members & veterans", icon: "members", requires: "members:aggregate" },
  { href: "/admin/berita", label: "News", icon: "news", requires: "content:read" },
  { href: "/admin/acara", label: "Events", icon: "events", requires: "events:read" },
  { href: "/admin/linimasa", label: "Timeline", icon: "timeline", requires: "content:read" },
  { href: "/admin/pengurus", label: "Leadership", icon: "leadership", requires: "content:read" },
  { href: "/admin/profil", label: "Profile pages", icon: "profile", requires: "content:read" },
  { href: "/admin/users", label: "Users & roles", icon: "users", requires: "users:manage" },
  {
    href: "/admin/audit-logs",
    label: "Audit log",
    icon: "audit",
    requires: { anyOf: ["audit:read:all", "audit:read:verification"] },
  },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: string; requires: PermissionRequirement }>;

export type AdminNavIcon = (typeof ADMIN_NAV)[number]["icon"];

export function isAdminNavActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
