import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading } from "@/components/admin/ui";
import { CardPrintStyles } from "@/components/members/card-print-styles";
import { MemberCard } from "@/components/members/member-card";
import { isAppLocale } from "@/config/locales";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { getMemberCard } from "@/modules/members/card";
import { AdminCardPrint } from "./admin-card-print";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.members");
  return { title: t("detail.memberCard") };
}

/**
 * Printable card for the Secretariat (e.g. to hand out physical cards).
 * The photo loads through the audited admin photo route, so it appears only
 * for roles allowed to see member PII.
 */
export default async function AdminMemberCardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ verified?: string }> }) {
  const { id } = await params;
  const { verified } = await searchParams;
  const user = await requirePageAccess("members:read", `/admin/anggota/${id}/kartaun`);
  const card = await getMemberCard(id);
  if (!card) notFound();
  const [t, rawLocale] = await Promise.all([getTranslations("admin.members"), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : "tet";
  const canSeePhoto = satisfies(user.role, "members:pii");

  return (
    <>
      <CardPrintStyles />
      <div className="print:hidden">
        <AdminPageHeading back={{ href: `/admin/anggota/${id}`, label: card.fullName }} title={t("detail.memberCard")} description={t("detail.memberCardHint")} />
      </div>
      {verified ? (
        <p role="status" className="mb-6 max-w-3xl rounded-card border border-status-verified/30 bg-status-verified-bg p-4 text-sm text-status-verified print:hidden">
          {t("detail.verifiedNowBanner", { code: card.trackingCode })}
        </p>
      ) : null}
      <div className="max-w-3xl">
        <MemberCard card={card} photoSrc={card.hasPhoto && canSeePhoto ? `/api/admin/members/${id}/photo` : null} locale={locale} />
        <div className="mt-6">
          <AdminCardPrint id={id} />
        </div>
      </div>
    </>
  );
}
