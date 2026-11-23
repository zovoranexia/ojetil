"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Share an article. Plain links to each network's share page — no third-party
 * scripts, trackers or cookies, nothing extra to download (Low-Data friendly).
 * On phones that support it, "Share…" opens the system share sheet.
 */
const NETWORKS = [
  { key: "whatsapp", name: "WhatsApp", color: "bg-[#25D366] text-white", href: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { key: "facebook", name: "Facebook", color: "bg-[#1877F2] text-white", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { key: "x", name: "X", color: "bg-ink text-paper", href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "telegram", name: "Telegram", color: "bg-[#229ED9] text-white", href: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "linkedin", name: "LinkedIn", color: "bg-[#0A66C2] text-white", href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
] as const;

const pill = "inline-flex min-h-tap items-center gap-1.5 rounded-control px-3 text-sm font-semibold transition-opacity hover:opacity-90 md:min-h-9";

/**
 * tone "brand" uses each network's colour; "neutral" is a quiet outline style
 * that sits better inside an editorial page.
 */
export function ShareButtons({ url, title, className, tone = "brand" }: { url: string; title: string; className?: string; tone?: "brand" | "neutral" }) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  /** Clipboard API first; then the classic hidden-textarea copy (http pages, older Android WebViews); last resort a prompt. */
  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (!ok) {
      window.prompt(t("copyLink"), url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-sm font-semibold text-ink-secondary">{t("label")}</span>
      <ul className="flex flex-wrap gap-2">
        {NETWORKS.map((n) => (
          <li key={n.key}>
            <a href={n.href(url, title)} target="_blank" rel="noopener noreferrer nofollow" className={cn(pill, tone === "brand" ? n.color : "border border-border-subtle bg-surface-card text-ink hover:border-border-strong hover:opacity-100")} aria-label={t("on", { network: n.name })}>
              {n.name}
            </a>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => void copy()} className={cn(pill, "border border-border-subtle bg-surface-card text-ink hover:border-border-strong")}>
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
            {copied ? t("copied") : t("copyLink")}
          </button>
        </li>
        {canNativeShare ? (
          <li>
            <button
              type="button"
              onClick={() => void navigator.share({ title, url }).catch(() => undefined)}
              className={cn(pill, "border border-border-subtle bg-surface-card text-ink hover:border-border-strong")}
            >
              <Share2 aria-hidden="true" className="size-4" /> {t("more")}
            </button>
          </li>
        ) : null}
      </ul>
      <span aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </div>
  );
}
