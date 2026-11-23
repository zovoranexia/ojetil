import "server-only";
import type { MemberCategory, RegistrationStatus } from "@prisma/client";
import { toDbLocale, type AppLocale } from "@/config/locales";
import { issueTrackingCode, normalizeTrackingCode } from "@/lib/codes";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import { issueCardAccessToken } from "./card";
import { encryptMemberPii } from "./pii";
import { deleteProfilePhoto, storeProfilePhoto } from "./photo-storage";
import { CONSENT_VERSION, parseIsoDate, type MemberSubmission } from "./registration-schema";

/**
 * Creates a registration with PII encrypted before it leaves this function.
 * The tracking code is issued inside the same transaction, so a failed insert
 * never burns a number. Duplicate national IDs are deliberately NOT rejected
 * here: answering "this BI is already registered" would let anyone probe who
 * is a member or veteran. Verifiers see possible duplicates via the blind index.
 *
 * `registeredBy`: staff entering the application at the office (channel
 * OFFICE). The record keeps who entered it, so that person can never also
 * verify it (four-eyes rule, see decideMemberRegistration), and the entry is
 * audited in the same transaction.
 */
export async function submitMemberRegistration(
  data: MemberSubmission,
  photo: Buffer | null,
  locale: AppLocale,
  options: { registeredBy?: SessionUser } = {},
): Promise<{ id: string; trackingCode: string; status: RegistrationStatus }> {
  const photoKey = photo ? await storeProfilePhoto(photo) : null;
  const now = new Date();

  try {
    return await db.$transaction(
      async (tx) => {
        const trackingCode = await issueTrackingCode(tx, now);
        const isVeteran = data.category === "VETERAN_KLANDESTIN";

        const office = options.registeredBy;
        const created = await tx.memberRegistration.create({
          select: { id: true },
          data: {
            channel: office ? "OFFICE" : "ONLINE",
            registeredById: office?.id ?? null,
            trackingCode,
            category: data.category,
            status: "PENDING_VERIFICATION",
            fullName: data.fullName,
            clandestineAlias: isVeteran ? data.clandestineAlias || null : null,
            dateOfBirth: parseIsoDate(data.dateOfBirth)!,
            gender: data.gender,
            profilePhotoKey: photoKey,
            municipality: data.municipality,
            administrativePost: data.administrativePost,
            email: data.email || null,
            // An office registration may have no phone: stored as an encrypted empty string.
            ...encryptMemberPii({ address: data.address, phone: data.phone ?? "", nationalId: data.nationalId }),
            yearJoined: isVeteran ? data.yearJoined : null,
            clandestineCell: isVeteran ? data.clandestineCell : null,
            clandestineRegion: isVeteran ? (data.clandestineRegion ?? null) : null,
            witnessReference: isVeteran ? (data.witnessReference ?? null) : null,
            institution: isVeteran ? null : data.institution,
            interests: isVeteran ? [] : data.interests,
            motivation: isVeteran ? null : data.motivation,
            consentGiven: true,
            consentVersion: CONSENT_VERSION,
            consentAt: now,
            submittedLocale: toDbLocale(locale),
            statusChanges: { create: { fromStatus: null, toStatus: "PENDING_VERIFICATION", actorId: office?.id ?? null } },
          },
        });
        if (office) {
          await recordAudit(
            {
              action: "MEMBER_REGISTERED_OFFICE",
              actor: office,
              target: { type: "MemberRegistration", id: created.id },
              metadata: { trackingCode, category: data.category, municipality: data.municipality, withPhoto: Boolean(photoKey) },
            },
            tx,
          );
        }
        return { id: created.id, trackingCode, status: "PENDING_VERIFICATION" as const };
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    if (photoKey) await deleteProfilePhoto(photoKey).catch(() => undefined);
    throw error;
  }
}

export interface PublicRegistrationStatus {
  trackingCode: string;
  status: RegistrationStatus;
  category: MemberCategory;
  submittedAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
  /** The Secretariat's reason — shown only for NEEDS_REVISION and REJECTED. */
  message: string | null;
  /** VERIFIED only: short-lived token that opens the digital member card. */
  cardToken: string | null;
}

/**
 * Public status lookup. Requires the tracking code AND the applicant's date of
 * birth, so sequential codes cannot be enumerated to learn who applied, and
 * returns no PII (no name, contact or ID data) even on a match.
 */
export async function lookupRegistrationStatus(code: string, dateOfBirth: string): Promise<PublicRegistrationStatus | null> {
  const trackingCode = normalizeTrackingCode(code);
  const dob = parseIsoDate(dateOfBirth);
  if (!trackingCode || !dob) return null;

  const row = await db.memberRegistration.findUnique({
    where: { trackingCode },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      category: true,
      dateOfBirth: true,
      createdAt: true,
      updatedAt: true,
      verifiedAt: true,
      verificationNotes: true,
    },
  });
  if (!row || row.dateOfBirth.toISOString().slice(0, 10) !== dob.toISOString().slice(0, 10)) return null;

  return {
    trackingCode: row.trackingCode,
    status: row.status,
    category: row.category,
    submittedAt: row.createdAt,
    updatedAt: row.updatedAt,
    verifiedAt: row.verifiedAt,
    message: row.status === "NEEDS_REVISION" || row.status === "REJECTED" ? row.verificationNotes : null,
    cardToken: row.status === "VERIFIED" ? issueCardAccessToken(row.id) : null,
  };
}
