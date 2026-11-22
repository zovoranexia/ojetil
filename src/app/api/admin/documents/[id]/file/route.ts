import { db } from "@/lib/db";
import { withApiAuth } from "@/lib/security/guards";
import { readDocumentFile } from "@/modules/documents/storage";

export const runtime = "nodejs";

/** GET /api/admin/documents/:id/file — lets backoffice users open any document, drafts included. */
export const GET = withApiAuth<{ id: string }>("content:read", async (_request, _user, { params }) => {
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id }, select: { fileKey: true, fileName: true } });
  const data = doc ? await readDocumentFile(doc.fileKey) : null;
  if (!doc || !data) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
