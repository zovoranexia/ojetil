import type { Metadata } from "next";
import { Plus, Star } from "lucide-react";
import Link from "next/link";
import { AdminPageHeading, ContentStatusBadge, DataTable, EmptyRow, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { formatCalendarDate } from "@/lib/format";
import { requirePageAccess } from "@/lib/security/guards";
import { listMilestonesAdmin } from "@/modules/content/institutional-queries";

export const metadata: Metadata = { title: "Timeline" };

export default async function TimelineAdminPage() {
  const user = await requirePageAccess("content:read", "/admin/linimasa");
  const rows = await listMilestonesAdmin();
  return (
    <>
      <AdminPageHeading
        title="History timeline"
        description="Narrative milestones shown on /istoria. Highlighted milestones (1980–1999) also appear on the home page."
        actions={
          satisfies(user.role, "content:write") ? (
            <Button asChild>
              <Link href="/admin/linimasa/baru">
                <Plus aria-hidden="true" /> New milestone
              </Link>
            </Button>
          ) : null
        }
      />
      <DataTable caption="Timeline milestones">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Date</Th>
            <Th>Title (Tetun)</Th>
            <Th>Languages</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((m) => (
              <tr key={m.id} className="hover:bg-paper">
                <Td className="tabular-nums text-ink-secondary">{m.displayOrder}</Td>
                <Td className="whitespace-nowrap font-serif font-semibold tabular-nums text-ojetil-red">
                  {m.datePrecision === "DECADE" ? `${Math.floor(m.year / 10) * 10}s` : formatCalendarDate("en", m.year, m.datePrecision === "YEAR" ? null : m.month, m.datePrecision === "DAY" ? m.day : null)}
                </Td>
                <Td>
                  <Link href={`/admin/linimasa/${m.id}`} className="font-medium hover:text-ojetil-red hover:underline">
                    {m.title}
                  </Link>
                  {m.isHighlighted ? <Star aria-label="Highlighted" className="ml-1.5 inline size-3.5 fill-gold-text text-gold-text" /> : null}
                  <span className="block font-mono text-xs text-ink-secondary">#{m.slug}</span>
                </Td>
                <Td className="font-mono text-xs">{m.locales.join(" · ")}</Td>
                <Td>
                  <ContentStatusBadge status={m.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5}>No milestones yet.</EmptyRow>
          )}
        </tbody>
      </DataTable>
    </>
  );
}
