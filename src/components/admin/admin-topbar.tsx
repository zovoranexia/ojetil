"use client";

import type { Role } from "@prisma/client";
import { Check, ChevronDown, Globe, KeyRound, Loader2, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { onMenuKeyDown, usePopover } from "@/components/admin/use-popover";
import { ADMIN_THEME_COOKIE, PREFERENCE_COOKIE_MAX_AGE, type AdminTheme } from "@/config/admin-preferences";
import { LOCALES, LOCALE_META, type AppLocale } from "@/config/locales";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/actions";
import { setAdminLocaleAction } from "@/modules/users/preferences-actions";

export interface TopbarUser {
  name: string;
  email: string;
  role: Role;
}

const menuPanel =
  "absolute right-0 top-full z-50 mt-2 min-w-56 rounded-card border border-border-subtle bg-surface-card p-1 text-ink shadow-lg";
const menuItem =
  "flex min-h-tap w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-medium text-ink outline-none hover:bg-surface-muted focus-visible:bg-surface-muted md:min-h-9";
const barButton =
  "inline-flex min-h-tap items-center gap-2 rounded-control px-2.5 text-ink hover:bg-surface-muted aria-expanded:bg-surface-muted md:min-h-10";

/**
 * Backoffice top bar: access scope on the left; language, theme and the account
 * menu on the right. `leading` holds the mobile menu button + logo (below lg).
 */
export function AdminTopbar({ user, leading }: { user: TopbarUser; leading?: ReactNode }) {
  const t = useTranslations("admin");
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-card px-2 sm:px-4 md:h-16 lg:px-8">
      {leading}
      <p className="hidden min-w-0 items-center gap-1.5 truncate text-sm text-ink-secondary sm:flex">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">{t("topbar.scope")}: </span>
        <span className="truncate">{t(`roles.${user.role}.short`)}</span>
      </p>
      <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
        <LanguageMenu />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

/** Globe + language name + chevron. Native language names, so anyone can find their own. */
export function LanguageMenu({ className }: { className?: string }) {
  const t = useTranslations("admin.topbar");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { open, close, rootRef, triggerRef, menuId, triggerProps } = usePopover();

  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [open, rootRef]);

  function choose(next: AppLocale) {
    close(true);
    if (next === locale) return;
    startTransition(async () => {
      await setAdminLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button ref={triggerRef} type="button" {...triggerProps} aria-label={t("language")} className={barButton} aria-busy={pending}>
        {pending ? <Loader2 aria-hidden="true" className="size-[18px] animate-spin" /> : <Globe aria-hidden="true" className="size-[18px] text-ink-secondary" />}
        <span className="hidden text-sm font-medium md:inline">{LOCALE_META[locale].nativeName}</span>
        <span className="text-sm font-semibold md:hidden">{LOCALE_META[locale].short}</span>
        <ChevronDown aria-hidden="true" className={cn("size-4 text-ink-secondary transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={t("language")} className={menuPanel} onKeyDown={onMenuKeyDown}>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              lang={l}
              onClick={() => choose(l)}
              className={menuItem}
            >
              <span className="flex-1">{LOCALE_META[l].nativeName}</span>
              <span className="text-xs text-ink-secondary">{LOCALE_META[l].short}</span>
              <Check aria-hidden="true" className={cn("size-4 text-ojetil-red", l !== locale && "invisible")} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Light/dark toggle. Both icons are rendered and CSS picks one, so the server
 * HTML is right even when the theme comes from the OS (no hydration flash).
 */
function ThemeToggle() {
  const t = useTranslations("admin.topbar");
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next: AdminTheme = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    root.dataset.themePref = next;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${ADMIN_THEME_COOKIE}=${next}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark ?? undefined}
      title={isDark ? t("lightMode") : t("darkMode")}
      className={cn(barButton, "w-tap justify-center px-0 md:w-10")}
    >
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
      <span className="sr-only">{t("darkMode")}</span>
    </button>
  );
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]![0], words[1]![0]] : [...(words[0] ?? "?").slice(0, 2)];
  return letters.join("").toLocaleUpperCase();
}

function UserMenu({ user }: { user: TopbarUser }) {
  const t = useTranslations("admin");
  const { open, close, rootRef, triggerRef, menuId, triggerProps } = usePopover();

  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, rootRef]);

  return (
    <div ref={rootRef} className="relative">
      <button ref={triggerRef} type="button" {...triggerProps} aria-label={t("topbar.accountMenu")} className={cn(barButton, "gap-2.5 pl-1 sm:pr-3")}>
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ojetil-red text-sm font-bold tracking-wide text-white"
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden max-w-48 truncate text-[0.9375rem] font-semibold sm:inline">{user.name}</span>
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={t("topbar.accountMenu")} className={cn(menuPanel, "w-72")} onKeyDown={onMenuKeyDown}>
          <div className="border-b border-border-subtle px-3 pb-3 pt-2">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-ink-secondary">{user.email}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-control bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-ink">
              <span className="sr-only">{t("topbar.role")}: </span>
              {t(`roles.${user.role}.label`)}
            </p>
          </div>
          <div className="pt-1">
            <Link href="/admin/akun/password" role="menuitem" className={menuItem} onClick={() => close()}>
              <KeyRound aria-hidden="true" className="size-4 text-ink-secondary" /> {t("topbar.changePassword")}
            </Link>
            <form action={logoutAction}>
              <button type="submit" role="menuitem" className={cn(menuItem, "text-status-rejected")}>
                <LogOut aria-hidden="true" className="size-4" /> {t("topbar.signOut")}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
