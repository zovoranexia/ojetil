import { readPublicUpload } from "@/lib/uploads/public-images";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { webp: "image/webp", pdf: "application/pdf", mp4: "video/mp4", mp3: "audio/mpeg" };

/**
 * GET /uploads/<key> — public editorial media (images, and Media library PDF /
 * MP4 / MP3). File names are random and never reused, so responses are
 * immutable. Byte ranges are supported so audio/video can be streamed and
 * seeked. In production Nginx serves PUBLIC_UPLOAD_DIR directly (see
 * docs/DEPLOYMENT.md); this route is the fallback.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  const file = await readPublicUpload(key);
  if (!file) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const headers: Record<string, string> = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Last-Modified": file.mtime.toUTCString(),
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  // Images and media never need to run anything; the PDF viewer keeps its defaults.
  if (ext !== "pdf") headers["Content-Security-Policy"] = "default-src 'none'; media-src 'self'; style-src 'unsafe-inline'";

  const size = file.data.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    start = Math.max(start, 0);
    return new Response(new Uint8Array(file.data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(file.data), { headers: { ...headers, "Content-Length": String(size) } });
}
