import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { getMilestoneForEdit, nextMilestoneOrder } from "@/modules/content/institutional-queries";
import { TIMELINE_TRANSLATION_FIELDS, type TimelineFormValues } from "@/modules/content/institutional-schema";
import { MilestoneEditor } from "../milestone-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.timeline");
  return { title: t("editMetaTitle") };
}

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
  const [t, tc] = await Promise.all([getTranslations("admin.timeline"), getTranslations("admin.content")]);
  const canWrite = satisfies(user.role, "content:write");
  return (
    <>
      <AdminPageHeading back={{ href: "/admin/linimasa", label: t("metaTitle") }} title={isNew ? t("newMilestone") : initial.translations.TET.title || initial.slug} />
      {!canWrite ? <ReadOnlyNotice>{tc("readOnly")}</ReadOnlyNotice> : null}
      <MilestoneEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")}
        mediaLimits={{ imageBytes: getServerEnv().MAX_IMAGE_UPLOAD_BYTES, mediaBytes: getServerEnv().MAX_MEDIA_FILE_BYTES }}
      />
    </>
  );
}
