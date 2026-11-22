/** Client helper: uploads an editorial image and returns its public URL (or a readable error). */
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export async function uploadEditorialImage(file: File, maxBytes: number): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!file.type.startsWith("image/")) return { ok: false, message: "Choose an image file (JPEG, PNG, WebP, GIF or AVIF)." };
  if (file.size > maxBytes) return { ok: false, message: `The image is larger than ${Math.round(maxBytes / 1_048_576)} MB.` };
  const body = new FormData();
  body.set("file", file);
  try {
    const res = await fetch("/api/admin/uploads/image", { method: "POST", body });
    const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
    if (!res.ok || !json.url) return { ok: false, message: json.message ?? "Upload failed. Please try again." };
    return { ok: true, url: json.url };
  } catch {
    return { ok: false, message: "Upload failed. Check your connection and try again." };
  }
}
