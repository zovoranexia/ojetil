import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, ContentStatusBadge, DataTable, EmptyRow, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import { requirePageAccess } from "@/lib/security/guards";
import { listEventsAdmin } from "@/modules/events/admin-queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.events");
  return { title: t("metaTitle") };
}

export default async function EventsAdminPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requirePageAccess("events:read", "/admin/acara");
  const { scope: rawScope } = await searchParams;
  const scope = rawScope === "past" ? "past" : rawScope === "all" ? undefined : "upcoming";
  const events = await listEventsAdmin({ scope });
  const canWrite = satisfies(user.role, "events:write");
  const [t, locale] = await Promise.all([getTranslations("admin.events"), getLocale()]);

  const tab = (value: string, label: string, active: boolean) => (
    <Link
      href={value === "upcoming" ? "/admin/acara" : `/admin/acara?scope=${value}`}
      aria-current={active ? "page" : undefined}
      className={cn("inline-flex min-h-tap items-center rounded-control px-3 text-sm font-semibold md:min-h-9", active ? "bg-ink text-paper" : "text-ink-secondary hover:bg-surface-muted")}
    >
      {label}
    </Link>
  );

  return (
    <>
      <AdminPageHeading
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/admin/acara/baru">
                <Plus aria-hidden="true" /> {t("newEvent")}
              </Link>
            </Button>
          ) : null
        }
      />
      <nav aria-label={t("periodNav")} className="mb-4 flex gap-1">
        {tab("upcoming", t("upcoming"), scope === "upcoming")}
        {tab("past", t("past"), scope === "past")}
        {tab("all", t("all"), scope === undefined)}
      </nav>
      <DataTable caption={t("table.caption")}>
        <thead>
          <tr>
            <Th>{t("table.event")}</Th>
            <Th>{t("table.type")}</Th>
            <Th>{t("table.starts")}</Th>
            <Th>{t("table.seats")}</Th>
            <Th>{t("table.status")}</Th>
            <Th>
              <span className="sr-only">{t("table.attendees")}</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {events.length ? (
            events.map((e) => (
              <tr key={e.id} className="hover:bg-paper">
                <Td>
                  <Link href={`/admin/acara/${e.id}`} className="font-medium hover:text-ojetil-red hover:underline">
                    {e.title}
                  </Link>
                  <span className="block text-xs text-ink-secondary">{e.isOnline ? t("online") : e.location}</span>
                </Td>
                <Td>{t(`types.${e.type}`)}</Td>
                <Td className="tabular-nums">{adminDateTime(e.startAt, locale)}</Td>
                <Td className="tabular-nums">
                  <span className={e.registered >= e.capacity ? "font-semibold text-status-rejected" : undefined}>
                    {e.registered} / {e.capacity}
                  </span>
                </Td>
                <Td>
                  <ContentStatusBadge status={e.status} />
                  {e.isPast ? <span className="ml-1 text-xs text-ink-secondary">{t("ended")}</span> : null}
                </Td>
                <Td>
                  <Link href={`/admin/acara/${e.id}/peserta`} className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline md:min-h-8">
                    <Users aria-hidden="true" className="size-4" /> {t("attendeesLink")}
                  </Link>
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>{t("empty")}</EmptyRow>
          )}
        </tbody>
      </DataTable>
    </>
  );
}
