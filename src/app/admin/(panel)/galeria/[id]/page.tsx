import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, ReadOnlyNotice } from "@/components/admin/ui";
import { satisfies } from "@/config/rbac";
import type { AppLocale } from "@/config/locales";
import { adminDate } from "@/lib/admin-format";
import { getServerEnv } from "@/lib/env";
import { requirePageAccess } from "@/lib/security/guards";
import { emptyTranslations } from "@/modules/content/admin-schema";
import { albumEventOptions, getAlbumForEdit } from "@/modules/gallery/queries";
import { GALLERY_TRANSLATION_FIELDS } from "@/modules/gallery/schema";
import { AlbumEditor } from "../album-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.gallery");
  return { title: t("metaTitleOne") };
}

/** /admin/galeria/baru creates an album; /admin/galeria/:id edits (read-only without content:write). */
export default async function AlbumEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const isNew = id === "baru";
  const user = await requirePageAccess(isNew ? "content:write" : "content:read", `/admin/galeria/${id}`);
  const canWrite = satisfies(user.role, "content:write");
  const [album, events, t, locale, { saved }] = await Promise.all([isNew ? null : getAlbumForEdit(id), albumEventOptions(), getTranslations("admin.gallery"), getLocale(), searchParams]);
  if (!isNew && !album) notFound();
  const env = getServerEnv();
  const tr = album?.values.translations;
  const title = tr ? tr.TET.title || tr.PT.title || tr.ID.title || tr.EN.title || album!.values.slug : t("newTitle");

  return (
    <>
      <AdminPageHeading back={{ href: "/admin/galeria", label: t("allAlbums") }} title={title} description={saved ? t("createdDraft") : t("editDescription")} />
      {!canWrite ? <ReadOnlyNotice>{t("readOnly")}</ReadOnlyNotice> : null}
      <AlbumEditor
        initial={album?.values ?? { slug: "", takenOn: "", municipality: "", eventId: "", translations: emptyTranslations(GALLERY_TRANSLATION_FIELDS) }}
        initialItems={album?.items ?? []}
        existing={album ? { id: album.id, status: album.status, slug: album.values.slug } : null}
        events={events.map((e) => ({ id: e.id, label: `${adminDate(e.startAt, locale as AppLocale)} · ${e.title}` }))}
        readOnly={!canWrite}
        canPublish={satisfies(user.role, "content:publish")}
        limits={{ imageMb: Math.round(env.MAX_IMAGE_UPLOAD_BYTES / 1_048_576), fileMb: Math.round(env.MAX_MEDIA_FILE_BYTES / 1_048_576) }}
      />
    </>
  );
}
