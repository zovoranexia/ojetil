import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ContentStatusBadge, DataTable, EmptyRow, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { listLeadersAdmin } from "@/modules/content/institutional-queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.leadership");
  return { title: t("metaTitle") };
}

export default async function LeadershipAdminPage() {
  const user = await requirePageAccess("content:read", "/admin/pengurus");
  const [rows, t] = await Promise.all([listLeadersAdmin(), getTranslations("admin.leadership")]);
  return (
    <>
      <AdminPageHeading
        title={t("heading")}
        description={t("description")}
        actions={
          satisfies(user.role, "content:write") ? (
            <Button asChild>
              <Link href="/admin/pengurus/baru">
                <Plus aria-hidden="true" /> {t("addLeader")}
              </Link>
            </Button>
          ) : null
        }
      />
      <DataTable caption={t("metaTitle")}>
        <thead>
          <tr>
            <Th>{t("columns.name")}</Th>
            <Th>{t("columns.positionTetun")}</Th>
            <Th>{t("columns.level")}</Th>
            <Th>{t("columns.term")}</Th>
            <Th>{t("columns.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((l) => (
              <tr key={l.id} className="hover:bg-paper">
                <Td>
                  <Link href={`/admin/pengurus/${l.id}`} className="font-medium hover:text-ojetil-red hover:underline">
                    {l.fullName}
                  </Link>
                </Td>
                <Td>{l.title}</Td>
                <Td>
                  {l.level === "NATIONAL"
                    ? t("levelShort.NATIONAL")
                    : t("levelShort.MUNICIPAL", { municipality: l.municipality ? municipalityLabel(l.municipality) : "—" })}
                </Td>
                <Td className="tabular-nums">
                  {l.termStart}–{l.termEnd ?? t("present")}
                </Td>
                <Td>
                  <ContentStatusBadge status={l.status} />
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
