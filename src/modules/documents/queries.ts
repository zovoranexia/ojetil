import "server-only";
import type { ContentStatus, DocumentCategory, Locale, Prisma } from "@prisma/client";
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
      category: true,
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
  const values: DocumentFormValues = { slug: d.slug, category: d.category, translations: fromTranslationRows(d.translations, DOCUMENT_TRANSLATION_FIELDS) };
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

export interface PublicDocument {
  slug: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  fileSize: number;
  publishedAt: Date;
  servedLocale: Locale;
}

const PUBLIC_PAGE_SIZE = 20;

/** Year bounds in Díli time (UTC+9, no DST): 00:00 on 1 January. */
const diliYearStart = (year: number) => new Date(Date.UTC(year, 0, 1, -9));

/** Public document library (/dokumentu): published only, newest first. */
export async function listPublishedDocuments(params: { locale: AppLocale; query?: string; category?: DocumentCategory; year?: number; page: number }) {
  const where: Prisma.DocumentWhereInput = {
    status: "PUBLISHED",
    publishedAt: params.year ? { gte: diliYearStart(params.year), lt: diliYearStart(params.year + 1) } : { not: null },
    ...(params.category ? { category: params.category } : {}),
    ...(params.query
      ? {
          translations: {
            some: { OR: [{ title: { contains: params.query, mode: "insensitive" } }, { description: { contains: params.query, mode: "insensitive" } }] },
          },
        }
      : {}),
  };
  const total = await db.document.count({ where });
  const pageCount = Math.max(Math.ceil(total / PUBLIC_PAGE_SIZE), 1);
  const page = Math.min(params.page, pageCount);
  const rows = await db.document.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PUBLIC_PAGE_SIZE,
    take: PUBLIC_PAGE_SIZE,
    select: {
      slug: true,
      category: true,
      fileSize: true,
      publishedAt: true,
      translations: { where: { locale: { in: translationLocales(params.locale) } }, select: { locale: true, title: true, description: true } },
    },
  });
  const items: PublicDocument[] = [];
  for (const r of rows) {
    const tr = pickTranslation(r.translations, params.locale);
    if (!tr || !r.publishedAt) continue;
    items.push({ slug: r.slug, category: r.category, fileSize: r.fileSize, publishedAt: r.publishedAt, title: tr.title, description: tr.description, servedLocale: tr.locale });
  }
  return { items, total, page, pageCount };
}

/** Years (Díli time) that have at least one published document, newest first — for the year filter. */
export async function publishedDocumentYears(): Promise<number[]> {
  const rows = await db.$queryRaw<Array<{ year: number }>>`
    SELECT DISTINCT EXTRACT(YEAR FROM ("publishedAt" AT TIME ZONE 'Asia/Dili'))::int AS year
    FROM documents WHERE status = 'PUBLISHED' AND "publishedAt" IS NOT NULL
    ORDER BY year DESC`;
  return rows.map((r) => r.year);
}

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
