import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { NEWS_TRANSLATION_FIELDS, type NewsFormValues } from "@/modules/news/admin-schema";
import { getNewsForEdit } from "@/modules/news/admin-queries";
import { NewsEditor } from "../news-editor";

export const metadata: Metadata = { title: "Edit article" };

/** /admin/berita/baru creates; /admin/berita/:id edits (read-only for roles without content:write). */
export default async function NewsEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "content:write" : "content:read", `/admin/berita/${id}`);
  const canWrite = satisfies(user.role, "content:write");

  const initial: NewsFormValues | null = isNew
    ? {
        slug: "",
        category: "ORGANIZATION",
        status: "DRAFT",
        publishedAt: "",
        isFeatured: false,
        coverImageUrl: "",
        translations: emptyTranslations(NEWS_TRANSLATION_FIELDS),
      }
    : await getNewsForEdit(id);
  if (!initial) notFound();
  const { saved } = await searchParams;

  return (
    <>
      <AdminPageHeading
        back={{ href: "/admin/berita", label: "All news" }}
        title={isNew ? "New article" : initial.translations.TET.title || initial.slug}
        description={saved ? "Article created." : undefined}
      />
      {!canWrite ? <ReadOnlyNotice>Read-only: your role can view content but not edit it.</ReadOnlyNotice> : null}
      <NewsEditor initial={initial} readOnly={!canWrite} canPublish={satisfies(user.role, "content:publish")} />
    </>
  );
}
