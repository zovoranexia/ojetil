import { Globe, Mail, MapPin, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { siteConfig } from "@/config/site";
import { formatDate } from "@/lib/format";
import { siteOrigin } from "@/lib/site-url";
import type { MemberCardData } from "@/modules/members/card";

/*
 * Digital member card, front and back, in portrait ID-1 proportions
 * (54 × 85.6 mm). The design follows the OJETIL flag: black (with the star),
 * yellow and red on the hoist side; blue, white and green on the fly side.
 * Every size is in container units (cqw), so the card scales with its width
 * on screen and prints at true size.
 */

const FLAG = { black: "#141414", blue: "#2b7de9", yellow: "#f7d417", white: "#ffffff", red: "#e2231a", green: "#1e5b2f" };

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#fff" d="M12 1.8l2.9 6.9 7.4.6-5.6 4.9 1.7 7.3L12 17.6l-6.4 3.9 1.7-7.3L1.7 9.3l7.4-.6z" />
    </svg>
  );
}

/** Black · yellow · red · green · blue rule under titles. */
function ColorRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex h-[1.1cqw] overflow-hidden ${className ?? ""}`}>
      {[FLAG.black, FLAG.yellow, FLAG.red, FLAG.green, FLAG.blue].map((c) => (
        <span key={c} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/** Blue / yellow / red waves rising into the green footer band. */
function Waves() {
  return (
    <svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true" className="block h-[11cqw] w-full">
      <path d="M0 9 C30 1 60 1 100 8 L100 22 L0 22 Z" fill={FLAG.blue} />
      <path d="M0 12 C30 4 62 4 100 11 L100 22 L0 22 Z" fill={FLAG.yellow} />
      <path d="M0 15 C32 7 64 7 100 14 L100 22 L0 22 Z" fill={FLAG.red} />
      <path d="M0 18 C34 10 66 10 100 17 L100 22 L0 22 Z" fill={FLAG.green} />
    </svg>
  );
}

const cardShell =
  "@container relative flex aspect-[54/85.6] w-full flex-col overflow-hidden rounded-[4.5cqw] border border-black/10 bg-white text-[#141414] shadow-[0_14px_36px_rgb(24_24_27/0.18)] print:w-[54mm] print:rounded-[3mm] print:shadow-none";

export async function MemberCard({ card, photoSrc, locale }: { card: MemberCardData; photoSrc: string | null; locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "memberCard" });
  const tCat = await getTranslations({ locale, namespace: "statusLookup.categories" });
  const website = siteOrigin().replace(/^https?:\/\//, "");

  return (
    <div className="member-card mx-auto grid max-w-[46rem] gap-6 sm:grid-cols-2 print:flex print:max-w-none print:gap-[6mm]">
      {/* ── Front ───────────────────────────────────────────────────── */}
      <article aria-label={t("cardLabel", { name: card.fullName })} className={cardShell}>
        {/* Flag header */}
        <div className="relative grid h-[42cqw] shrink-0 grid-cols-[42%_58%] grid-rows-3">
          <div className="relative" style={{ background: FLAG.black }}>
            <Star className="absolute left-[16cqw] top-1/2 size-[8cqw] -translate-y-1/2" />
          </div>
          <div style={{ background: FLAG.blue }} />
          <div style={{ background: FLAG.yellow }} />
          <div className="flex items-center justify-center" style={{ background: FLAG.white }}>
            <span className="font-sans text-[11cqw] font-extrabold leading-none tracking-[0.02em]">{siteConfig.shortName}</span>
          </div>
          <div style={{ background: FLAG.red }} />
          <div style={{ background: FLAG.green }} />
          {/* Emblem over the yellow and red bands (transparent cut-out of the official emblem). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, printed */}
          <img src="/brand/ojetil-emblem-transparent.webp" alt={siteConfig.emblemAlt} className="absolute left-[5cqw] top-[12.5cqw] size-[29cqw] drop-shadow-[0_0.4cqw_0.6cqw_rgb(0_0_0/0.25)]" />
        </div>

        <p className="px-[5cqw] pt-[2.4cqw] text-center text-[3.1cqw] font-bold uppercase leading-[1.2]">{siteConfig.fullName}</p>

        {/* Photo + category */}
        <div className="mt-[3cqw] flex gap-[4cqw] px-[6cqw]">
          <div className="aspect-[4/5] w-[38cqw] shrink-0 overflow-hidden rounded-[2.2cqw]" style={{ background: "#c8231c" }}>
            {photoSrc ? (
              // Decrypted on request for this card only; never cached or optimised by Next.js.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc} alt={t("photoAlt", { name: card.fullName })} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-white/70">
                <User aria-hidden="true" className="size-1/2" strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center text-center">
            <p className="text-[4.4cqw] font-extrabold uppercase leading-[1.1]" style={{ color: FLAG.green }}>
              <span className="sr-only">{t("category")}: </span>
              {tCat(card.category)}
            </p>
            <ColorRule className="mx-auto mt-[2cqw] w-[90%]" />
            <p className="mt-[2.4cqw] font-serif text-[4.2cqw] italic leading-tight">“{siteConfig.motto}”</p>
          </div>
        </div>

        {/* Name */}
        <p className="mx-[6cqw] mt-[3cqw] border-b-[0.5cqw] pb-[1cqw] text-center font-sans text-[5.2cqw] font-extrabold leading-[1.15]" style={{ borderColor: FLAG.green }}>
          {card.fullName}
        </p>

        {/* Details + QR */}
        <div className="relative z-10 mt-[2.6cqw] flex items-start gap-[3cqw] px-[7cqw]">
          <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-[2cqw] gap-y-[0.6cqw] text-[3.2cqw] leading-tight">
            <dt className="text-[#3f3f46]">{t("number")}</dt>
            <dd className="tracking-code font-bold" style={{ color: FLAG.red }}>
              : {card.trackingCode}
            </dd>
            <dt className="text-[#3f3f46]">{t("since")}</dt>
            <dd className="font-semibold tabular-nums">: {formatDate(card.verifiedAt, locale)}</dd>
            <dt className="text-[#3f3f46]">{t("municipality")}</dt>
            <dd className="truncate font-semibold">: {municipalityLabel(card.municipality)}</dd>
          </dl>
          <div
            role="img"
            aria-label={t("qrAlt")}
            className="aspect-square w-[19cqw] shrink-0 bg-white p-[0.6cqw] [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: card.qrSvg }}
          />
        </div>

        <div className="mt-auto">
          <Waves />
          <p className="-mt-px flex h-[10cqw] items-center justify-center whitespace-nowrap px-[3cqw] text-[2.75cqw] font-semibold uppercase tracking-[0.04em] text-white" style={{ background: FLAG.green }}>
            {t("values")}
          </p>
        </div>
      </article>

      {/* ── Back ────────────────────────────────────────────────────── */}
      <article aria-label={t("backLabel")} className={cardShell}>
        <div className="flex flex-1 flex-col items-center bg-[radial-gradient(120%_70%_at_50%_10%,#e8f1fb_0%,#f6f8fb_55%,#ffffff_100%)] px-[7cqw] pt-[9cqw] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, printed */}
          <img src="/brand/ojetil-emblem-transparent.webp" alt="" className="size-[58cqw]" />
          <p className="mt-[3cqw] font-sans text-[12cqw] font-extrabold leading-none">{siteConfig.shortName}</p>
          <p className="mt-[2cqw] text-[3.6cqw] font-bold uppercase leading-[1.25]">{siteConfig.fullName}</p>
          <ColorRule className="mt-[3.5cqw] w-[72%]" />
          <p className="mt-[3.5cqw] font-serif text-[5cqw] italic">“{siteConfig.motto}”</p>
          <p className="mt-[1cqw] text-[3cqw] font-semibold uppercase tracking-[0.12em] text-[#52525b]">{siteConfig.mottoSubline}</p>
        </div>
        <Waves />
        <div className="grid h-[30cqw] grid-cols-[1fr_auto_1fr] items-center gap-[3cqw] px-[6cqw] text-white" style={{ background: FLAG.green }}>
          <ul className="min-w-0 space-y-[1.6cqw] text-[3cqw]">
            <li className="flex items-center gap-[1.8cqw]">
              <MapPin aria-hidden="true" className="size-[3.8cqw] shrink-0" /> {siteConfig.headquarters.country}
            </li>
            <li className="flex min-w-0 items-center gap-[1.8cqw]">
              <Mail aria-hidden="true" className="size-[3.8cqw] shrink-0" /> <span className="truncate">{siteConfig.contact.email}</span>
            </li>
            <li className="flex min-w-0 items-center gap-[1.8cqw]">
              <Globe aria-hidden="true" className="size-[3.8cqw] shrink-0" /> <span className="truncate">{website}</span>
            </li>
          </ul>
          <span aria-hidden="true" className="h-[70%] w-px bg-white/60" />
          <p className="text-center text-[3.2cqw] font-bold uppercase leading-[1.35]">
            {t("values")
              .split("•")
              .map((v) => v.trim())
              .map((v) => (
                <span key={v} className="block">
                  {v}
                </span>
              ))}
          </p>
        </div>
      </article>
    </div>
  );
}
