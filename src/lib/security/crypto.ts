import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Application-level PII encryption — AES-256-GCM.
 *
 *  • 96-bit random IV per value (NIST SP 800-38D recommended length).
 *  • 128-bit authentication tag stored alongside, so tampering is detected.
 *  • Additional Authenticated Data binds each ciphertext to its field name and
 *    key version: a ciphertext copied from `phone` into `nationalId` will not
 *    decrypt.
 *  • Versioned keyring (PII_ENCRYPTION_KEYS="1:<b64>,2:<b64>") enables key
 *    rotation without downtime.
 *
 * Deliberately free of `server-only` so the seed script can use it; it must
 * still never be imported by a client component (Node `crypto` is required).
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export type PiiField = "member.address" | "member.phone" | "member.nationalId" | "member.photo";

export interface EncryptedValue {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
}

/** Shape read back from the database (Prisma returns `Bytes` as Uint8Array). */
export interface StoredEncryptedValue {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  keyVersion: number;
}

interface Keyring {
  activeVersion: number;
  keys: ReadonlyMap<number, Buffer>;
  blindIndexKey: Buffer;
}

export class PiiConfigurationError extends Error {
  override name = "PiiConfigurationError";
}

export class PiiDecryptionError extends Error {
  override name = "PiiDecryptionError";
}

function decodeKey(raw: string, label: string): Buffer {
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== KEY_BYTES) {
    throw new PiiConfigurationError(`${label} must be a base64-encoded ${KEY_BYTES}-byte key (got ${key.length} bytes).`);
  }
  return key;
}

export function parseKeyring(env: NodeJS.ProcessEnv = process.env): Keyring {
  const rawKeys = env.PII_ENCRYPTION_KEYS;
  const rawActive = env.PII_ACTIVE_KEY_VERSION;
  const rawBlind = env.PII_BLIND_INDEX_KEY;
  if (!rawKeys || !rawActive || !rawBlind) {
    throw new PiiConfigurationError(
      "PII_ENCRYPTION_KEYS, PII_ACTIVE_KEY_VERSION and PII_BLIND_INDEX_KEY must be set. Run `npm run setup:env`.",
    );
  }

  const keys = new Map<number, Buffer>();
  for (const entry of rawKeys.split(",").map((s) => s.trim()).filter(Boolean)) {
    const sep = entry.indexOf(":");
    const version = Number(entry.slice(0, sep));
    if (sep <= 0 || !Number.isInteger(version) || version < 1) {
      throw new PiiConfigurationError(`Invalid PII_ENCRYPTION_KEYS entry "${entry.slice(0, 6)}…"; expected "<version>:<base64Key>".`);
    }
    if (keys.has(version)) throw new PiiConfigurationError(`Duplicate PII key version ${version}.`);
    keys.set(version, decodeKey(entry.slice(sep + 1), `PII key v${version}`));
  }

  const activeVersion = Number(rawActive);
  if (!keys.has(activeVersion)) {
    throw new PiiConfigurationError(`PII_ACTIVE_KEY_VERSION=${rawActive} has no matching key in PII_ENCRYPTION_KEYS.`);
  }

  const blindIndexKey = decodeKey(rawBlind, "PII_BLIND_INDEX_KEY");
  for (const key of keys.values()) {
    if (key.equals(blindIndexKey)) {
      throw new PiiConfigurationError("PII_BLIND_INDEX_KEY must differ from every encryption key.");
    }
  }

  return { activeVersion, keys, blindIndexKey };
}

let cachedKeyring: Keyring | null = null;

function keyring(): Keyring {
  cachedKeyring ??= parseKeyring();
  return cachedKeyring;
}

/** For tests and key-rotation scripts that change env at runtime. */
export function resetKeyringCache(): void {
  cachedKeyring = null;
}

function aad(field: PiiField, keyVersion: number): Buffer {
  return Buffer.from(`ojetil:pii:v${keyVersion}:${field}`, "utf8");
}

export function encryptPii(field: PiiField, plaintext: string): EncryptedValue {
  const { activeVersion, keys } = keyring();
  const key = keys.get(activeVersion)!;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(aad(field, activeVersion));
  const ciphertext = Buffer.concat([cipher.update(plaintext.normalize("NFC"), "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: activeVersion };
}

export function decryptPii(field: PiiField, value: StoredEncryptedValue): string {
  const key = keyring().keys.get(value.keyVersion);
  if (!key) throw new PiiDecryptionError(`No key available for PII key version ${value.keyVersion}.`);
  if (value.iv.length !== IV_BYTES || value.authTag.length !== TAG_BYTES) {
    throw new PiiDecryptionError(`Malformed IV or auth tag for ${field}.`);
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(value.iv), { authTagLength: TAG_BYTES });
    decipher.setAAD(aad(field, value.keyVersion));
    decipher.setAuthTag(Buffer.from(value.authTag));
    return Buffer.concat([decipher.update(Buffer.from(value.ciphertext)), decipher.final()]).toString("utf8");
  } catch {
    // Never leak cipher internals; GCM failure means wrong key or tampered data.
    throw new PiiDecryptionError(`Unable to decrypt ${field}: authentication failed.`);
  }
}

/*
 * Binary envelope for encrypted files (e.g. profile photos):
 *   "OJE1" (4) · keyVersion uint16 BE (2) · IV (12) · auth tag (16) · ciphertext
 */
const ENVELOPE_MAGIC = Buffer.from("OJE1", "ascii");
const ENVELOPE_HEADER = ENVELOPE_MAGIC.length + 2 + IV_BYTES + TAG_BYTES;

export function encryptPiiBytes(field: PiiField, plaintext: Buffer): Buffer {
  const { activeVersion, keys } = keyring();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keys.get(activeVersion)!, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(aad(field, activeVersion));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const version = Buffer.alloc(2);
  version.writeUInt16BE(activeVersion);
  return Buffer.concat([ENVELOPE_MAGIC, version, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptPiiBytes(field: PiiField, envelope: Buffer): Buffer {
  if (envelope.length < ENVELOPE_HEADER || !envelope.subarray(0, 4).equals(ENVELOPE_MAGIC)) {
    throw new PiiDecryptionError(`Malformed encrypted envelope for ${field}.`);
  }
  const keyVersion = envelope.readUInt16BE(4);
  const key = keyring().keys.get(keyVersion);
  if (!key) throw new PiiDecryptionError(`No key available for PII key version ${keyVersion}.`);
  const iv = envelope.subarray(6, 6 + IV_BYTES);
  const tag = envelope.subarray(6 + IV_BYTES, ENVELOPE_HEADER);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(aad(field, keyVersion));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(envelope.subarray(ENVELOPE_HEADER)), decipher.final()]);
  } catch {
    throw new PiiDecryptionError(`Unable to decrypt ${field}: authentication failed.`);
  }
}

/** True when a stored value was encrypted with a non-active key and should be re-encrypted. */
export function needsReencryption(keyVersion: number): boolean {
  return keyVersion !== keyring().activeVersion;
}

/** Canonical form for identifiers: NFKC, upper-case, no spaces/dots/dashes/slashes. */
export function normalizeIdentifier(value: string): string {
  return value.normalize("NFKC").toUpperCase().replace(/[\s.\-/]/g, "");
}

/**
 * Deterministic keyed hash (blind index) so duplicates can be detected with an
 * equality lookup without decrypting every row. Uses a dedicated HMAC key.
 */
export function blindIndex(field: PiiField, value: string): string {
  return createHmac("sha256", keyring().blindIndexKey)
    .update(`${field}:${normalizeIdentifier(value)}`, "utf8")
    .digest("hex");
}

/** "+670 7723 4512" → "••••••••4512". For VIEWER-level displays and logs. */
export function maskValue(value: string, visible = 4): string {
  const compact = value.replace(/\s/g, "");
  if (compact.length <= visible) return "•".repeat(compact.length);
  return "•".repeat(compact.length - visible) + compact.slice(-visible);
}
