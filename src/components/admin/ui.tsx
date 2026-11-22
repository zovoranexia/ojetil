import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AttendeeStatus, ContentStatus, EventStatus, RegistrationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* Server-safe presentational building blocks for backoffice pages. */

export function AdminPageHeading({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-ink-secondary hover:text-ojetil-red">
            <ChevronLeft aria-hidden="true" className="size-4" /> {back.label}
          </Link>
        ) : null}
        <h1 className="text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-ink-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-border-subtle bg-surface-card", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold">{title}</h2>
            {description ? <p className="text-sm text-ink-secondary">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ── Tables ─────────────────────────────────────────────────────────── */
export function DataTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("border-b border-border-subtle bg-paper px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-secondary", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border-subtle px-4 py-3 align-top", className)}>{children}</td>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-ink-secondary">
        {children}
      </td>
    </tr>
  );
}

/* ── Status badges ──────────────────────────────────────────────────── */
const MEMBER_STATUS: Record<RegistrationStatus, { label: string; tone: "pending" | "info" | "verified" | "rejected" }> = {
  PENDING_VERIFICATION: { label: "Pending verification", tone: "pending" },
  NEEDS_REVISION: { label: "Needs revision", tone: "info" },
  VERIFIED: { label: "Verified", tone: "verified" },
  REJECTED: { label: "Rejected", tone: "rejected" },
};
export function MemberStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Badge tone={MEMBER_STATUS[status].tone}>{MEMBER_STATUS[status].label}</Badge>;
}
export const MEMBER_STATUS_LABELS = Object.fromEntries(Object.entries(MEMBER_STATUS).map(([k, v]) => [k, v.label])) as Record<RegistrationStatus, string>;

export function ContentStatusBadge({ status }: { status: ContentStatus | EventStatus }) {
  const tone = status === "PUBLISHED" ? "verified" : status === "DRAFT" ? "neutral" : status === "CANCELLED" ? "rejected" : "info";
  return <Badge tone={tone}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function AttendeeStatusBadge({ status }: { status: AttendeeStatus }) {
  const tone = status === "ATTENDED" ? "verified" : status === "CANCELLED" ? "rejected" : "info";
  return <Badge tone={tone}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function CategoryBadge({ category }: { category: "VETERAN_KLANDESTIN" | "ANGGOTA_PEMUDA" }) {
  return category === "VETERAN_KLANDESTIN" ? <Badge tone="heritageDark">Veteran</Badge> : <Badge tone="heritage">Youth</Badge>;
}

/* ── Pagination (preserves filters) ─────────────────────────────────── */
export function AdminPagination({
  basePath,
  page,
  pageCount,
  total,
  params,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls = "inline-flex min-h-tap items-center gap-1 rounded-control border border-border-subtle bg-surface-card px-3 text-sm font-semibold hover:border-border-strong md:min-h-9";
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="tabular-nums text-ink-secondary">
        {total} {total === 1 ? "result" : "results"} · page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cls}>
            <ChevronLeft aria-hidden="true" className="size-4" /> Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={cls}>
            Next <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export const filterControlClass =
  "min-h-tap rounded-control border border-border-subtle bg-surface-card px-3 text-sm text-ink hover:border-border-strong focus-visible:border-ojetil-red md:min-h-9";

export function ReadOnlyNotice({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-control border border-status-info/20 bg-status-info-bg px-4 py-3 text-sm text-status-info">{children}</p>;
}
