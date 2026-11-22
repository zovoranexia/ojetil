import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { getProfileSectionForEdit } from "@/modules/content/institutional-queries";
import { PROFILE_SECTION_KEYS } from "@/modules/content/institutional-schema";
import { ProfileEditor } from "../profile-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.profile");
  return { title: t("editMetaTitle") };
}

export default async function ProfileSectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(PROFILE_SECTION_KEYS as readonly string[]).includes(key)) notFound();
  const sectionKey = key as (typeof PROFILE_SECTION_KEYS)[number];
  const user = await requirePageAccess("content:read", `/admin/profil/${key}`);
  const [initial, t, tc] = await Promise.all([getProfileSectionForEdit(sectionKey), getTranslations("admin.profile"), getTranslations("admin.content")]);
  const canWrite = satisfies(user.role, "content:write");
  return (
    <>
      <AdminPageHeading back={{ href: "/admin/profil", label: t("metaTitle") }} title={t(`sections.${sectionKey}.label`)} description={t(`sections.${sectionKey}.where`)} />
      {!canWrite ? <ReadOnlyNotice>{tc("readOnly")}</ReadOnlyNotice> : null}
      <ProfileEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")}
        mediaLimits={{ imageBytes: getServerEnv().MAX_IMAGE_UPLOAD_BYTES, mediaBytes: getServerEnv().MAX_MEDIA_FILE_BYTES }}
      />
    </>
  );
}
