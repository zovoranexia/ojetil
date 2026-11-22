import type { Metadata } from "next";
import { AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, CategoryBadge, MemberStatusBadge, Panel } from "@/components/admin/ui";
import { LOCALE_META, fromDbLocale, type AppLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { adminCalendarDate, adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { getMemberDetail } from "@/modules/members/admin-queries";
import { DecisionPanel, RevealPii } from "./member-panels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.members");
  return { title: t("detail.metaTitle") };
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{label}</dt>
      <dd className="mt-0.5">{children ?? "—"}</dd>
    </div>
  );
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageAccess("members:read", `/admin/anggota/${id}`);
  const m = await getMemberDetail(id);
  if (!m) notFound();

  const [t, tStatus, rawLocale] = await Promise.all([getTranslations("admin.members"), getTranslations("admin.status"), getLocale()]);
  const locale = rawLocale as AppLocale;
  const isVeteran = m.category === "VETERAN_KLANDESTIN";

  return (
    <>
      <AdminPageHeading
        back={{ href: "/admin/anggota", label: t("queue.title") }}
        title={m.fullName}
        description={t("detail.subtitle", { code: m.trackingCode, date: adminDateTime(m.createdAt, locale) })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={m.category} />
            <MemberStatusBadge status={m.status} />
            {m.status === "VERIFIED" ? (
              <Link
                href={`/admin/anggota/${m.id}/kartaun`}
                className="inline-flex min-h-tap items-center gap-1.5 rounded-control border border-border-subtle bg-surface-card px-3 text-sm font-semibold hover:border-border-strong md:min-h-9"
              >
                <CreditCard aria-hidden="true" className="size-4" /> {t("detail.memberCard")}
              </Link>
            ) : null}
          </div>
        }
      />

      {m.duplicates.length ? (
        <div role="note" className="mb-6 flex gap-3 rounded-card border border-status-pending/30 bg-status-pending-bg p-4 text-sm text-status-pending">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{t("detail.duplicateWarning", { count: m.duplicates.length })}</p>
            <ul className="mt-1 space-y-0.5">
              {m.duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/anggota/${d.id}`} className="tracking-code font-semibold underline">
                    {d.trackingCode}
                  </Link>{" "}
                  — {d.fullName} · {tStatus(`member.${d.status}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title={t("detail.identity")}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label={t("fields.fullName")}>{m.fullName}</Item>
              {isVeteran ? <Item label={t("fields.clandestineAlias")}>{m.clandestineAlias}</Item> : null}
              <Item label={t("fields.dateOfBirth")}>{adminCalendarDate(m.dateOfBirth, locale)}</Item>
              <Item label={t("fields.gender")}>{t(`genders.${m.gender}`)}</Item>
              <Item label={t("fields.municipality")}>{municipalityLabel(m.municipality)}</Item>
              <Item label={t("fields.administrativePost")}>{m.administrativePost}</Item>
              <Item label={t("fields.email")}>{m.email}</Item>
              <Item label={t("fields.submittedIn")}>{LOCALE_META[fromDbLocale(m.submittedLocale)].nativeName}</Item>
            </dl>
          </Panel>

          <Panel title={t("detail.personalData")}>
            {satisfies(user.role, "members:pii") ? (
              <RevealPii id={m.id} hasPhoto={m.hasPhoto} />
            ) : (
              <p className="text-sm text-ink-secondary">{t("detail.noPiiAccess")}</p>
            )}
          </Panel>

          <Panel title={isVeteran ? t("detail.veteranBackground") : t("detail.youthBackground")}>
            <dl className="grid gap-4 sm:grid-cols-2">
              {isVeteran ? (
                <>
                  <Item label={t("fields.yearJoined")}>{m.yearJoined}</Item>
                  <Item label={t("fields.region")}>{m.clandestineRegion}</Item>
                  <Item label={t("fields.cell")}>{m.clandestineCell}</Item>
                  <Item label={t("fields.witness")}>{m.witnessReference}</Item>
                </>
              ) : (
                <>
                  <Item label={t("fields.institution")}>{m.institution}</Item>
                  <Item label={t("fields.interests")}>{m.interests.map((i) => t(`interestAreas.${i}`)).join(", ")}</Item>
                  <div className="sm:col-span-2">
                    <Item label={t("fields.motivation")}>
                      <span className="whitespace-pre-line">{m.motivation}</span>
                    </Item>
                  </div>
                </>
              )}
              <Item label={t("fields.consent")}>
                {t("detail.consentGiven", { date: adminDateTime(m.consentAt, locale), version: m.consentVersion })}
              </Item>
            </dl>
          </Panel>
        </div>

        <div className="space-y-6">
          {satisfies(user.role, "members:verify") ? (
            <Panel title={t("detail.decision")} description={t("detail.currentStatus", { status: tStatus(`member.${m.status}`) })}>
              <DecisionPanel id={m.id} status={m.status} />
            </Panel>
          ) : null}

          <Panel title={t("detail.history")}>
            <ol className="space-y-4">
              {m.statusChanges.map((c) => (
                <li key={c.id} className="border-l-2 border-border-subtle pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <MemberStatusBadge status={c.toStatus} />
                    <span className="text-xs tabular-nums text-ink-secondary">{adminDateTime(c.createdAt, locale)}</span>
                  </div>
                  <p className="mt-1 text-ink-secondary">{c.actor ? t("detail.byActor", { name: c.actor.name }) : t("detail.submittedByApplicant")}</p>
                  {c.note ? <p className="mt-1 whitespace-pre-line">“{c.note}”</p> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
