"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { recordAudit } from "@/modules/audit/service";
import { deleteDocumentFile } from "./storage";

const idSchema = z.object({ id: z.string().min(1) });

async function setStatus(id: string, publish: boolean, user: Parameters<typeof recordAudit>[0]["actor"]) {
  await db.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id }, select: { slug: true, status: true, publishedAt: true } });
    if (!doc) throw new ActionError("NOT_FOUND", "Document not found.");
    if (publish === (doc.status === "PUBLISHED")) return;
    await tx.document.update({
      where: { id },
      data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? (doc.publishedAt ?? new Date()) : doc.publishedAt },
    });
    await recordAudit(
      { action: publish ? "CONTENT_PUBLISHED" : "CONTENT_UNPUBLISHED", actor: user, target: { type: "Document", id }, metadata: { slug: doc.slug } },
      tx,
    );
  });
  revalidatePath("/admin/dokumen");
}

export const publishDocument = authorizedAction("content:publish", idSchema, async ({ id }, user) => {
  await setStatus(id, true, user);
  return { id };
});

export const unpublishDocument = authorizedAction("content:publish", idSchema, async ({ id }, user) => {
  await setStatus(id, false, user);
  return { id };
});

/** Deletes the record and its file. Articles that attached it simply lose the attachment (FK SET NULL). */
export const deleteDocument = authorizedAction("content:write", idSchema, async ({ id }, user) => {
  const fileKey = await db.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id }, select: { slug: true, status: true, fileKey: true, fileName: true, _count: { select: { newsArticles: true } } } });
    if (!doc) throw new ActionError("NOT_FOUND", "Document not found.");
    await tx.document.delete({ where: { id } });
    await recordAudit(
      {
        action: "CONTENT_DELETED",
        actor: user,
        target: { type: "Document", id },
        metadata: { slug: doc.slug, status: doc.status, fileName: doc.fileName, detachedFromArticles: doc._count.newsArticles },
      },
      tx,
    );
    return doc.fileKey;
  });
  await deleteDocumentFile(fileKey).catch(() => undefined);
  revalidatePath("/admin/dokumen");
  return { id };
});
