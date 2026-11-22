import { db } from "@/lib/db";
import { PiiDecryptionError } from "@/lib/security/crypto";
import { readCardAccessToken } from "@/modules/members/card";
import { readProfilePhoto } from "@/modules/members/photo-storage";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * GET /api/members/card-photo/<card-access token> — the member's own photo for
 * their digital card. Only a valid, unexpired token (issued after code + date of
 * birth were proven) opens it, and only for a VERIFIED member. Never cached.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const id = readCardAccessToken((await params).token);
  if (!id) return notFound();
  const m = await db.memberRegistration.findUnique({ where: { id }, select: { status: true, profilePhotoKey: true } });
  if (!m || m.status !== "VERIFIED" || !m.profilePhotoKey) return notFound();

  let image: Buffer;
  try {
    image = await readProfilePhoto(m.profilePhotoKey);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT" || error instanceof PiiDecryptionError) return notFound();
    throw error;
  }
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
