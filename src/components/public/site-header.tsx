import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import type { BandwidthMode } from "@/config/bandwidth";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { LowDataToggle } from "./low-data-toggle";
import { MainNav } from "./main-nav";

/**
 * Public header:
 *   ▔▔ Tais ribbon (4px)
 *   ■ utility bar (ink): Low-Data toggle · TET | PT | ID | EN   ← always visible, also on mobile
 *   □ main bar (white): emblem + name · nav · Register / menu
 */
export async function SiteHeader({ bandwidth }: { bandwidth: BandwidthMode }) {
  const t = await getTranslations("nav");

  return (
    <header className="relative z-30">
      <TaisRibbon />
      <div className="bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-2 sm:px-4 md:px-8">
          <LowDataToggle initialMode={bandwidth} />
          <LanguageSwitcher />
        </div>
      </div>
      <div className="relative border-b border-border-subtle bg-surface-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-8">
          <Link href="/" className="flex min-h-tap items-center gap-3" aria-label={t("homeLink")}>
            <Emblem size={44} priority />
            <span className="flex flex-col">
              <span className="font-serif text-xl font-bold leading-none text-ink">{siteConfig.shortName}</span>
              <span className="mt-0.5 hidden text-xs text-ink-secondary sm:block">{siteConfig.motto}</span>
            </span>
          </Link>
          <MainNav />
        </div>
      </div>
    </header>
  );
}
