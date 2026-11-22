import "server-only";
import type { ContentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDiliLocalInput } from "@/lib/dates";
import { fromTranslationRows } from "@/modules/content/admin-schema";
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
    translations: fromTranslationRows(a.translations, NEWS_TRANSLATION_FIELDS),
  };
}
