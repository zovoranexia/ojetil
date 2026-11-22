import { readPublicImage } from "@/lib/uploads/public-images";

export const runtime = "nodejs";

/**
 * GET /uploads/<key>.webp — public editorial images. File names are random
 * and never reused, so responses are immutable. In production Nginx can serve
 * PUBLIC_UPLOAD_DIR directly (see docs/DEPLOYMENT.md); this route is the fallback.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const image = await readPublicImage(path.join("/"));
  if (!image) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(image.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": image.mtime.toUTCString(),
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
