import type { Role } from "@prisma/client";

/**
 * Single source of truth for RBAC. Pure data + pure functions: safe for the
 * Edge middleware, server code and client components alike.
 *
 * | Capability                       | SUPER_ADMIN | VERIFIER | EDITOR | VIEWER |
 * | -------------------------------- | ----------- | -------- | ------ | ------ |
 * | Dashboard KPIs                   | ✔           | ✔        | ✔      | ✔      |
 * | News / Docs / Profile / Timeline | CRUD+Publish| Read     | CRUD+P | Read   |
 * | Events & attendees               | CRUD+Export | Read     | CRUD+E | Read   |
 * | Member records                   | PII         | PII      | 403    | Aggreg.|
 * | Approve / reject / revision      | ✔           | ✔        | ✗      | ✗      |
 * | Register members at the office   | ✔           | ✔        | ✗      | ✗      |
 * | Admin users & roles              | CRUD        | ✗        | ✗      | ✗      |
 * | Contact inbox (/admin/pesan)     | ✔           | ✔        | ✗      | ✗      |
 * | Audit logs                       | All         | Verif.   | ✗      | All    |
 */
export const PERMISSIONS = [
  "dashboard:view",

  "content:read",
  "content:write",
  "content:publish",

  "events:read",
  "events:write",
  "events:publish",
  "events:export",

  /** Counts and distributions only — no individual records. */
  "members:aggregate",
  /** Individual records (list + detail, non-sensitive fields). */
  "members:read",
  /** Decrypt address, phone and national ID. Always audited. */
  "members:pii",
  "members:verify",
  "members:export",
  /** Enter an application on a member's behalf at the office (four-eyes: someone else verifies it). */
  "members:register",

  /** Contact-form inbox: read messages (names, emails, phones) and change their status. */
  "messages:read",
  "messages:manage",

  "users:manage",

  "audit:read:all",
  "audit:read:verification",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ["SUPER_ADMIN", "VERIFIER", "EDITOR", "VIEWER"] as const satisfies readonly Role[];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set(PERMISSIONS),
  VERIFIER: new Set<Permission>([
    "dashboard:view",
    "content:read",
    "events:read",
    "members:aggregate",
    "members:read",
    "members:pii",
    "members:verify",
    "members:export",
    "members:register",
    "messages:read",
    "messages:manage",
    "audit:read:verification",
  ]),
  EDITOR: new Set<Permission>([
    "dashboard:view",
    "content:read",
    "content:write",
    "content:publish",
    "events:read",
    "events:write",
    "events:publish",
    "events:export",
  ]),
  VIEWER: new Set<Permission>(["dashboard:view", "content:read", "events:read", "members:aggregate", "audit:read:all"]),
};

/** A single permission, or "any of" several (e.g. either audit scope). */
export type PermissionRequirement = Permission | { anyOf: readonly Permission[] };

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].has(permission) : false;
}

export function satisfies(role: Role | null | undefined, requirement: PermissionRequirement): boolean {
  if (typeof requirement === "string") return hasPermission(role, requirement);
  return requirement.anyOf.some((p) => hasPermission(role, p));
}

export function permissionsFor(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => ROLE_PERMISSIONS[role].has(p));
}

export const ROLE_LABELS: Record<Role, { label: string; description: string }> = {
  SUPER_ADMIN: { label: "Super Admin", description: "Full system access, including user management." },
  VERIFIER: { label: "Verifier (Secretariat)", description: "Reviews member and veteran applications." },
  EDITOR: { label: "Editor (Editorial & Programs)", description: "Publishes news, history, leadership and events." },
  VIEWER: { label: "Viewer (Board)", description: "Read-only oversight with aggregated member data." },
};

/* ── Route-level rules (layer 1: middleware) ──────────────────────────────
 * Longest matching prefix wins. Paths not listed under /admin require only a
 * valid session plus `dashboard:view`. */
export const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forbidden"] as const;

const ROUTE_RULES: ReadonlyArray<{ prefix: string; requirement: PermissionRequirement }> = [
  { prefix: "/admin/anggota/baru", requirement: "members:register" },
  { prefix: "/admin/anggota/", requirement: "members:read" }, // record detail pages
  { prefix: "/admin/anggota", requirement: "members:aggregate" },
  { prefix: "/admin/berita", requirement: "content:read" },
  { prefix: "/admin/dokumen", requirement: "content:read" },
  { prefix: "/admin/media", requirement: "content:read" },
  { prefix: "/admin/galeria", requirement: "content:read" },
  { prefix: "/admin/profil", requirement: "content:read" },
  { prefix: "/admin/linimasa", requirement: "content:read" },
  { prefix: "/admin/pengurus", requirement: "content:read" },
  { prefix: "/admin/acara", requirement: "events:read" },
  { prefix: "/admin/users", requirement: "users:manage" },
  { prefix: "/admin/pesan", requirement: "messages:read" },
  { prefix: "/admin/audit-logs", requirement: { anyOf: ["audit:read:all", "audit:read:verification"] } },
  { prefix: "/api/admin/exports/members", requirement: "members:export" },
  { prefix: "/api/admin/exports/events", requirement: "events:export" },
  { prefix: "/api/admin/members/office", requirement: "members:register" },
  { prefix: "/api/admin/members", requirement: "members:read" },
  { prefix: "/api/admin/documents", requirement: "content:read" }, // writes re-checked by withApiAuth("content:write")
  { prefix: "/api/admin/uploads", requirement: "content:write" },
  { prefix: "/api/admin/media", requirement: "content:write" },
  { prefix: "/admin", requirement: "dashboard:view" },
  { prefix: "/api/admin", requirement: "dashboard:view" },
];

const SORTED_RULES = [...ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return pathname.startsWith(prefix) && pathname.length > prefix.length;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some((p) => matchesPrefix(pathname, p));
}

/** Requirement for a protected path, or null if the path is not a protected area. */
export function routeRequirement(pathname: string): PermissionRequirement | null {
  return SORTED_RULES.find((r) => matchesPrefix(pathname, r.prefix))?.requirement ?? null;
}
