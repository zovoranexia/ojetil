import "server-only";
import { db } from "@/lib/db";
import { diliParts } from "@/lib/dates";

/** Today's Díli calendar date as a UTC-midnight Date (matches @db.Date). */
function diliToday(now = new Date()): Date {
  const p = diliParts(now);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/**
 * Counts one read of a published article. Stores only a per-day counter —
 * no IP, cookie or visitor id. Returns false for unknown/unpublished slugs.
 */
export async function recordArticleView(slug: string, now = new Date()): Promise<boolean> {
  const article = await db.newsArticle.findFirst({ where: { slug, status: "PUBLISHED", publishedAt: { lte: now } }, select: { id: true } });
  if (!article) return false;
  const day = diliToday(now);
  await db.newsViewDay.upsert({
    where: { articleId_day: { articleId: article.id, day } },
    create: { articleId: article.id, day, views: 1 },
    update: { views: { increment: 1 } },
  });
  return true;
}

/** Most-read articles over the last `days` days (Díli dates), with the Tetun (or first) title. */
export async function mostReadArticles(days = 30, take = 5) {
  const since = new Date(diliToday().getTime() - (days - 1) * 86_400_000);
  const groups = await db.newsViewDay.groupBy({
    by: ["articleId"],
    where: { day: { gte: since } },
    _sum: { views: true },
    orderBy: { _sum: { views: "desc" } },
    take,
  });
  const [total, articles] = await Promise.all([
    db.newsViewDay.aggregate({ where: { day: { gte: since } }, _sum: { views: true } }),
    db.newsArticle.findMany({
      where: { id: { in: groups.map((g) => g.articleId) } },
      select: { id: true, slug: true, translations: { select: { locale: true, title: true } } },
    }),
  ]);
  const byId = new Map(articles.map((a) => [a.id, a]));
  return {
    total: total._sum.views ?? 0,
    items: groups.map((g) => {
      const a = byId.get(g.articleId);
      const title = (a?.translations.find((t) => t.locale === "TET") ?? a?.translations[0])?.title ?? a?.slug ?? "—";
      return { id: g.articleId, slug: a?.slug ?? "", title, views: g._sum.views ?? 0 };
    }),
  };
}
