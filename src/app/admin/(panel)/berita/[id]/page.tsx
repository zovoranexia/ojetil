import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { NEWS_TRANSLATION_FIELDS, type NewsFormValues } from "@/modules/news/admin-schema";
import { documentOptionsFor, getNewsForEdit } from "@/modules/news/admin-queries";
import { NewsEditor } from "../news-editor";

export const metadata: Metadata = { title: "Edit post" };

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
        municipality: "",
        byline: "",
        tags: "",
        documentId: "",
        translations: emptyTranslations(NEWS_TRANSLATION_FIELDS),
      }
    : await getNewsForEdit(id);
  if (!initial) notFound();
  const [{ saved }, documents] = await Promise.all([searchParams, documentOptionsFor(initial.documentId || null)]);

  return (
    <>
      <AdminPageHeading
        back={{ href: "/admin/berita", label: "News & articles" }}
        title={isNew ? "New post" : initial.translations.TET.title || initial.slug}
        description={saved ? "Draft saved. You can now publish or schedule it." : undefined}
      />
      {!canWrite ? <ReadOnlyNotice>Read-only: your role can view content but not edit it.</ReadOnlyNotice> : null}
      <NewsEditor
        key={initial.id ?? "new"}
        initial={initial}
        readOnly={!canWrite}
        canPublish={satisfies(user.role, "content:publish")}
        documents={documents}
        maxImageBytes={getServerEnv().MAX_IMAGE_UPLOAD_BYTES}
        publishedSlug={initial.status === "PUBLISHED" ? initial.slug : null}
      />
    </>
  );
}
