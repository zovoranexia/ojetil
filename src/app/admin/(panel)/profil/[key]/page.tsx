import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { getProfileSectionForEdit } from "@/modules/content/institutional-queries";
import { PROFILE_SECTION_KEYS, PROFILE_SECTION_LABELS } from "@/modules/content/institutional-schema";
import { ProfileEditor } from "../profile-editor";

export const metadata: Metadata = { title: "Edit profile section" };

export default async function ProfileSectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(PROFILE_SECTION_KEYS as readonly string[]).includes(key)) notFound();
  const sectionKey = key as (typeof PROFILE_SECTION_KEYS)[number];
  const user = await requirePageAccess("content:read", `/admin/profil/${key}`);
  const initial = await getProfileSectionForEdit(sectionKey);
  const canWrite = satisfies(user.role, "content:write");
  return (
    <>
      <AdminPageHeading back={{ href: "/admin/profil", label: "Profile pages" }} title={PROFILE_SECTION_LABELS[sectionKey].label} description={PROFILE_SECTION_LABELS[sectionKey].where} />
      {!canWrite ? <ReadOnlyNotice>Read-only: your role can view content but not edit it.</ReadOnlyNotice> : null}
      <ProfileEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")} />
    </>
  );
}
