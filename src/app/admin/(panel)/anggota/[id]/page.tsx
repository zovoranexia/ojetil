import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeading, CategoryBadge, MEMBER_STATUS_LABELS, MemberStatusBadge, Panel } from "@/components/admin/ui";
import { municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { adminCalendarDate, adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { getMemberDetail } from "@/modules/members/admin-queries";
import { DecisionPanel, RevealPii } from "./member-panels";

export const metadata: Metadata = { title: "Application" };

const GENDER = { MALE: "Male", FEMALE: "Female", PREFER_NOT_TO_SAY: "Prefer not to say" } as const;
const INTEREST = { EDUCATION: "Education", ADVOCACY: "Advocacy", MEDIA: "Media", COMMUNITY_SERVICE: "Community service" } as const;

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

  const isVeteran = m.category === "VETERAN_KLANDESTIN";

  return (
    <>
      <AdminPageHeading
        back={{ href: "/admin/anggota", label: "Verification queue" }}
        title={m.fullName}
        description={`${m.trackingCode} · submitted ${adminDateTime(m.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <CategoryBadge category={m.category} />
            <MemberStatusBadge status={m.status} />
          </div>
        }
      />

      {m.duplicates.length ? (
        <div role="note" className="mb-6 flex gap-3 rounded-card border border-status-pending/30 bg-status-pending-bg p-4 text-sm text-status-pending">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Possible duplicate — the same national ID appears on {m.duplicates.length} other application(s):</p>
            <ul className="mt-1 space-y-0.5">
              {m.duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/anggota/${d.id}`} className="tracking-code font-semibold underline">
                    {d.trackingCode}
                  </Link>{" "}
                  — {d.fullName} · {MEMBER_STATUS_LABELS[d.status]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Identity & residence">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Full name">{m.fullName}</Item>
              {isVeteran ? <Item label="Clandestine name">{m.clandestineAlias}</Item> : null}
              <Item label="Date of birth">{adminCalendarDate(m.dateOfBirth)}</Item>
              <Item label="Gender">{GENDER[m.gender]}</Item>
              <Item label="Municipality">{municipalityLabel(m.municipality)}</Item>
              <Item label="Administrative post">{m.administrativePost}</Item>
              <Item label="Email">{m.email}</Item>
              <Item label="Submitted in">{m.submittedLocale}</Item>
            </dl>
          </Panel>

          <Panel title="Personal data (encrypted)">
            {satisfies(user.role, "members:pii") ? (
              <RevealPii id={m.id} hasPhoto={m.hasPhoto} />
            ) : (
              <p className="text-sm text-ink-secondary">Your role cannot view encrypted personal data.</p>
            )}
          </Panel>

          <Panel title={isVeteran ? "Clandestine-era background" : "Youth member background"}>
            <dl className="grid gap-4 sm:grid-cols-2">
              {isVeteran ? (
                <>
                  <Item label="Year joined">{m.yearJoined}</Item>
                  <Item label="Region">{m.clandestineRegion}</Item>
                  <Item label="Cell / network">{m.clandestineCell}</Item>
                  <Item label="Witness / comrade reference">{m.witnessReference}</Item>
                </>
              ) : (
                <>
                  <Item label="School / university / occupation">{m.institution}</Item>
                  <Item label="Interests">{m.interests.map((i) => INTEREST[i]).join(", ")}</Item>
                  <div className="sm:col-span-2">
                    <Item label="Motivation">
                      <span className="whitespace-pre-line">{m.motivation}</span>
                    </Item>
                  </div>
                </>
              )}
              <Item label="Consent">
                Given {adminDateTime(m.consentAt)} (notice {m.consentVersion})
              </Item>
            </dl>
          </Panel>
        </div>

        <div className="space-y-6">
          {satisfies(user.role, "members:verify") ? (
            <Panel title="Decision" description={`Current status: ${MEMBER_STATUS_LABELS[m.status]}`}>
              <DecisionPanel id={m.id} status={m.status} />
            </Panel>
          ) : null}

          <Panel title="Verification history">
            <ol className="space-y-4">
              {m.statusChanges.map((c) => (
                <li key={c.id} className="border-l-2 border-border-subtle pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <MemberStatusBadge status={c.toStatus} />
                    <span className="text-xs tabular-nums text-ink-secondary">{adminDateTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-ink-secondary">{c.actor ? `by ${c.actor.name}` : "Submitted by applicant"}</p>
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
