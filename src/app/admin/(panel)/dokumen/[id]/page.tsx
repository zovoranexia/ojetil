import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { getDocumentForEdit } from "@/modules/documents/queries";
import { DOCUMENT_TRANSLATION_FIELDS } from "@/modules/documents/schema";
import { DocumentEditor } from "../document-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.documents");
  return { title: t("metaTitleOne") };
}

/** /admin/dokumen/baru uploads a new PDF; /admin/dokumen/:id edits (read-only without content:write). */
export default async function DocumentEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "content:write" : "content:read", `/admin/dokumen/${id}`);
  const canWrite = satisfies(user.role, "content:write");
  const doc = isNew ? null : await getDocumentForEdit(id);
  if (!isNew && !doc) notFound();
  const { saved } = await searchParams;
  const t = await getTranslations("admin.documents");

  return (
    <>
      <AdminPageHeading
        back={{ href: "/admin/dokumen", label: t("allDocuments") }}
        title={doc ? doc.values.translations.TET.title || doc.values.slug : t("newTitle")}
        description={saved ? t("uploadedDraft") : t("editDescription")}
      />
      {!canWrite ? <ReadOnlyNotice>{t("readOnly")}</ReadOnlyNotice> : null}
      <DocumentEditor
        initial={doc?.values ?? { slug: "", translations: emptyTranslations(DOCUMENT_TRANSLATION_FIELDS) }}
        existing={doc ? { id: doc.id, status: doc.status, fileName: doc.fileName, fileSize: doc.fileSize, articleCount: doc.articles.length } : null}
        readOnly={!canWrite}
        canPublish={satisfies(user.role, "content:publish")}
        maxBytes={getServerEnv().MAX_DOCUMENT_BYTES}
      />
    </>
  );
}
