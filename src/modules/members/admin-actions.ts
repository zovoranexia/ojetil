"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { after } from "next/server";
import { ActionError, authorizedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { msg } from "@/lib/i18n-message";
import { recordAudit } from "@/modules/audit/service";
import { sendMemberDecision } from "@/modules/notifications/emails";
import { decisionSchema, memberIdSchema } from "./admin-schema";
import { applyMemberDecision } from "./decision-service";
import { decryptMemberPii } from "./pii";

/**
 * Just-in-time PII disclosure: decrypts address, phone and national ID only
 * when a Verifier/Super Admin explicitly asks, and records who looked.
 */
export const revealMemberPii = authorizedAction("members:pii", memberIdSchema, async ({ id }, user) => {
  const row = await db.memberRegistration.findUnique({
    where: { id },
    select: {
      trackingCode: true,
      addressCiphertext: true,
      addressIv: true,
      addressAuthTag: true,
      phoneCiphertext: true,
      phoneIv: true,
      phoneAuthTag: true,
      nationalIdCiphertext: true,
      nationalIdIv: true,
      nationalIdAuthTag: true,
      nationalIdHash: true,
      piiKeyVersion: true,
    },
  });
  if (!row) throw new ActionError("NOT_FOUND", msg("admin.members.errors.notFound"));

  const pii = decryptMemberPii(row);
  await recordAudit({
    action: "MEMBER_PII_VIEWED",
    actor: user,
    target: { type: "MemberRegistration", id },
    metadata: { trackingCode: row.trackingCode, fields: ["address", "phone", "nationalId"] },
  });
  return pii;
});

/** Audit trail for printing / saving a member card from the backoffice (CR80 PDF or A4 sheet). */
export const logMemberCardPrint = authorizedAction(
  "members:read",
  memberIdSchema.extend({ format: z.enum(["CR80", "A4"]) }),
  async ({ id, format }, user) => {
    const m = await db.memberRegistration.findUnique({ where: { id }, select: { trackingCode: true, status: true } });
    if (!m) throw new ActionError("NOT_FOUND", msg("admin.members.errors.notFound"));
    if (m.status !== "VERIFIED") throw new ActionError("CONFLICT", msg("admin.members.errors.cardNotVerified"));
    await recordAudit({ action: "MEMBER_CARD_PRINTED", actor: user, target: { type: "MemberRegistration", id }, metadata: { trackingCode: m.trackingCode, format } });
    return { id };
  },
);

/**
 * Approve / request revision / reject. Office registrations may be decided by
 * the staff member who entered them; that is marked in the audit entry
 * (see applyMemberDecision).
 */
export const decideMemberRegistration = authorizedAction("members:verify", decisionSchema, async (input, user) => {
  const result = await db.$transaction((tx) => applyMemberDecision(tx, input, user));

  revalidatePath("/admin/anggota");
  revalidatePath(`/admin/anggota/${input.id}`);
  revalidatePath("/admin");
  // Tell the applicant (if they gave an email) once the decision is committed.
  after(() => sendMemberDecision(input.id));
  return result;
});
