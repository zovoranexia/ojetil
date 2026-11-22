import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { msg } from "@/lib/i18n-message";
import { withApiAuth } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { ImageUploadError, storePublicImage } from "@/lib/uploads/public-images";
import { recordAudit } from "@/modules/audit/service";

export const runtime = "nodejs";

function uploadErrorMessage(error: ImageUploadError): string {
  return error.reason === "size"
    ? msg("admin.richText.upload.invalidSize", { mb: Math.round(getServerEnv().MAX_IMAGE_UPLOAD_BYTES / 1_048_576) })
    : msg("admin.richText.upload.invalidType");
}

/**
 * POST /api/admin/uploads/image (multipart, field "file") — editors upload a
 * news cover or an inline article image. Returns { url, width, height }.
 * Error `message`s are msg()-encoded keys; the editor decodes them.
 */
export const POST = withApiAuth("content:write", async (request, user) => {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "FORBIDDEN", message: msg("admin.errors.forbidden") }, { status: 403 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "VALIDATION", message: msg("admin.richText.upload.unreadable") }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "VALIDATION", message: msg("admin.richText.upload.noFile") }, { status: 400 });

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
    if (error instanceof ImageUploadError) return NextResponse.json({ error: "VALIDATION", message: uploadErrorMessage(error) }, { status: 400 });
    throw error;
  }
});
