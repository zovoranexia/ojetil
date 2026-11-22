"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/config/rbac";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { fromDiliLocalInput } from "@/lib/dates";
import { recordAudit } from "@/modules/audit/service";
import { contentAuditActions, rethrowSlugConflict } from "@/modules/content/admin-server";
import { filledLocales, toTranslationRows } from "@/modules/content/admin-schema";
import { NEWS_TRANSLATION_FIELDS, newsFormSchema } from "./admin-schema";

type NewsRow = { title: string; excerpt: string; body: string; coverImageAlt: string | null };

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

  const translations = toTranslationRows<keyof NewsRow>(input.translations, NEWS_TRANSLATION_FIELDS) as Array<{ locale: "TET" | "PT" | "ID" | "EN" } & NewsRow>;
  const tetTitle = translations.find((t) => t.locale === "TET")!.title;

  try {
    const saved = await db.$transaction(async (tx) => {
      const previous = input.id ? await tx.newsArticle.findUnique({ where: { id: input.id }, select: { status: true, publishedAt: true } }) : null;
      if (input.id && !previous) throw new ActionError("NOT_FOUND", "Article not found.");

      // Publishing without a date publishes now; keep the original date on later edits.
      const effectivePublishedAt = publishedAt ?? (input.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : null);
      const data = {
        slug: input.slug,
        category: input.category,
        status: input.status,
        isFeatured: input.isFeatured,
        coverImageUrl: input.coverImageUrl || null,
        publishedAt: effectivePublishedAt,
      };

      const article = input.id
        ? await tx.newsArticle.update({ where: { id: input.id }, data: { ...data, translations: { deleteMany: {}, create: translations } }, select: { id: true } })
        : await tx.newsArticle.create({ data: { ...data, authorId: user.id, translations: { create: translations } }, select: { id: true } });

      for (const action of contentAuditActions(previous?.status ?? null, input.status)) {
        await recordAudit(
          {
            action,
            actor: user,
            target: { type: "NewsArticle", id: article.id },
            metadata: { slug: input.slug, title: tetTitle, locales: filledLocales(input.translations, NEWS_TRANSLATION_FIELDS), status: input.status },
          },
          tx,
        );
      }
      return article;
    });

    revalidatePath("/admin/berita");
    return { id: saved.id };
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
