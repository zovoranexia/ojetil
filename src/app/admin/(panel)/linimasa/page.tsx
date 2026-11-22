import type { Metadata } from "next";
import { Plus, Star } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, ContentStatusBadge, DataTable, EmptyRow, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { listMilestonesAdmin } from "@/modules/content/institutional-queries";
import { milestoneLabel } from "@/modules/content/milestone-label";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.timeline");
  return { title: t("metaTitle") };
}

export default async function TimelineAdminPage() {
  const user = await requirePageAccess("content:read", "/admin/linimasa");
  const [rows, t, locale] = await Promise.all([listMilestonesAdmin(), getTranslations("admin.timeline"), getLocale()]);
  const decade = (year: number) => t("decade", { year });
  return (
    <>
      <AdminPageHeading
        title={t("heading")}
        description={t("description")}
        actions={
          satisfies(user.role, "content:write") ? (
            <Button asChild>
              <Link href="/admin/linimasa/baru">
                <Plus aria-hidden="true" /> {t("newMilestone")}
              </Link>
            </Button>
          ) : null
        }
      />
      <DataTable caption={t("tableCaption")}>
        <thead>
          <tr>
            <Th>{t("columns.order")}</Th>
            <Th>{t("columns.date")}</Th>
            <Th>{t("columns.titleTetun")}</Th>
            <Th>{t("columns.languages")}</Th>
            <Th>{t("columns.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((m) => (
              <tr key={m.id} className="hover:bg-paper">
                <Td className="tabular-nums text-ink-secondary">{m.displayOrder}</Td>
                <Td className="whitespace-nowrap font-serif font-semibold tabular-nums text-ojetil-red">
                  {milestoneLabel(m, locale, decade)}
                </Td>
                <Td>
                  <Link href={`/admin/linimasa/${m.id}`} className="font-medium hover:text-ojetil-red hover:underline">
                    {m.title}
                  </Link>
                  {m.isHighlighted ? <Star aria-label={t("highlighted")} className="ml-1.5 inline size-3.5 fill-gold-text text-gold-text" /> : null}
                  <span className="block font-mono text-xs text-ink-secondary">#{m.slug}</span>
                </Td>
                <Td className="font-mono text-xs">{m.locales.join(" · ")}</Td>
                <Td>
                  <ContentStatusBadge status={m.status} />
                </Td>
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
