import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MemberCategory, Municipality } from "@prisma/client";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/site-url";

/*
 * Digital member card.
 *
 * Two signed tokens, both HMAC-SHA256 with keys derived from AUTH_SECRET
 * (separate contexts, so one can never be used as the other):
 *  • card access — opens the member's own card (name + photo) for 30 minutes.
 *    Issued only after the status lookup proved code + date of birth.
 *  • verify code — permanent, printed as the card's QR code. The public
 *    verification page re-checks the status every time, so a revoked
 *    membership stops verifying immediately; the card itself cannot be forged.
 * Tokens contain the registration id only — never personal data.
 */

const CARD_ACCESS_TTL_MS = 30 * 60_000;
/** "~" (URL-safe, not in base64url): no dots, because the locale middleware skips paths that look like files. */
const SEP = "~";

function key(context: "member-card-access" | "member-card-verify"): Buffer {
  return createHmac("sha256", Buffer.from(getServerEnv().AUTH_SECRET, "base64")).update(context).digest();
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function sign(context: Parameters<typeof key>[0], payload: string, bytes: number): string {
  return createHmac("sha256", key(context)).update(payload).digest().subarray(0, bytes).toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function decodeId(part: string): string | null {
  try {
    const id = Buffer.from(part, "base64url").toString("utf8");
    return /^[a-z0-9]{10,40}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function issueCardAccessToken(registrationId: string, now = Date.now()): string {
  const payload = `${b64url(registrationId)}${SEP}${(now + CARD_ACCESS_TTL_MS).toString(36)}`;
  return `${payload}${SEP}${sign("member-card-access", payload, 24)}`;
}

/** Registration id from a valid, unexpired card-access token. */
export function readCardAccessToken(token: string, now = Date.now()): string | null {
  const [idPart, expPart, sig, extra] = token.split(SEP);
  if (!idPart || !expPart || !sig || extra !== undefined) return null;
  if (!safeEqual(sig, sign("member-card-access", `${idPart}${SEP}${expPart}`, 24))) return null;
  const exp = Number.parseInt(expPart, 36);
  if (!Number.isFinite(exp) || exp < now) return null;
  return decodeId(idPart);
}

export function memberVerifyCode(registrationId: string): string {
  const idPart = b64url(registrationId);
  return `${idPart}${SEP}${sign("member-card-verify", idPart, 12)}`;
}

/** Registration id from a genuine verify code (status is NOT checked here). */
export function readMemberVerifyCode(code: string): string | null {
  const [idPart, sig, extra] = code.split(SEP);
  if (!idPart || !sig || extra !== undefined) return null;
  if (!safeEqual(sig, sign("member-card-verify", idPart, 12))) return null;
  return decodeId(idPart);
}

export interface MemberCardData {
  id: string;
  trackingCode: string;
  fullName: string;
  category: MemberCategory;
  municipality: Municipality;
  verifiedAt: Date;
  hasPhoto: boolean;
  verifyUrl: string;
  qrSvg: string;
}

/** Card data for a VERIFIED member; null for any other status (no card). */
export async function getMemberCard(registrationId: string): Promise<MemberCardData | null> {
  const m = await db.memberRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true, trackingCode: true, fullName: true, category: true, municipality: true, status: true, verifiedAt: true, profilePhotoKey: true },
  });
  if (!m || m.status !== "VERIFIED" || !m.verifiedAt) return null;
  const verifyUrl = absoluteUrl(`/verifika/${memberVerifyCode(m.id)}`);
  const qrSvg = await QRCode.toString(verifyUrl, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#18181b", light: "#ffffff" } });
  return {
    id: m.id,
    trackingCode: m.trackingCode,
    fullName: m.fullName,
    category: m.category,
    municipality: m.municipality,
    verifiedAt: m.verifiedAt,
    hasPhoto: Boolean(m.profilePhotoKey),
    verifyUrl,
    qrSvg,
  };
}

/** What the public verification page may show: no photo, no contact data. */
export async function verifyMember(code: string) {
  const id = readMemberVerifyCode(code);
  if (!id) return { valid: false as const, reason: "invalid" as const };
  const m = await db.memberRegistration.findUnique({
    where: { id },
    select: { trackingCode: true, fullName: true, category: true, municipality: true, status: true, verifiedAt: true },
  });
  if (!m) return { valid: false as const, reason: "invalid" as const };
  if (m.status !== "VERIFIED" || !m.verifiedAt) return { valid: false as const, reason: "revoked" as const, trackingCode: m.trackingCode };
  return { valid: true as const, trackingCode: m.trackingCode, fullName: m.fullName, category: m.category, municipality: m.municipality, verifiedAt: m.verifiedAt };
}
