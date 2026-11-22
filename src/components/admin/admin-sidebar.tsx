"use client";

import {
  CalendarDays,
  FileDown,
  FileText,
  History,
  Images,
  LayoutDashboard,
  Menu,
  Newspaper,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ADMIN_NAV, isAdminNavActive, type AdminNavIcon } from "@/config/admin-nav";
import { satisfies } from "@/config/rbac";
import { cn } from "@/lib/utils";
import { useRole } from "@/components/auth/permissions-provider";

const ICONS: Record<AdminNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: Users,
  news: Newspaper,
  documents: FileDown,
  media: Images,
  events: CalendarDays,
  timeline: History,
  leadership: ShieldCheck,
  profile: FileText,
  users: UserCog,
  audit: ScrollText,
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useRole();
  const t = useTranslations("admin.nav");
  return (
    <ul className="space-y-0.5">
      {ADMIN_NAV.filter((item) => satisfies(role, item.requires)).map((item) => {
        const Icon = ICONS[item.icon];
        const active = isAdminNavActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-tap items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors md:min-h-10",
                active ? "bg-paper/10 text-gold-accent" : "text-paper/80 hover:bg-paper/5 hover:text-paper",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {t(item.label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** `desktop`: fixed sidebar (lg+). `mobile`: menu button (in the top bar) with a slide-down panel (below lg). */
export function AdminSidebar({ footer, variant }: { footer: React.ReactNode; variant: "desktop" | "mobile" }) {
  const t = useTranslations("admin.shell");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  if (variant === "desktop") {
    return (
      <aside className="flex w-60 shrink-0 flex-col bg-ink px-3 py-5">
        <nav aria-label={t("navLabel")} className="flex-1">
          <NavList />
        </nav>
        <div className="border-t border-paper/10 pt-4">{footer}</div>
      </aside>
    );
  }

  return (
      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-tap items-center justify-center rounded-control text-ink hover:bg-surface-muted"
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          <span className="sr-only">{open ? t("closeMenu") : t("openMenu")}</span>
        </button>
        <div id="admin-mobile-nav" hidden={!open} className="ink-chrome absolute inset-x-0 top-full z-40 bg-ink px-3 pb-4 pt-2 shadow-lg">
          <nav aria-label={t("navLabel")}>
            <NavList onNavigate={() => setOpen(false)} />
          </nav>
          <div className="mt-3 border-t border-paper/10 pt-3">{footer}</div>
        </div>
      </div>
  );
}
