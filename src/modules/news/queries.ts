import "server-only";
import type { Locale, Municipality, NewsCategory, Prisma } from "@prisma/client";
import { toDbLocale, type AppLocale } from "@/config/locales";
import { MUNICIPALITY_VALUES } from "@/config/municipalities";
import { db } from "@/lib/db";
import { pickTranslation, translationLocales } from "@/modules/content/translation";

export const NEWS_CATEGORIES = [
  "ORGANIZATION",
  "CIVIC_EDUCATION",
  "YOUTH",
  "COMMEMORATION",
  "PRESS_RELEASE",
] as const satisfies readonly NewsCategory[];

export const NEWS_PAGE_SIZE = 9;

export interface NewsListItem {
  slug: string;
  category: NewsCategory;
  publishedAt: Date;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  isFeatured: boolean;
  municipality: Municipality | null;
  title: string;
  excerpt: string;
}

/** Published = status PUBLISHED and a publish date that has arrived (supports scheduling). */
function publishedWhere(now: Date): Prisma.NewsArticleWhereInput {
  return { status: "PUBLISHED", publishedAt: { lte: now } };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Accent- and case-insensitive full-text match within the requested locale's translation. */
async function searchArticleIds(query: string, locale: AppLocale): Promise<string[]> {
  const pattern = `%${escapeLike(query.trim().toLowerCase())}%`;
  const dbLocale = toDbLocale(locale).toLowerCase();
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT a."id"
    FROM "news_articles" a
    JOIN "news_article_translations" t
      ON t."articleId" = a."id"
     -- Search the translation the reader actually sees: their language, or the Tetun fallback.
     AND (
       t."locale" = ${dbLocale}::"Locale"
       OR (t."locale" = 'tet' AND NOT EXISTS (
             SELECT 1 FROM "news_article_translations" x
             WHERE x."articleId" = a."id" AND x."locale" = ${dbLocale}::"Locale"))
     )
    WHERE a."status" = 'PUBLISHED'
      AND a."publishedAt" <= NOW()
      -- Bodies are HTML: match the text, not tag names or attributes.
      AND f_unaccent(lower(t."title" || ' ' || t."excerpt" || ' ' || regexp_replace(t."body", '<[^>]*>', ' ', 'g'))) LIKE f_unaccent(${pattern}) ESCAPE '\\'`;
  return rows.map((r) => r.id);
}

function toListItem(
  article: {
    slug: string;
    category: NewsCategory;
    publishedAt: Date | null;
    coverImageUrl: string | null;
    isFeatured: boolean;
    municipality: Municipality | null;
    translations: Array<{ locale: Locale; title: string; excerpt: string; coverImageAlt: string | null }>;
  },
  locale: AppLocale,
): NewsListItem | null {
  const tr = pickTranslation(article.translations, locale);
  if (!tr || !article.publishedAt) return null;
  return {
    slug: article.slug,
    category: article.category,
    publishedAt: article.publishedAt,
    coverImageUrl: article.coverImageUrl,
    coverImageAlt: tr.coverImageAlt,
    isFeatured: article.isFeatured,
    municipality: article.municipality,
    title: tr.title,
    excerpt: tr.excerpt,
  };
}

const listSelect = (locale: AppLocale) =>
  ({
    slug: true,
    category: true,
    publishedAt: true,
    coverImageUrl: true,
    isFeatured: true,
    municipality: true,
    translations: {
      where: { locale: { in: translationLocales(locale) } },
      select: { locale: true, title: true, excerpt: true, coverImageAlt: true },
    },
  }) satisfies Prisma.NewsArticleSelect;

export async function listPublishedNews(params: {
  locale: AppLocale;
  query?: string;
  category?: NewsCategory;
  municipality?: Municipality;
  tag?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: NewsListItem[]; total: number; page: number; pageCount: number }> {
  const now = new Date();
  const pageSize = params.pageSize ?? NEWS_PAGE_SIZE;
  const q = params.query?.trim().slice(0, 100);
  const ids = q ? await searchArticleIds(q, params.locale) : null;

  const where: Prisma.NewsArticleWhereInput = {
    ...publishedWhere(now),
    ...(params.category ? { category: params.category } : {}),
    ...(params.municipality ? { municipality: params.municipality } : {}),
    ...(params.tag ? { tags: { has: params.tag } } : {}),
    ...(ids ? { id: { in: ids } } : {}),
  };

  const total = await db.newsArticle.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  const rows = await db.newsArticle.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: listSelect(params.locale),
  });

  return {
    items: rows.map((r) => toListItem(r, params.locale)).filter((x): x is NewsListItem => x !== null),
    total,
    page,
    pageCount,
  };
}

export async function latestNews(locale: AppLocale, take = 3): Promise<NewsListItem[]> {
  const rows = await db.newsArticle.findMany({
    where: publishedWhere(new Date()),
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take,
    select: listSelect(locale),
  });
  return rows.map((r) => toListItem(r, locale)).filter((x): x is NewsListItem => x !== null);
}

export async function getPublishedArticle(slug: string, locale: AppLocale) {
  const article = await db.newsArticle.findFirst({
    where: { slug, ...publishedWhere(new Date()) },
    select: {
      ...listSelect(locale),
      updatedAt: true,
      byline: true,
      tags: true,
      documentId: true,
      translations: {
        where: { locale: { in: translationLocales(locale) } },
        select: { locale: true, title: true, excerpt: true, body: true, coverImageAlt: true },
      },
    },
  });
  if (!article?.publishedAt) return null;
  const tr = pickTranslation(article.translations, locale);
  if (!tr) return null;

  const related = await db.newsArticle.findMany({
    where: { ...publishedWhere(new Date()), category: article.category, slug: { not: slug } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: listSelect(locale),
  });

  return {
    slug: article.slug,
    category: article.category,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    coverImageUrl: article.coverImageUrl,
    title: tr.title,
    excerpt: tr.excerpt,
    body: tr.body,
    coverImageAlt: tr.coverImageAlt,
    municipality: article.municipality,
    byline: article.byline,
    tags: article.tags,
    documentId: article.documentId,
    /** Locale actually served (differs from the request when falling back to Tetun). */
    servedLocale: tr.locale,
    related: related.map((r) => toListItem(r, locale)).filter((x): x is NewsListItem => x !== null),
  };
}

export function isMunicipality(value: unknown): value is Municipality {
  return typeof value === "string" && (MUNICIPALITY_VALUES as readonly string[]).includes(value);
}

/** Tags in use on published articles (most used first), for the public filter. */
export async function popularNewsTags(take = 12): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ tag: string }>>`
    SELECT tag FROM (
      SELECT unnest(a."tags") AS tag FROM "news_articles" a
      WHERE a."status" = 'PUBLISHED' AND a."publishedAt" <= NOW()
    ) t
    GROUP BY tag ORDER BY count(*) DESC, tag ASC LIMIT ${take}`;
  return rows.map((r) => r.tag);
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === "string" && (NEWS_CATEGORIES as readonly string[]).includes(value);
}
