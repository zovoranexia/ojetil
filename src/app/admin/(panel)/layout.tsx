import { ExternalLink, Palette } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { requirePageAccess } from "@/lib/security/guards";

/**
 * Backoffice shell: dark sidebar (lg+) or slide-down menu (below lg), and the
 * top bar with scope, language, theme and the account menu (name, email, role,
 * change password, sign out). Every page below also runs its own permission
 * guard; this layout only requires a valid session with dashboard access.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const [user, t] = await Promise.all([requirePageAccess("dashboard:view", "/admin"), getTranslations("admin.shell")]);

  const footer = (
    <div className="flex flex-col gap-0.5 px-1 text-xs">
      <Link href="/" className="inline-flex min-h-8 items-center gap-2 text-paper/70 hover:text-paper">
        <ExternalLink aria-hidden="true" className="size-3.5" /> {t("viewPublicSite")}
      </Link>
      <Link href="/admin/design-system" className="inline-flex min-h-8 items-center gap-2 text-paper/70 hover:text-paper">
        <Palette aria-hidden="true" className="size-3.5" /> {t("designSystem")}
      </Link>
    </div>
  );

  const mobileLeading = (
    <div className="flex items-center gap-1 lg:hidden">
      <AdminSidebar footer={footer} variant="mobile" />
      <Link href="/admin" className="flex items-center gap-2 pr-2" aria-label={t("home")}>
        <Emblem size={30} />
        <span className="hidden font-serif text-base font-bold text-ink min-[400px]:inline">OJETIL</span>
      </Link>
    </div>
  );

  return (
    <PermissionsProvider role={user.role}>
      <div className="flex min-h-dvh flex-col bg-surface-card">
        <TaisRibbon />
        <div className="flex flex-1">
          <div className="ink-chrome hidden lg:flex lg:flex-col">
            <Link href="/admin" className="flex items-center gap-3 bg-brand-deep px-6 pb-2 pt-5 text-paper">
              <Emblem size={36} />
              <span>
                <span className="block font-serif text-lg font-bold leading-none">OJETIL</span>
                <span className="text-xs text-paper/60">{t("backoffice")}</span>
              </span>
            </Link>
            <div className="flex flex-1">
              <AdminSidebar footer={footer} variant="desktop" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar user={{ name: user.name, email: user.email, role: user.role }} leading={mobileLeading} />
            <main id="main" className="min-w-0 flex-1 bg-paper/40">
              <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </PermissionsProvider>
  );
}
