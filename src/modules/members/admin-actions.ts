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
 * Approve / request revision / reject. Status, history and audit entry are
 * written in one transaction; a stale `expectedStatus` aborts with CONFLICT.
 */
export const decideMemberRegistration = authorizedAction("members:verify", decisionSchema, async (input, user) => {
  /*
   * Four-eyes rule: whoever entered an application at the office may not verify,
   * send back or reject it — for every role, Super Admin included. The refused
   * attempt is audited (outside the decision transaction, so it is kept).
   */
  const entered = await db.memberRegistration.findUnique({ where: { id: input.id }, select: { registeredById: true, trackingCode: true } });
  if (entered?.registeredById && entered.registeredById === user.id) {
    await recordAudit({
      action: "MEMBER_DECISION_BLOCKED",
      actor: user,
      target: { type: "MemberRegistration", id: input.id },
      metadata: { trackingCode: entered.trackingCode, attempted: input.decision, reason: "FOUR_EYES_SAME_OFFICER" },
    });
    throw new ActionError("FORBIDDEN", msg("admin.members.errors.fourEyes"));
  }

  const result = await db.$transaction(async (tx) => {
    const current = await tx.memberRegistration.findUnique({ where: { id: input.id }, select: { status: true, trackingCode: true } });
    if (!current) throw new ActionError("NOT_FOUND", msg("admin.members.errors.notFound"));
    if (current.status !== input.expectedStatus) {
      throw new ActionError("CONFLICT", msg("admin.members.errors.conflict"));
    }
    if (current.status === input.decision) {
      throw new ActionError("CONFLICT", msg("admin.members.errors.alreadyStatus"));
    }

    const now = new Date();
    const updated = await tx.memberRegistration.updateMany({
      where: { id: input.id, status: input.expectedStatus },
      data: {
        status: input.decision,
        verificationNotes: input.note,
        verifiedById: user.id,
        verifiedAt: input.decision === "VERIFIED" ? now : null,
      },
    });
    if (updated.count !== 1) throw new ActionError("CONFLICT", msg("admin.members.errors.conflict"));

    await tx.memberStatusChange.create({
      data: { registrationId: input.id, fromStatus: current.status, toStatus: input.decision, note: input.note, actorId: user.id },
    });
    await recordAudit(
      {
        action: "MEMBER_STATUS_CHANGED",
        actor: user,
        target: { type: "MemberRegistration", id: input.id },
        metadata: { trackingCode: current.trackingCode, from: current.status, to: input.decision },
      },
      tx,
    );
    return { trackingCode: current.trackingCode, status: input.decision };
  });

  revalidatePath("/admin/anggota");
  revalidatePath(`/admin/anggota/${input.id}`);
  revalidatePath("/admin");
  // Tell the applicant (if they gave an email) once the decision is committed.
  after(() => sendMemberDecision(input.id));
  return result;
});
