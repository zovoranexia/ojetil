import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AdminPageHeading, ContentStatusBadge, DataTable, EmptyRow, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { municipalityLabel } from "@/config/municipalities";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { listLeadersAdmin } from "@/modules/content/institutional-queries";

export const metadata: Metadata = { title: "Leadership" };

export default async function LeadershipAdminPage() {
  const user = await requirePageAccess("content:read", "/admin/pengurus");
  const rows = await listLeadersAdmin();
  return (
    <>
      <AdminPageHeading
        title="Leadership directory"
        description="National Directorate and municipal coordinators shown on the About page."
        actions={
          satisfies(user.role, "content:write") ? (
            <Button asChild>
              <Link href="/admin/pengurus/baru">
                <Plus aria-hidden="true" /> Add leader
              </Link>
            </Button>
          ) : null
        }
      />
      <DataTable caption="Leadership">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Position (Tetun)</Th>
            <Th>Level</Th>
            <Th>Term</Th>
            <Th>Status</Th>
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
                <Td>{l.level === "NATIONAL" ? "National" : `Municipal · ${l.municipality ? municipalityLabel(l.municipality) : "—"}`}</Td>
                <Td className="tabular-nums">
                  {l.termStart}–{l.termEnd ?? "present"}
                </Td>
                <Td>
                  <ContentStatusBadge status={l.status} />
                </Td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5}>No leaders yet.</EmptyRow>
          )}
        </tbody>
      </DataTable>
    </>
  );
}
