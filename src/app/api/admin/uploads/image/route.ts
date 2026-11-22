import { NextResponse } from "next/server";
import { msg } from "@/lib/i18n-message";
import { withApiAuth } from "@/lib/security/guards";
import { isSameOrigin } from "@/lib/security/origin";
import { createMediaFromUpload } from "@/modules/media/service";
import { MediaFileError } from "@/modules/media/storage";

export const runtime = "nodejs";

/**
 * POST /api/admin/uploads/image (multipart, field "file") — editors upload a
 * news cover or an inline article image (also pasted/dropped images). The
 * image is registered in the Media library. Returns { url, width, height }.
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
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "VALIDATION", message: msg("admin.richText.upload.invalidType") }, { status: 400 });

  try {
    const asset = await createMediaFromUpload(file, user);
    return NextResponse.json({ url: asset.url, width: asset.width, height: asset.height }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaFileError) return NextResponse.json({ error: "VALIDATION", message: error.message }, { status: 400 });
    throw error;
  }
});
