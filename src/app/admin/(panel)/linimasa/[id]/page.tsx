import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { getMilestoneForEdit, nextMilestoneOrder } from "@/modules/content/institutional-queries";
import { TIMELINE_TRANSLATION_FIELDS, type TimelineFormValues } from "@/modules/content/institutional-schema";
import { MilestoneEditor } from "../milestone-editor";

export const metadata: Metadata = { title: "Edit milestone" };

export default async function MilestoneEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "content:write" : "content:read", `/admin/linimasa/${id}`);
  const initial: TimelineFormValues | null = isNew
    ? {
        slug: "",
        year: 1990,
        month: "",
        day: "",
        datePrecision: "YEAR",
        displayOrder: await nextMilestoneOrder(),
        isHighlighted: false,
        status: "DRAFT",
        imageUrl: "",
        translations: emptyTranslations(TIMELINE_TRANSLATION_FIELDS),
      }
    : await getMilestoneForEdit(id);
  if (!initial) notFound();
  const canWrite = satisfies(user.role, "content:write");
  return (
    <>
      <AdminPageHeading back={{ href: "/admin/linimasa", label: "Timeline" }} title={isNew ? "New milestone" : initial.translations.TET.title || initial.slug} />
      {!canWrite ? <ReadOnlyNotice>Read-only: your role can view content but not edit it.</ReadOnlyNotice> : null}
      <MilestoneEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")} />
    </>
  );
}
