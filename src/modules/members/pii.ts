import type { MemberRegistration } from "@prisma/client";
import { blindIndex, decryptPii, encryptPii } from "@/lib/security/crypto";

/**
 * Maps member PII between plaintext and the encrypted column layout of
 * `member_registrations`. The only place that knows that mapping.
 */
export interface MemberPiiPlain {
  address: string;
  phone: string;
  nationalId: string;
}

export type MemberPiiColumns = Pick<
  MemberRegistration,
  | "addressCiphertext"
  | "addressIv"
  | "addressAuthTag"
  | "phoneCiphertext"
  | "phoneIv"
  | "phoneAuthTag"
  | "nationalIdCiphertext"
  | "nationalIdIv"
  | "nationalIdAuthTag"
  | "nationalIdHash"
  | "piiKeyVersion"
>;

/** Prisma `Bytes` columns are typed as Uint8Array<ArrayBuffer>; copy into a fresh buffer of that type. */
function bytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
}

export function encryptMemberPii(pii: MemberPiiPlain): MemberPiiColumns {
  const address = encryptPii("member.address", pii.address);
  const phone = encryptPii("member.phone", pii.phone);
  const nationalId = encryptPii("member.nationalId", pii.nationalId);
  return {
    addressCiphertext: bytes(address.ciphertext),
    addressIv: bytes(address.iv),
    addressAuthTag: bytes(address.authTag),
    phoneCiphertext: bytes(phone.ciphertext),
    phoneIv: bytes(phone.iv),
    phoneAuthTag: bytes(phone.authTag),
    nationalIdCiphertext: bytes(nationalId.ciphertext),
    nationalIdIv: bytes(nationalId.iv),
    nationalIdAuthTag: bytes(nationalId.authTag),
    nationalIdHash: blindIndex("member.nationalId", pii.nationalId),
    piiKeyVersion: address.keyVersion,
  };
}

/**
 * Decrypts all PII of a registration. Callers MUST have passed an RBAC check
 * for `member:pii:read` and MUST write a MEMBER_PII_VIEWED audit entry.
 */
export function decryptMemberPii(row: MemberPiiColumns): MemberPiiPlain {
  const v = row.piiKeyVersion;
  return {
    address: decryptPii("member.address", {
      ciphertext: row.addressCiphertext,
      iv: row.addressIv,
      authTag: row.addressAuthTag,
      keyVersion: v,
    }),
    phone: decryptPii("member.phone", {
      ciphertext: row.phoneCiphertext,
      iv: row.phoneIv,
      authTag: row.phoneAuthTag,
      keyVersion: v,
    }),
    nationalId: decryptPii("member.nationalId", {
      ciphertext: row.nationalIdCiphertext,
      iv: row.nationalIdIv,
      authTag: row.nationalIdAuthTag,
      keyVersion: v,
    }),
  };
}

export function nationalIdBlindIndex(nationalId: string): string {
  return blindIndex("member.nationalId", nationalId);
}
