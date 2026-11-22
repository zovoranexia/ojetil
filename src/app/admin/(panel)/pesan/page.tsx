import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ContactMessageStatus } from "@prisma/client";
import { AdminPageHeading, AdminPagination, filterControlClass } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { cn } from "@/lib/utils";
import { listContactMessages } from "@/modules/contact/service";
import { MESSAGE_STATUSES, MESSAGE_STATUS_TONE } from "./status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.inbox");
  return { title: t("metaTitle") };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function InboxPage({ searchParams }: { searchParams: SP }) {
  await requirePageAccess("messages:read", "/admin/pesan");
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 80);
  const statusRaw = one(sp.status);
  const status = (MESSAGE_STATUSES as readonly string[]).includes(statusRaw ?? "") ? (statusRaw as ContactMessageStatus) : undefined;
  const result = await listContactMessages({ q, status, page: Math.max(Number(one(sp.page) ?? 1) || 1, 1) });
  const [t, locale] = await Promise.all([getTranslations("admin.inbox"), getLocale()]);

  const tab = (s: ContactMessageStatus | undefined) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/admin/pesan?${qs}` : "/admin/pesan";
  };

  return (
    <>
      <AdminPageHeading title={t("title")} description={t("description")} />
      <div className="mb-4 flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-card p-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label={t("statusLabel")} className="flex flex-wrap gap-1">
          {[undefined, ...MESSAGE_STATUSES].map((s) => {
            const active = status === s;
            return (
              <Link
                key={s ?? "open"}
                href={tab(s)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-tap items-center rounded-control px-3 text-sm font-semibold md:min-h-9",
                  active ? "bg-ink text-paper" : "text-ink-secondary hover:bg-surface-muted hover:text-ink",
                )}
              >
                {s ? t(`status.${s}`) : t("open")}
              </Link>
            );
          })}
        </nav>
        <form method="get" role="search" className="flex gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="q" className="sr-only">
            {t("search")}
          </label>
          <input id="q" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={cn(filterControlClass, "min-w-0 flex-1 md:w-64")} />
          <Button type="submit" variant="editorial" size="sm">
            {t("filter")}
          </Button>
        </form>
      </div>

      {result.items.length ? (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-surface-card">
          {result.items.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/pesan/${m.id}`} className="flex flex-col gap-1 px-5 py-4 hover:bg-paper md:flex-row md:items-start md:gap-6">
                <div className="flex shrink-0 items-center gap-2 md:w-56 md:flex-col md:items-start md:gap-1">
                  <span className={cn("truncate", m.status === "NEW" ? "font-semibold text-ink" : "text-ink")}>
                    {m.status === "NEW" ? <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-ojetil-red align-middle" /> : null}
                    {m.name}
                  </span>
                  <span className="truncate text-xs text-ink-secondary">{m.email}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{t(`topics.${m.subject}` as never)}</span>
                    <span className="text-ink-secondary"> — {m.message.slice(0, 160)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-ink-secondary md:flex-col md:items-end">
                  <span className="tabular-nums">{adminDateTime(m.createdAt, locale)}</span>
                  <span className="flex gap-1.5">
                    <Badge tone="neutral" className="font-mono">
                      {m.locale}
                    </Badge>
                    <Badge tone={MESSAGE_STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-border-subtle px-6 py-12 text-center text-ink-secondary">{t("empty")}</p>
      )}
      <AdminPagination basePath="/admin/pesan" page={result.page} pageCount={result.pageCount} total={result.total} params={{ q, status }} />
    </>
  );
}
