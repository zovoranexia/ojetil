import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, ContentStatusBadge, DataTable, Td, Th } from "@/components/admin/ui";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { listProfileSectionsAdmin } from "@/modules/content/institutional-queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.profile");
  return { title: t("metaTitle") };
}

export default async function ProfileAdminPage() {
  await requirePageAccess("content:read", "/admin/profil");
  const [rows, t, locale] = await Promise.all([listProfileSectionsAdmin(), getTranslations("admin.profile"), getLocale()]);
  return (
    <>
      <AdminPageHeading title={t("heading")} description={t("description")} />
      <DataTable caption={t("tableCaption")}>
        <thead>
          <tr>
            <Th>{t("columns.section")}</Th>
            <Th>{t("columns.shownOn")}</Th>
            <Th>{t("columns.languages")}</Th>
            <Th>{t("columns.updated")}</Th>
            <Th>{t("columns.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-paper">
              <Td>
                <Link href={`/admin/profil/${r.key}`} className="font-medium hover:text-ojetil-red hover:underline">
                  {t(`sections.${r.key}.label`)}
                </Link>
              </Td>
              <Td className="text-ink-secondary">{t(`sections.${r.key}.where`)}</Td>
              <Td className="font-mono text-xs">{r.locales.join(" · ") || "—"}</Td>
              <Td className="tabular-nums text-ink-secondary">{adminDateTime(r.updatedAt, locale)}</Td>
              <Td>{r.status ? <ContentStatusBadge status={r.status} /> : <span className="text-ink-secondary">{t("notCreated")}</span>}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
