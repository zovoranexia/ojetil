import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { ImageUploadError, storePublicImage } from "@/lib/uploads/public-images";
import { recordAudit } from "@/modules/audit/service";

export const runtime = "nodejs";

/**
 * POST /api/admin/uploads/image (multipart, field "file") — editors upload a
 * news cover or an inline article image. Returns { url, width, height }.
 */
export const POST = withApiAuth("content:write", async (request, user) => {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "FORBIDDEN", message: "Cross-origin request rejected." }, { status: 403 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "VALIDATION", message: "Upload could not be read. Is the file too large?" }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "VALIDATION", message: "Choose an image to upload." }, { status: 400 });

  try {
    const stored = await storePublicImage(file);
    await recordAudit({
      action: "MEDIA_UPLOADED",
      actor: user,
      target: { type: "PublicImage", id: stored.url },
      metadata: { url: stored.url, bytes: stored.bytes, width: stored.width, height: stored.height, originalName: file.name.slice(0, 120) },
    });
    return NextResponse.json({ url: stored.url, width: stored.width, height: stored.height }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageUploadError) return NextResponse.json({ error: "VALIDATION", message: error.message }, { status: 400 });
    throw error;
  }
});
