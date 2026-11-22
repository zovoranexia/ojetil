import "server-only";
import type { ContentStatus, Prisma } from "@prisma/client";
import type { AppLocale } from "@/config/locales";
import { db } from "@/lib/db";
import { fromTranslationRows } from "@/modules/content/admin-schema";
import { pickTranslation, translationLocales } from "@/modules/content/translation";
import { DOCUMENT_TRANSLATION_FIELDS, type DocumentFormValues } from "./schema";

/* ── Backoffice ───────────────────────────────────────────────────────────── */

export async function listDocumentsAdmin(params: { q?: string; status?: ContentStatus; page: number }) {
  const pageSize = 20;
  const where: Prisma.DocumentWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { slug: { contains: params.q, mode: "insensitive" } },
            { fileName: { contains: params.q, mode: "insensitive" } },
            { translations: { some: { title: { contains: params.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const total = await db.document.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(params.page, pageCount);
  const rows = await db.document.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      status: true,
      fileName: true,
      fileSize: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      translations: { select: { locale: true, title: true } },
      _count: { select: { newsArticles: true } },
    },
  });
  return {
    items: rows.map((r) => ({
      ...r,
      title: r.translations.find((t) => t.locale === "TET")?.title ?? r.slug,
      locales: r.translations.map((t) => t.locale),
    })),
    total,
    page,
    pageCount,
  };
}

export async function getDocumentForEdit(id: string) {
  const d = await db.document.findUnique({
    where: { id },
    include: { translations: true, newsArticles: { select: { id: true, slug: true }, take: 10 } },
  });
  if (!d) return null;
  const values: DocumentFormValues = { slug: d.slug, translations: fromTranslationRows(d.translations, DOCUMENT_TRANSLATION_FIELDS) };
  return {
    id: d.id,
    status: d.status,
    fileName: d.fileName,
    fileSize: d.fileSize,
    sha256: d.sha256,
    updatedAt: d.updatedAt,
    articles: d.newsArticles,
    values,
  };
}

/** Options for the news editor's "PDF attachment" dropdown: published documents only. */
export async function publishedDocumentOptions(): Promise<Array<{ id: string; title: string; fileSize: number }>> {
  const rows = await db.document.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: { id: true, slug: true, fileSize: true, translations: { where: { locale: "TET" }, select: { title: true } } },
  });
  return rows.map((r) => ({ id: r.id, title: r.translations[0]?.title ?? r.slug, fileSize: r.fileSize }));
}

/* ── Public ──────────────────────────────────────────────────────────────── */

export async function getPublishedDocumentFile(slug: string) {
  return db.document.findFirst({ where: { slug, status: "PUBLISHED" }, select: { fileKey: true, sha256: true, fileSize: true, updatedAt: true } });
}

export async function getPublishedDocumentSummary(id: string, locale: AppLocale) {
  const doc = await db.document.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { slug: true, fileSize: true, translations: { where: { locale: { in: translationLocales(locale) } }, select: { locale: true, title: true, description: true } } },
  });
  if (!doc) return null;
  const tr = pickTranslation(doc.translations, locale);
  if (!tr) return null;
  return { slug: doc.slug, fileSize: doc.fileSize, title: tr.title, description: tr.description, servedLocale: tr.locale };
}
