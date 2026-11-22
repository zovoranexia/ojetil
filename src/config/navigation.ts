/** Public navigation. Paths are locale-agnostic; next-intl adds the prefix. */
export const PRIMARY_NAV = [
  { href: "/", key: "home" },
  { href: "/kona-ba", key: "about" },
  { href: "/istoria", key: "history" },
  { href: "/notisia", key: "news" },
  { href: "/edukasaun/acara", key: "events" },
  { href: "/dokumentu", key: "documents" },
] as const;

export const REGISTER_PATH = "/komunidade/registrasi";
export const CHECK_STATUS_PATH = "/komunidade/cek-status";
export const CONTACT_PATH = "/kontaktu";

export type NavKey = (typeof PRIMARY_NAV)[number]["key"];

/** True when `pathname` is inside the section `href` (home matches only exactly). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
