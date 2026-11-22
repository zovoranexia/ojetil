"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CHECK_STATUS_PATH, PRIMARY_NAV, REGISTER_PATH, isActivePath } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Desktop inline navigation + collapsible mobile menu (disclosure pattern). */
export function MainNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = "mobile-menu";

  // Close when the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav aria-label={t("primary")} className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-tap items-center px-3 text-[0.9375rem] font-medium transition-colors",
                    active ? "text-ojetil-red" : "text-ink hover:text-ojetil-red",
                  )}
                >
                  {t(item.key)}
                  {active ? <span aria-hidden="true" className="absolute inset-x-3 bottom-1.5 h-0.5 bg-ojetil-red" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href={REGISTER_PATH}>{t("register")}</Link>
        </Button>
        <button
          ref={buttonRef}
          type="button"
          className="inline-flex size-tap items-center justify-center rounded-control text-ink hover:bg-surface-muted lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
          <span className="sr-only">{open ? t("closeMenu") : t("openMenu")}</span>
        </button>
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b border-border-subtle bg-surface-card shadow-[0_12px_24px_-12px_rgb(24_24_27/0.25)] lg:hidden"
      >
        <nav aria-label={t("primary")} className="mx-auto max-w-6xl px-4 py-3">
          <ul className="divide-y divide-border-subtle">
            {PRIMARY_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center justify-between text-base font-medium",
                      active ? "text-ojetil-red" : "text-ink",
                    )}
                  >
                    {t(item.key)}
                    {active ? <span aria-hidden="true" className="size-2 rounded-full bg-ojetil-red" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid gap-2 pb-2 sm:grid-cols-2">
            <Button asChild>
              <Link href={REGISTER_PATH}>{t("register")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={CHECK_STATUS_PATH}>{t("checkStatus")}</Link>
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
