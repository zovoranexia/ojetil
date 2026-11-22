import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/public/page-header";
import { CHECK_STATUS_PATH } from "@/config/navigation";
import { Link } from "@/i18n/navigation";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { localizedAlternates } from "@/lib/seo";
import { MemberWizard } from "./member-wizard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "memberRegistration" });
  return { title: t("metaTitle"), description: t("lead"), alternates: localizedAlternates("/komunidade/registrasi", locale) };
}

export default async function MemberRegistrationPage({ params }: { params: Promise<{ locale: string }> }) {
  await getPageLocale(params);
  const [t, home] = await Promise.all([getTranslations("memberRegistration"), getTranslations("home.cta")]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1fr_18rem]">
        <MemberWizard />
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-card bg-ink p-5 text-paper">
            <Lock aria-hidden="true" className="size-5 text-gold-accent" />
            <p className="mt-3 text-sm text-paper/90">{t("privacyNote")}</p>
          </div>
          <Link href={CHECK_STATUS_PATH} className="inline-flex min-h-tap items-center text-sm font-semibold text-ojetil-red underline-offset-4 hover:underline">
            {home("checkStatus")}
          </Link>
        </aside>
      </div>
    </>
  );
}
