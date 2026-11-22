import "server-only";
import type { ContentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDiliLocalInput } from "@/lib/dates";
import { looksLikeHtml, markdownToHtml } from "@/lib/content/markdown-to-html";
import { fromTranslationRows } from "@/modules/content/admin-schema";
import { publishedDocumentOptions } from "@/modules/documents/queries";
import { NEWS_TRANSLATION_FIELDS, type NewsFormValues } from "./admin-schema";

export async function listNewsAdmin(params: { q?: string; status?: ContentStatus; page: number }) {
  const pageSize = 20;
  const where: Prisma.NewsArticleWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { slug: { contains: params.q, mode: "insensitive" } },
            { translations: { some: { title: { contains: params.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const total = await db.newsArticle.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(params.page, pageCount);
  const rows = await db.newsArticle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      category: true,
      status: true,
      isFeatured: true,
      coverImageUrl: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      translations: { select: { locale: true, title: true } },
    },
  });
  return {
    items: rows.map((r) => ({
      ...r,
      title: r.translations.find((t) => t.locale === "TET")?.title ?? r.translations[0]?.title ?? r.slug,
      locales: r.translations.map((t) => t.locale),
    })),
    total,
    page,
    pageCount,
  };
}

export async function getNewsForEdit(id: string): Promise<NewsFormValues | null> {
  const a = await db.newsArticle.findUnique({ where: { id }, include: { translations: true } });
  if (!a) return null;
  return {
    id: a.id,
    slug: a.slug,
    category: a.category,
    status: a.status,
    publishedAt: toDiliLocalInput(a.publishedAt),
    isFeatured: a.isFeatured,
    coverImageUrl: a.coverImageUrl ?? "",
    municipality: a.municipality ?? "",
    byline: a.byline ?? "",
    tags: a.tags.join(", "),
    documentId: a.documentId ?? "",
    translations: fromTranslationRows(
      // Legacy Markdown bodies open in the rich-text editor as equivalent HTML.
      a.translations.map((t) => ({ ...t, body: looksLikeHtml(t.body) ? t.body : markdownToHtml(t.body) })),
      NEWS_TRANSLATION_FIELDS,
    ),
  };
}

/** Attachment dropdown: published documents, plus the current one if it has since been unpublished. */
export async function documentOptionsFor(currentId: string | null) {
  const options: Array<{ id: string; title: string; fileSize: number; unpublished?: boolean }> = await publishedDocumentOptions();
  if (currentId && !options.some((o) => o.id === currentId)) {
    const doc = await db.document.findUnique({ where: { id: currentId }, select: { id: true, slug: true, fileSize: true, translations: { where: { locale: "TET" }, select: { title: true } } } });
    if (doc) options.unshift({ id: doc.id, title: doc.translations[0]?.title ?? doc.slug, fileSize: doc.fileSize, unpublished: true });
  }
  return options;
}
