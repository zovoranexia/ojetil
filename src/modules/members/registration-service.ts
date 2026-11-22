import "server-only";
import type { MemberCategory, RegistrationStatus } from "@prisma/client";
import { toDbLocale, type AppLocale } from "@/config/locales";
import { issueTrackingCode, normalizeTrackingCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { encryptMemberPii } from "./pii";
import { deleteProfilePhoto, storeProfilePhoto } from "./photo-storage";
import { CONSENT_VERSION, parseIsoDate, type MemberSubmission } from "./registration-schema";

/**
 * Creates a registration with PII encrypted before it leaves this function.
 * The tracking code is issued inside the same transaction, so a failed insert
 * never burns a number. Duplicate national IDs are deliberately NOT rejected
 * here: answering "this BI is already registered" would let anyone probe who
 * is a member or veteran. Verifiers see possible duplicates via the blind index.
 */
export async function submitMemberRegistration(
  data: MemberSubmission,
  photo: Buffer | null,
  locale: AppLocale,
): Promise<{ trackingCode: string; status: RegistrationStatus }> {
  const photoKey = photo ? await storeProfilePhoto(photo) : null;
  const now = new Date();

  try {
    return await db.$transaction(
      async (tx) => {
        const trackingCode = await issueTrackingCode(tx, now);
        const isVeteran = data.category === "VETERAN_KLANDESTIN";

        await tx.memberRegistration.create({
          data: {
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
            ...encryptMemberPii({ address: data.address, phone: data.phone, nationalId: data.nationalId }),
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
            statusChanges: { create: { fromStatus: null, toStatus: "PENDING_VERIFICATION" } },
          },
        });
        return { trackingCode, status: "PENDING_VERIFICATION" as const };
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
  };
}
