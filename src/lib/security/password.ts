import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id password hashing (the @node-rs/argon2 default algorithm) with the
 * OWASP-recommended baseline: 19 MiB memory, 2 iterations, parallelism 1.
 * The encoded hash embeds its own parameters, so they can be raised later and
 * old hashes still verify.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password-policy";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain.normalize("NFKC"), ARGON2_OPTIONS);
}

/** Constant-time verification; returns false (never throws) for malformed hashes. */
export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain.normalize("NFKC"));
  } catch {
    return false;
  }
}

/**
 * A pre-computed hash used to equalise response time when a login email does
 * not exist, so attackers cannot enumerate staff accounts by timing.
 */
let dummyHash: Promise<string> | null = null;
export function getDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("ojetil-timing-equaliser-not-a-real-password");
  return dummyHash;
}
