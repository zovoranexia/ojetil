import "server-only";
import type { Locale } from "@prisma/client";
import { ActionError } from "@/lib/actions";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import { rethrowSlugConflict } from "@/modules/content/admin-server";
import { filledLocales, toTranslationRows } from "@/modules/content/admin-schema";
import { DOCUMENT_TRANSLATION_FIELDS, documentFormSchema } from "./schema";
import { deleteDocumentFile, storeDocumentFile, type StoredDocumentFile } from "./storage";

type Input = ReturnType<typeof documentFormSchema.parse>;

function rows(input: Input) {
  return toTranslationRows<"title" | "description">(input.translations, DOCUMENT_TRANSLATION_FIELDS) as Array<{ locale: Locale; title: string; description: string | null }>;
}

/**
 * Create (file required) or update (file optional = replace) a document.
 * The new file is written first; if the database write fails it is removed
 * again, and a replaced file is deleted only after the commit.
 */
export async function saveDocument(params: { id?: string; input: Input; file: File | null; user: SessionUser }): Promise<{ id: string }> {
  const { id, input, file, user } = params;
  if (!id && !file) throw new ActionError("VALIDATION", "Choose a PDF file.", { file: ["Choose a PDF file."] });

  const stored: StoredDocumentFile | null = file ? await storeDocumentFile(file) : null;
  const translations = rows(input);
  let replacedKey: string | null = null;

  try {
    const saved = await db.$transaction(async (tx) => {
      if (id) {
        const previous = await tx.document.findUnique({ where: { id }, select: { fileKey: true } });
        if (!previous) throw new ActionError("NOT_FOUND", "Document not found.");
        if (stored) replacedKey = previous.fileKey;
        const doc = await tx.document.update({
          where: { id },
          data: { slug: input.slug, ...(stored ?? {}), translations: { deleteMany: {}, create: translations } },
          select: { id: true, status: true },
        });
        await recordAudit(
          {
            action: "CONTENT_UPDATED",
            actor: user,
            target: { type: "Document", id },
            metadata: { slug: input.slug, title: translations[0]!.title, fileReplaced: Boolean(stored), locales: filledLocales(input.translations, DOCUMENT_TRANSLATION_FIELDS) },
          },
          tx,
        );
        return doc;
      }
      const doc = await tx.document.create({
        data: { slug: input.slug, ...stored!, createdById: user.id, translations: { create: translations } },
        select: { id: true, status: true },
      });
      await recordAudit(
        {
          action: "CONTENT_CREATED",
          actor: user,
          target: { type: "Document", id: doc.id },
          metadata: { slug: input.slug, title: translations[0]!.title, fileName: stored!.fileName, fileSize: stored!.fileSize, sha256: stored!.sha256 },
        },
        tx,
      );
      return doc;
    });
    if (replacedKey) await deleteDocumentFile(replacedKey).catch(() => undefined);
    return { id: saved.id };
  } catch (error) {
    if (stored) await deleteDocumentFile(stored.fileKey).catch(() => undefined);
    if (error instanceof ActionError) throw error;
    rethrowSlugConflict(error);
  }
}
