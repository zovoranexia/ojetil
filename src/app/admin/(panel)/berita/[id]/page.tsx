import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { NEWS_TRANSLATION_FIELDS, type NewsFormValues } from "@/modules/news/admin-schema";
import { documentOptionsFor, getNewsForEdit } from "@/modules/news/admin-queries";
import { NewsEditor } from "../news-editor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, t] = await Promise.all([params, getTranslations("admin.news.meta")]);
  return { title: id === "baru" ? t("new") : t("edit") };
}

/** /admin/berita/baru creates; /admin/berita/:id edits (read-only for roles without content:write). */
export default async function NewsEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "content:write" : "content:read", `/admin/berita/${id}`);
  const canWrite = satisfies(user.role, "content:write");
  const t = await getTranslations("admin.news.edit");

  const initial: NewsFormValues | null = isNew
    ? {
        slug: "",
        category: "NEWS",
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
        back={{ href: "/admin/berita", label: t("back") }}
        title={isNew ? t("newTitle") : (["TET", "PT", "ID", "EN"] as const).map((l) => initial.translations[l].title).find(Boolean) || initial.slug}
        description={saved ? t("savedNotice") : undefined}
      />
      {!canWrite ? <ReadOnlyNotice>{t("readOnly")}</ReadOnlyNotice> : null}
      <NewsEditor
        key={initial.id ?? "new"}
        initial={initial}
        readOnly={!canWrite}
        canPublish={satisfies(user.role, "content:publish")}
        documents={documents}
        maxImageBytes={getServerEnv().MAX_IMAGE_UPLOAD_BYTES}
        maxMediaBytes={getServerEnv().MAX_MEDIA_FILE_BYTES}
        publishedSlug={initial.status === "PUBLISHED" ? initial.slug : null}
      />
    </>
  );
}
