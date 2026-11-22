import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { currentDiliYear } from "@/lib/dates";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { getLeaderForEdit } from "@/modules/content/institutional-queries";
import { LEADERSHIP_TRANSLATION_FIELDS, type LeadershipFormValues } from "@/modules/content/institutional-schema";
import { LeaderEditor } from "../leader-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.leadership");
  return { title: t("editMetaTitle") };
}

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
  const [t, tc] = await Promise.all([getTranslations("admin.leadership"), getTranslations("admin.content")]);
  const canWrite = satisfies(user.role, "content:write");
  return (
    <>
      <AdminPageHeading back={{ href: "/admin/pengurus", label: t("metaTitle") }} title={isNew ? t("addLeader") : initial.fullName} />
      {!canWrite ? <ReadOnlyNotice>{tc("readOnly")}</ReadOnlyNotice> : null}
      <LeaderEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")} />
    </>
  );
}
