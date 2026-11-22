"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  BANDWIDTH_COOKIE,
  BANDWIDTH_COOKIE_MAX_AGE,
  BANDWIDTH_STORAGE_KEY,
  type BandwidthMode,
} from "@/config/bandwidth";
import { cn } from "@/lib/utils";

function persist(mode: BandwidthMode) {
  document.cookie = `${BANDWIDTH_COOKIE}=${mode}; Path=/; Max-Age=${BANDWIDTH_COOKIE_MAX_AGE}; SameSite=Lax`;
  try {
    localStorage.setItem(BANDWIDTH_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable (private mode) — the cookie is enough */
  }
  document.documentElement.dataset.bandwidth = mode;
}

/**
 * Persistent Low-Data Mode switch. Fonts switch instantly via the html
 * attribute; the server re-renders without images on refresh.
 */
export function LowDataToggle({ initialMode }: { initialMode: BandwidthMode }) {
  const t = useTranslations("lowData");
  const router = useRouter();
  const [mode, setMode] = useState<BandwidthMode>(initialMode);
  const [pending, startTransition] = useTransition();

  // If the cookie was cleared but the device remembers the choice, restore it.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BANDWIDTH_STORAGE_KEY);
      if (stored === "low" && initialMode !== "low") {
        persist("low");
        setMode("low");
        startTransition(() => router.refresh());
      }
    } catch {
      /* ignore */
    }
  }, [initialMode, router]);

  const on = mode === "low";

  function toggle() {
    const next: BandwidthMode = on ? "normal" : "low";
    persist(next);
    setMode(next);
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-busy={pending}
      onClick={toggle}
      title={t("description")}
      className="group inline-flex min-h-tap items-center gap-2 rounded-control px-1.5 text-[0.8125rem] font-medium text-paper/85 hover:text-paper"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          on ? "border-gold-accent bg-gold-accent" : "border-paper/40 bg-transparent",
        )}
      >
        <span
          className={cn(
            "absolute size-3.5 rounded-full transition-transform",
            on ? "translate-x-[18px] bg-ink" : "translate-x-[2px] bg-paper/80",
          )}
        />
      </span>
      <span className="sm:hidden">{t("short")}</span>
      <span className="hidden sm:inline">{t("label")}</span>
      <span className="sr-only">
        {" "}
        — {on ? t("on") : t("off")}. {t("description")}
      </span>
    </button>
  );
}
