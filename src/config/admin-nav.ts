import type { PermissionRequirement } from "@/config/rbac";

/**
 * Backoffice navigation. Items are shown only to roles that satisfy `requires` (RBAC layer 3).
 * `label` is a key under messages `admin.nav`.
 */
export const ADMIN_NAV = [
  { href: "/admin", label: "overview", icon: "dashboard", requires: "dashboard:view" },
  { href: "/admin/anggota", label: "members", icon: "members", requires: "members:aggregate" },
  { href: "/admin/berita", label: "news", icon: "news", requires: "content:read" },
  { href: "/admin/dokumen", label: "documents", icon: "documents", requires: "content:read" },
  { href: "/admin/media", label: "media", icon: "media", requires: "content:read" },
  { href: "/admin/acara", label: "events", icon: "events", requires: "events:read" },
  { href: "/admin/linimasa", label: "timeline", icon: "timeline", requires: "content:read" },
  { href: "/admin/pengurus", label: "leadership", icon: "leadership", requires: "content:read" },
  { href: "/admin/profil", label: "profilePages", icon: "profile", requires: "content:read" },
  { href: "/admin/users", label: "users", icon: "users", requires: "users:manage" },
  {
    href: "/admin/audit-logs",
    label: "audit",
    icon: "audit",
    requires: { anyOf: ["audit:read:all", "audit:read:verification"] },
  },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: string; requires: PermissionRequirement }>;

export type AdminNavIcon = (typeof ADMIN_NAV)[number]["icon"];

export function isAdminNavActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
