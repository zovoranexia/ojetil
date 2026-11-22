import "server-only";
import { randomInt } from "node:crypto";

/**
 * Temporary password for new or reset staff accounts: 4×5 characters from an
 * alphabet without look-alikes (0/O, 1/l/I), ~114 bits of entropy, shown once.
 */
export function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}-${group()}`;
}
