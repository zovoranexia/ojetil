import { db } from "@/lib/db";
import { PiiDecryptionError } from "@/lib/security/crypto";
import { withApiAuth } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import { readProfilePhoto } from "@/modules/members/photo-storage";

export const runtime = "nodejs";

/** GET /api/admin/members/:id/photo — decrypts and streams a member photo (members:pii, audited, never cached). */
export const GET = withApiAuth<{ id: string }>("members:pii", async (_request, user, { params }) => {
  const { id } = await params;
  const member = await db.memberRegistration.findUnique({ where: { id }, select: { profilePhotoKey: true, trackingCode: true } });
  if (!member?.profilePhotoKey) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  let image: Buffer;
  try {
    image = await readProfilePhoto(member.profilePhotoKey);
  } catch (error) {
    // File moved/deleted (ENOENT) or encrypted with a retired key: a missing photo, not a server crash.
    const missing = (error as NodeJS.ErrnoException)?.code === "ENOENT" || error instanceof PiiDecryptionError;
    if (!missing) throw error;
    console.error(`[members] photo unavailable for ${member.trackingCode}:`, (error as Error).message);
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  await recordAudit({
    action: "MEMBER_PII_VIEWED",
    actor: user,
    target: { type: "MemberRegistration", id },
    metadata: { trackingCode: member.trackingCode, fields: ["photo"] },
  });

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
