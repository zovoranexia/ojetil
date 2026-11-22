import { User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import type { AppLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { siteConfig } from "@/config/site";
import { formatDate } from "@/lib/format";
import type { MemberCardData } from "@/modules/members/card";

/**
 * The digital member card (ID-1 / credit-card proportions, 85.6 × 54 mm).
 * Prints at true size; on screen it scales to the container width.
 * The QR code opens the public verification page.
 */
export async function MemberCard({ card, photoSrc, locale }: { card: MemberCardData; photoSrc: string | null; locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "memberCard" });
  const tCat = await getTranslations({ locale, namespace: "statusLookup.categories" });

  return (
    <article
      aria-label={t("cardLabel", { name: card.fullName })}
      className="member-card @container relative mx-auto flex aspect-[85.6/54] w-full max-w-[34rem] flex-col overflow-hidden rounded-[1.1rem] border border-border-subtle bg-white text-ink shadow-[0_12px_32px_rgb(24_24_27/0.14)] print:w-[85.6mm] print:max-w-none print:rounded-[3mm] print:shadow-none"
    >
      {/* Header band */}
      <div className="flex items-center gap-[3%] bg-ink px-[4.5%] py-[2.6%] text-paper">
        <Emblem size={44} className="size-[9cqw] min-w-0 shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="font-serif text-[clamp(0.85rem,3.9cqw,1.35rem)] font-bold">{siteConfig.shortName}</p>
          <p className="truncate text-[clamp(0.5rem,1.9cqw,0.7rem)] text-paper/75">{siteConfig.fullName}</p>
        </div>
        <p className="ml-auto shrink-0 text-right text-[clamp(0.5rem,2cqw,0.75rem)] font-semibold uppercase tracking-[0.14em] text-gold-accent">{t("cardTitle")}</p>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-[4%] px-[4.5%] py-[3.5%]">
        <div className="aspect-[3/4] h-full shrink-0 overflow-hidden rounded-[0.4rem] bg-surface-muted">
          {photoSrc ? (
            // Decrypted on request for this card only; never cached or optimised by Next.js.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt={t("photoAlt", { name: card.fullName })} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-ink-secondary/60">
              <User aria-hidden="true" className="size-1/2" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-serif text-[clamp(0.8rem,3.9cqw,1.35rem)] font-bold leading-tight">{card.fullName}</p>
          <p className="mt-[0.25em] text-[clamp(0.5rem,2.1cqw,0.8rem)] font-semibold text-gold-text">
            <span className="sr-only">{t("category")}: </span>
            {tCat(card.category)}
          </p>
          <dl className="mt-auto grid grid-cols-2 gap-x-[6%] text-[clamp(0.5rem,2.05cqw,0.8rem)]">
            <div className="min-w-0">
              <dt className="text-[0.8em] uppercase tracking-wide text-ink-secondary">{t("municipality")}</dt>
              <dd className="truncate font-semibold">{municipalityLabel(card.municipality)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[0.8em] uppercase tracking-wide text-ink-secondary">{t("since")}</dt>
              <dd className="font-semibold tabular-nums">{formatDate(card.verifiedAt, locale)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-between gap-[0.4em]">
          <div
            role="img"
            aria-label={t("qrAlt")}
            className="aspect-square w-[18cqw] rounded-[0.3rem] border border-border-subtle bg-white p-[0.8cqw] [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: card.qrSvg }}
          />
          <div className="text-center leading-tight">
            <p className="text-[clamp(0.4rem,1.5cqw,0.6rem)] uppercase tracking-wide text-ink-secondary">{t("number")}</p>
            <p className="tracking-code whitespace-nowrap text-[clamp(0.5rem,2.2cqw,0.85rem)] font-bold text-ojetil-red">{card.trackingCode}</p>
          </div>
        </div>
      </div>

      <TaisRibbon />
    </article>
  );
}
