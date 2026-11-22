import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/public/page-header";
import { siteConfig } from "@/config/site";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { normalizeTrackingCode } from "@/lib/codes";
import { localizedAlternates } from "@/lib/seo";
import { StatusLookup } from "./status-lookup";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "statusLookup" });
  return {
    title: t("metaTitle"),
    alternates: localizedAlternates("/komunidade/cek-status", locale),
    robots: { index: false, follow: true },
  };
}

export default async function StatusLookupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  await getPageLocale(params);
  const t = await getTranslations("statusLookup");
  const raw = (await searchParams).code;
  // Only a well-formed tracking code is pre-filled from the URL (e.g. the link on the confirmation screen).
  const initialCode = normalizeTrackingCode(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")) ?? "";

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="mx-auto max-w-xl px-4 py-10 md:px-8">
        <StatusLookup initialCode={initialCode} contactEmail={siteConfig.contact.email} />
      </div>
    </>
  );
}
