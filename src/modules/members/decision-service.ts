import "server-only";
import type { Prisma, RegistrationStatus } from "@prisma/client";
import { ActionError } from "@/lib/actions";
import { msg } from "@/lib/i18n-message";
import type { SessionUser } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import type { Decision } from "./admin-schema";

/**
 * Applies a verification decision inside the caller's transaction: status,
 * history and audit entry are written together; a stale `expectedStatus`
 * aborts with CONFLICT.
 *
 * Office registrations may be decided by the same staff member who entered
 * them (the Secretariat's choice: accountability through the audit log rather
 * than a second person). Such decisions are marked explicitly in the audit
 * metadata — `byRegistrar: true`, and `selfVerified: true` when the decision
 * is VERIFIED — so they can be reviewed (members list filter "verified by the
 * person who entered it", audit log details).
 */
export async function applyMemberDecision(
  tx: Prisma.TransactionClient,
  input: { id: string; decision: Decision; expectedStatus: RegistrationStatus; note: string },
  user: SessionUser,
): Promise<{ trackingCode: string; status: Decision; selfVerified: boolean }> {
  const current = await tx.memberRegistration.findUnique({
    where: { id: input.id },
    select: { status: true, trackingCode: true, channel: true, registeredById: true },
  });
  if (!current) throw new ActionError("NOT_FOUND", msg("admin.members.errors.notFound"));
  if (current.status !== input.expectedStatus) throw new ActionError("CONFLICT", msg("admin.members.errors.conflict"));
  if (current.status === input.decision) throw new ActionError("CONFLICT", msg("admin.members.errors.alreadyStatus"));

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

  const byRegistrar = current.registeredById !== null && current.registeredById === user.id;
  const selfVerified = byRegistrar && input.decision === "VERIFIED";
  await recordAudit(
    {
      action: "MEMBER_STATUS_CHANGED",
      actor: user,
      target: { type: "MemberRegistration", id: input.id },
      metadata: {
        trackingCode: current.trackingCode,
        from: current.status,
        to: input.decision,
        channel: current.channel,
        ...(byRegistrar ? { byRegistrar: true } : {}),
        ...(selfVerified ? { selfVerified: true } : {}),
      },
    },
    tx,
  );
  return { trackingCode: current.trackingCode, status: input.decision, selfVerified };
}
