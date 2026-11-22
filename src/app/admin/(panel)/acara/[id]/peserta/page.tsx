import type { Metadata } from "next";
import { Download } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { AttendeeStatus } from "@prisma/client";
import { AdminPageHeading, AttendeeStatusBadge, DataTable, EmptyRow, Td, Th, filterControlClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { ATTENDEE_STATUS_VALUES } from "@/modules/events/admin-schema";
import { getEventAttendees } from "@/modules/events/admin-queries";
import { AttendanceControl } from "./attendance-control";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.events");
  return { title: t("metaAttendees") };
}

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { id } = await params;
  const user = await requirePageAccess("events:read", `/admin/acara/${id}/peserta`);
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const status = (ATTENDEE_STATUS_VALUES as readonly string[]).includes(sp.status ?? "") ? (sp.status as AttendeeStatus) : undefined;

  const data = await getEventAttendees(id, { q, status });
  if (!data) notFound();
  const canWrite = satisfies(user.role, "events:write");
  const canExport = satisfies(user.role, "events:export");
  const active = data.summary.registered + data.summary.attended;
  const [t, tStatus, locale] = await Promise.all([getTranslations("admin.events.attendees"), getTranslations("admin.status.attendee"), getLocale()]);

  return (
    <>
      <AdminPageHeading
        back={{ href: `/admin/acara/${id}`, label: t("backToEvent") }}
        title={t("title", { title: data.event.title })}
        description={t("summary", {
          date: adminDateTime(data.event.startAt, locale),
          active,
          capacity: data.event.capacity,
          attended: data.summary.attended,
          cancelled: data.summary.cancelled,
        })}
        actions={
          canExport ? (
            <Button asChild variant="outline">
              <a href={`/api/admin/exports/events/${id}`} download>
                <Download aria-hidden="true" /> {t("exportCsv")}
              </a>
            </Button>
          ) : null
        }
      />
      <form method="get" role="search" className="mb-4 grid gap-2 rounded-card border border-border-subtle bg-surface-card p-3 sm:grid-cols-[1fr_auto_auto]">
        <label htmlFor="q" className="sr-only">
          {t("searchLabel")}
        </label>
        <input id="q" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={filterControlClass} />
        <label htmlFor="status" className="sr-only">
          {t("statusLabel")}
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className={filterControlClass}>
          <option value="">{t("allStatuses")}</option>
          {ATTENDEE_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="editorial" size="sm">
          {t("filter")}
        </Button>
      </form>
      <DataTable caption={t("caption")}>
        <thead>
          <tr>
            <Th>{t("ticket")}</Th>
            <Th>{t("attendee")}</Th>
            <Th>{t("institution")}</Th>
            <Th>{t("registered")}</Th>
            <Th>{t("attendance")}</Th>
          </tr>
        </thead>
        <tbody>
          {data.attendees.length ? (
            data.attendees.map((a) => (
              <tr key={a.id} className="hover:bg-paper">
                <Td className="tracking-code font-semibold">{a.ticketCode}</Td>
                <Td>
                  <span className="font-medium">{a.fullName}</span>
                  <span className="block text-xs text-ink-secondary">{a.email}</span>
                  {a.phone ? <span className="block text-xs tabular-nums text-ink-secondary">{a.phone}</span> : null}
                </Td>
                <Td>
                  {a.institution ?? "—"}
                  {a.municipality ? <span className="block text-xs text-ink-secondary">{municipalityLabel(a.municipality)}</span> : null}
                </Td>
                <Td className="tabular-nums text-ink-secondary">{adminDateTime(a.createdAt, locale)}</Td>
                <Td>{canWrite ? <AttendanceControl registrationId={a.id} status={a.status} name={a.fullName} /> : <AttendeeStatusBadge status={a.status} />}</Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5}>{t("empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
    </>
  );
}
