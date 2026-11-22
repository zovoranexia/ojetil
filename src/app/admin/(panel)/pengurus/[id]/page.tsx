import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { currentDiliYear } from "@/lib/dates";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { getLeaderForEdit } from "@/modules/content/institutional-queries";
import { LEADERSHIP_TRANSLATION_FIELDS, type LeadershipFormValues } from "@/modules/content/institutional-schema";
import { LeaderEditor } from "../leader-editor";

export const metadata: Metadata = { title: "Edit leader" };

export default async function LeaderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "content:write" : "content:read", `/admin/pengurus/${id}`);
  const initial: LeadershipFormValues | null = isNew
    ? {
        fullName: "",
        photoUrl: "",
        level: "NATIONAL",
        municipality: "",
        termStart: currentDiliYear(),
        termEnd: "",
        displayOrder: 100,
        status: "DRAFT",
        translations: emptyTranslations(LEADERSHIP_TRANSLATION_FIELDS),
      }
    : await getLeaderForEdit(id);
  if (!initial) notFound();
  const canWrite = satisfies(user.role, "content:write");
  return (
    <>
      <AdminPageHeading back={{ href: "/admin/pengurus", label: "Leadership" }} title={isNew ? "Add leader" : initial.fullName} />
      {!canWrite ? <ReadOnlyNotice>Read-only: your role can view content but not edit it.</ReadOnlyNotice> : null}
      <LeaderEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")} />
    </>
  );
}
