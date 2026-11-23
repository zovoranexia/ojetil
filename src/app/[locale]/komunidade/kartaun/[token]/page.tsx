import type { Metadata } from "next";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CardPrintStyles } from "@/components/members/card-print-styles";
import { MemberCard } from "@/components/members/member-card";
import { CardPrintActions } from "@/components/members/card-print-actions";
import { PageHeader } from "@/components/public/page-header";
import { CHECK_STATUS_PATH } from "@/config/navigation";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { Link } from "@/i18n/navigation";
import { getMemberCard, readCardAccessToken } from "@/modules/members/card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "memberCard" });
  // Personal page behind a short-lived link: never indexed, never sent as a Referer.
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function MemberCardPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await getPageLocale(params);
  const { token } = await params;
  const t = await getTranslations("memberCard");
  const id = readCardAccessToken(token);
  const card = id ? await getMemberCard(id) : null;

  if (!card) {
    return (
      <>
        <PageHeader eyebrow={t("eyebrow")} title={t("metaTitle")} />
        <div className="mx-auto max-w-xl px-4 py-10 md:px-8">
          <div role="alert" className="flex gap-3 rounded-card border border-status-rejected/25 bg-status-rejected-bg p-5 text-status-rejected">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{t("expiredTitle")}</p>
              <p className="mt-1 text-sm text-ink">{t("expiredBody")}</p>
              <Link href={CHECK_STATUS_PATH} className="mt-3 inline-flex min-h-tap items-center text-sm font-semibold text-ojetil-red hover:underline">
                {t("checkAgain")}
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CardPrintStyles />
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} className="print:hidden" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-14">
        <MemberCard card={card} photoSrc={card.hasPhoto ? `/api/members/card-photo/${token}` : null} locale={locale} />
        <div className="mx-auto mt-8 max-w-[46rem] space-y-4 print:hidden">
          <CardPrintActions labels={{ cr80: t("printCr80"), a4: t("printA4"), hint: t("printHint"), failed: t("printFailed") }} />
          <ul className="space-y-2 text-sm text-ink-secondary">
            <li className="flex gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-verified" />
              {t("tipVerify")}
            </li>
            <li className="flex gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-verified" />
              {t("tipSave")}
            </li>
            <li className="flex gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-verified" />
              {t("tipExpiry")}
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
