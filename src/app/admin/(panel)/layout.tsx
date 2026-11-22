import { LogOut } from "lucide-react";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { ROLE_LABELS } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { logoutAction } from "@/modules/auth/actions";

/**
 * Backoffice shell. Every page below also runs its own permission guard;
 * this layout only requires a valid session with dashboard access.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageAccess("dashboard:view", "/admin");

  const footer = (
    <div className="space-y-3 px-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-paper">{user.name}</p>
        <p className="truncate text-xs text-paper/60">{user.email}</p>
        <p className="mt-1 inline-block rounded-control bg-paper/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-gold-accent">
          {ROLE_LABELS[user.role].label}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <Link href="/" className="inline-flex min-h-8 items-center text-paper/70 hover:text-paper">
          View public site
        </Link>
        <Link href="/admin/design-system" className="inline-flex min-h-8 items-center text-paper/70 hover:text-paper">
          Design system
        </Link>
        <Link href="/admin/akun/password" className="inline-flex min-h-8 items-center text-paper/70 hover:text-paper">
          Change my password
        </Link>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex min-h-tap w-full items-center gap-2 rounded-control px-2 text-sm font-medium text-paper/80 hover:bg-paper/10 hover:text-paper md:min-h-9"
        >
          <LogOut aria-hidden="true" className="size-4" /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <PermissionsProvider role={user.role}>
      <div className="flex min-h-dvh flex-col bg-surface-card">
        <TaisRibbon />
        <header className="relative flex items-center justify-between gap-3 bg-ink px-3 py-2 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2 text-paper">
            <Emblem size={32} />
            <span className="font-serif text-lg font-bold">Backoffice</span>
          </Link>
          <AdminSidebar footer={footer} variant="mobile" />
        </header>
        <div className="flex flex-1">
          <div className="hidden lg:flex lg:flex-col">
            <Link href="/admin" className="flex items-center gap-3 bg-ink px-6 pb-2 pt-5 text-paper">
              <Emblem size={36} />
              <span>
                <span className="block font-serif text-lg font-bold leading-none">OJETIL</span>
                <span className="text-xs text-paper/60">Backoffice</span>
              </span>
            </Link>
            <div className="flex flex-1">
              <AdminSidebar footer={footer} variant="desktop" />
            </div>
          </div>
          <main id="main" className="min-w-0 flex-1 bg-paper/40">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
