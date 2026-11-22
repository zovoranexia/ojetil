import { SLUG_PATTERN } from "@/lib/slug";
import { getPublishedDocumentFile } from "@/modules/documents/queries";
import { readDocumentFile } from "@/modules/documents/storage";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * GET /documents/<slug>.pdf — public download of a PUBLISHED document.
 * Drafts and unpublished documents answer 404 (no existence leak).
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const slug = file.replace(/\.pdf$/i, "");
  if (slug === file || !SLUG_PATTERN.test(slug)) return notFound();

  const doc = await getPublishedDocumentFile(slug);
  if (!doc) return notFound();
  const etag = `"${doc.sha256.slice(0, 32)}"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });

  const data = await readDocumentFile(doc.fileKey);
  if (!data) return notFound();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      // Short shared cache: unpublishing must take effect quickly.
      "Cache-Control": "public, max-age=300",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
