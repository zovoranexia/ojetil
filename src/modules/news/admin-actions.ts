"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/config/rbac";
import { ActionError, authorizedAction } from "@/lib/actions";
import { articlePlainText, isEmptyArticleHtml, sanitizeArticleHtml } from "@/lib/content/sanitize";
import { db } from "@/lib/db";
import { fromDiliLocalInput, toDiliLocalInput } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { recordAudit } from "@/modules/audit/service";
import { contentAuditActions, rethrowSlugConflict } from "@/modules/content/admin-server";
import { filledLocales, toTranslationRows, type ContentLocale } from "@/modules/content/admin-schema";
import { NEWS_TRANSLATION_FIELDS, newsFormSchema, parseTags } from "./admin-schema";

type NewsRow = { locale: ContentLocale; title: string; excerpt: string | null; body: string; coverImageAlt: string | null };

/** First sentences of the content, cut at a word boundary — used when Summary is left empty. */
function deriveExcerpt(body: string): string {
  const text = articlePlainText(body);
  if (text.length <= 200) return text;
  const cut = text.slice(0, 200);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 120))}…`;
}

/** Sanitises bodies and fills derived summaries; reports empty content per language. */
function prepareTranslations(rows: NewsRow[]): Array<Omit<NewsRow, "excerpt"> & { excerpt: string }> {
  const fieldErrors: Record<string, string[]> = {};
  const out = rows.map((row) => {
    const body = sanitizeArticleHtml(row.body ?? "");
    if (isEmptyArticleHtml(body)) {
      fieldErrors[`translations.${row.locale}.body`] = [row.locale === "TET" ? "Content (Tetun) is required." : "Content is required once this language is started."];
    }
    return { ...row, body, excerpt: row.excerpt?.trim() || deriveExcerpt(body) };
  });
  if (Object.keys(fieldErrors).length) throw new ActionError("VALIDATION", "Please correct the highlighted fields (check every language tab).", fieldErrors);
  return out;
}

async function uniqueSlug(tx: Prisma.TransactionClient, base: string, excludeId: string | undefined): Promise<string> {
  const taken = new Set(
    (await tx.newsArticle.findMany({ where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { slug: true } })).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base.slice(0, 90)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new ActionError("CONFLICT", "Could not generate a free address; enter one manually.", { slug: ["Enter a different address."] });
}

/** Create or update a news article with all four locales in one transaction (+ audit). */
export const saveNewsArticle = authorizedAction("content:write", newsFormSchema, async (input, user) => {
  if (input.status === "PUBLISHED" && !hasPermission(user.role, "content:publish")) {
    throw new ActionError("FORBIDDEN", "Your role cannot publish content.");
  }
  let publishedAt: Date | null = null;
  if (input.publishedAt) {
    publishedAt = fromDiliLocalInput(input.publishedAt);
    if (!publishedAt) throw new ActionError("VALIDATION", "Check the publication date.", { publishedAt: ["Invalid date and time."] });
  }

  const translations = prepareTranslations(toTranslationRows(input.translations, NEWS_TRANSLATION_FIELDS) as unknown as NewsRow[]);
  const tetTitle = translations.find((t) => t.locale === "TET")!.title;
  const autoSlug = input.slug === "";
  const baseSlug = autoSlug ? slugify(tetTitle) : input.slug;
  if (baseSlug.length < 3) throw new ActionError("VALIDATION", "Enter an address (slug).", { slug: ["The title is too short to generate an address; enter one manually."] });
  const tags = parseTags(input.tags);

  try {
    const saved = await db.$transaction(async (tx) => {
      const previous = input.id ? await tx.newsArticle.findUnique({ where: { id: input.id }, select: { status: true, publishedAt: true, documentId: true } }) : null;
      if (input.id && !previous) throw new ActionError("NOT_FOUND", "Article not found.");

      // Attachments: only published documents may be newly attached.
      const documentId = input.documentId || null;
      if (documentId && documentId !== previous?.documentId) {
        const doc = await tx.document.findUnique({ where: { id: documentId }, select: { status: true } });
        if (doc?.status !== "PUBLISHED") throw new ActionError("VALIDATION", "Only published documents can be attached.", { documentId: ["Choose a published document."] });
      }

      const slug = autoSlug ? await uniqueSlug(tx, baseSlug, input.id) : baseSlug;
      // Publishing without a date publishes now; later edits keep the original date,
      // except a scheduled (future) date, which "publish immediately" replaces.
      const now = new Date();
      const keptDate = previous?.publishedAt && previous.publishedAt <= now ? previous.publishedAt : now;
      const effectivePublishedAt = publishedAt ?? (input.status === "PUBLISHED" ? keptDate : null);
      const data = {
        slug,
        category: input.category,
        status: input.status,
        isFeatured: input.isFeatured,
        coverImageUrl: input.coverImageUrl || null,
        publishedAt: effectivePublishedAt,
        municipality: input.municipality || null,
        byline: input.byline || null,
        tags,
        documentId,
      };

      const article = input.id
        ? await tx.newsArticle.update({ where: { id: input.id }, data: { ...data, translations: { deleteMany: {}, create: translations } }, select: { id: true, slug: true } })
        : await tx.newsArticle.create({ data: { ...data, authorId: user.id, translations: { create: translations } }, select: { id: true, slug: true } });

      const scheduled = input.status === "PUBLISHED" && effectivePublishedAt !== null && effectivePublishedAt.getTime() > Date.now();
      for (const action of contentAuditActions(previous?.status ?? null, input.status)) {
        await recordAudit(
          {
            action,
            actor: user,
            target: { type: "NewsArticle", id: article.id },
            metadata: {
              slug,
              title: tetTitle,
              locales: filledLocales(input.translations, NEWS_TRANSLATION_FIELDS),
              status: input.status,
              publishedAt: effectivePublishedAt?.toISOString() ?? null,
              scheduled,
              documentId,
            },
          },
          tx,
        );
      }
      return { ...article, publishedAt: effectivePublishedAt };
    });

    revalidatePath("/admin/berita");
    return { id: saved.id, slug: saved.slug, publishedAt: toDiliLocalInput(saved.publishedAt) };
  } catch (error) {
    if (error instanceof ActionError) throw error;
    rethrowSlugConflict(error);
  }
});

export const deleteNewsArticle = authorizedAction("content:write", z.object({ id: z.string().min(1) }), async ({ id }, user) => {
  await db.$transaction(async (tx) => {
    const article = await tx.newsArticle.findUnique({ where: { id }, select: { slug: true, status: true } });
    if (!article) throw new ActionError("NOT_FOUND", "Article not found.");
    await tx.newsArticle.delete({ where: { id } });
    await recordAudit({ action: "CONTENT_DELETED", actor: user, target: { type: "NewsArticle", id }, metadata: { slug: article.slug, status: article.status } }, tx);
  });
  revalidatePath("/admin/berita");
  return { id };
});
