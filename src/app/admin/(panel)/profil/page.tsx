import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeading, ContentStatusBadge, DataTable, Td, Th } from "@/components/admin/ui";
import { adminDateTime } from "@/lib/admin-format";
import { requirePageAccess } from "@/lib/security/guards";
import { listProfileSectionsAdmin } from "@/modules/content/institutional-queries";
import { PROFILE_SECTION_LABELS } from "@/modules/content/institutional-schema";

export const metadata: Metadata = { title: "Profile pages" };

export default async function ProfileAdminPage() {
  await requirePageAccess("content:read", "/admin/profil");
  const rows = await listProfileSectionsAdmin();
  return (
    <>
      <AdminPageHeading title="Institutional profile" description="Fixed sections of the About and History pages, in four languages." />
      <DataTable caption="Profile sections">
        <thead>
          <tr>
            <Th>Section</Th>
            <Th>Shown on</Th>
            <Th>Languages</Th>
            <Th>Updated</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-paper">
              <Td>
                <Link href={`/admin/profil/${r.key}`} className="font-medium hover:text-ojetil-red hover:underline">
                  {PROFILE_SECTION_LABELS[r.key].label}
                </Link>
              </Td>
              <Td className="text-ink-secondary">{PROFILE_SECTION_LABELS[r.key].where}</Td>
              <Td className="font-mono text-xs">{r.locales.join(" · ") || "—"}</Td>
              <Td className="tabular-nums text-ink-secondary">{adminDateTime(r.updatedAt)}</Td>
              <Td>{r.status ? <ContentStatusBadge status={r.status} /> : <span className="text-ink-secondary">Not created</span>}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
