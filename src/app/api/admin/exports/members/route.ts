import { municipalityLabel } from "@/config/municipalities";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { currentDiliYear } from "@/lib/dates";
import { adminCalendarDate, adminDateTime } from "@/lib/admin-format";
import { withApiAuth } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";
import { decryptMemberPii } from "@/modules/members/pii";

export const runtime = "nodejs";

/**
 * GET /api/admin/exports/members — CSV roster of VERIFIED members.
 * Data minimisation: includes the contact phone (decrypted) needed to reach
 * members, but never the national ID number or residential address.
 */
export const GET = withApiAuth("members:export", async (_request, user) => {
  const rows = await db.memberRegistration.findMany({
    where: { status: "VERIFIED" },
    orderBy: [{ municipality: "asc" }, { fullName: "asc" }],
    select: {
      trackingCode: true,
      category: true,
      fullName: true,
      clandestineAlias: true,
      dateOfBirth: true,
      municipality: true,
      administrativePost: true,
      email: true,
      verifiedAt: true,
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

  const csv = toCsv(
    ["Tracking code", "Category", "Full name", "Clandestine name", "Date of birth", "Municipality", "Administrative post", "Phone", "Email", "Verified at"],
    rows.map((r) => [
      r.trackingCode,
      r.category === "VETERAN_KLANDESTIN" ? "Veteran" : "Youth member",
      r.fullName,
      r.clandestineAlias,
      adminCalendarDate(r.dateOfBirth),
      municipalityLabel(r.municipality),
      r.administrativePost,
      decryptMemberPii(r).phone,
      r.email,
      adminDateTime(r.verifiedAt),
    ]),
  );

  await recordAudit({
    action: "MEMBER_EXPORTED",
    actor: user,
    metadata: { filter: { status: "VERIFIED" }, rowCount: rows.length, fields: ["fullName", "phone", "email", "municipality"] },
  });

  return csvResponse(`ojetil-verified-members-${currentDiliYear()}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
});
