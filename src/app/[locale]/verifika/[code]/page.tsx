import type { Metadata } from "next";
import { BadgeCheck, ShieldX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/brand/emblem";
import { municipalityLabel } from "@/config/municipalities";
import { siteConfig } from "@/config/site";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { formatDate } from "@/lib/format";
import { verifyMember } from "@/modules/members/card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "memberVerify" });
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * Public card verification (the card's QR code). Checks the live status every
 * time, so a membership that is later revoked stops verifying. Shows only what
 * is already printed on the card — no photo, contact or ID data.
 */
export default async function VerifyMemberPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const locale = await getPageLocale(params);
  const { code } = await params;
  const [t, tCat] = await Promise.all([getTranslations("memberVerify"), getTranslations("statusLookup.categories")]);
  const result = await verifyMember(code);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 md:py-16">
      <div className="mb-6 flex items-center gap-3">
        <Emblem size={44} />
        <div>
          <p className="font-serif text-xl font-bold">{siteConfig.shortName}</p>
          <p className="text-xs text-ink-secondary">{t("eyebrow")}</p>
        </div>
      </div>

      {result.valid ? (
        <section aria-labelledby="verify-title" className="overflow-hidden rounded-card border border-status-verified/30 bg-surface-card">
          <div className="flex items-center gap-3 bg-status-verified-bg p-5 text-status-verified">
            <BadgeCheck aria-hidden="true" className="size-8 shrink-0" />
            <div>
              <h1 id="verify-title" className="font-sans text-lg font-bold">
                {t("validTitle")}
              </h1>
              <p className="text-sm">{t("validBody", { org: siteConfig.shortName })}</p>
            </div>
          </div>
          <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-ink-secondary">{t("name")}</dt>
              <dd className="mt-0.5 font-serif text-xl font-semibold">{result.fullName}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">{t("number")}</dt>
              <dd className="tracking-code mt-0.5 font-semibold">{result.trackingCode}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">{t("category")}</dt>
              <dd className="mt-0.5 font-medium">{tCat(result.category)}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">{t("municipality")}</dt>
              <dd className="mt-0.5 font-medium">{municipalityLabel(result.municipality)}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">{t("since")}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{formatDate(result.verifiedAt, locale)}</dd>
            </div>
          </dl>
          <p className="border-t border-border-subtle px-5 py-3 text-xs text-ink-secondary">{t("checkedAt", { date: formatDate(new Date(), locale) })}</p>
        </section>
      ) : (
        <section aria-labelledby="verify-title" role="alert" className="flex gap-3 rounded-card border border-status-rejected/30 bg-status-rejected-bg p-5 text-status-rejected">
          <ShieldX aria-hidden="true" className="size-8 shrink-0" />
          <div>
            <h1 id="verify-title" className="font-sans text-lg font-bold">
              {t("invalidTitle")}
            </h1>
            <p className="mt-1 text-sm text-ink">{result.reason === "revoked" ? t("revokedBody") : t("invalidBody")}</p>
            <p className="mt-2 text-sm text-ink">{t("contact", { email: siteConfig.contact.email })}</p>
          </div>
        </section>
      )}
    </div>
  );
}
