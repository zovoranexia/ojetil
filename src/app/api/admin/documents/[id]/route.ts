import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/security/guards";
import { handleDocumentSave } from "../save";

export const runtime = "nodejs";

/** POST /api/admin/documents/:id — multipart: "data" (JSON) + optional "file" (replaces the PDF). */
export const POST = withApiAuth<{ id: string }>("content:write", async (request, user, { params }) => {
  const { id } = await params;
  const result = await handleDocumentSave(request, user, id);
  return NextResponse.json(result.body, { status: result.status });
});
