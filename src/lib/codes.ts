import { randomInt } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { currentDiliYear } from "@/lib/dates";

/** Crockford Base32 (no I, L, O, U) — unambiguous when read aloud or hand-copied. */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const TRACKING_CODE_PATTERN = /^OJT-\d{4}-\d{4,}$/;
export const TICKET_CODE_PATTERN = /^TKT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Atomically increments and returns the counter for `scope`. A single
 * INSERT … ON CONFLICT statement is race-free under concurrent submissions.
 */
export async function nextSequenceValue(client: Client, scope: string): Promise<number> {
  const rows = await client.$queryRaw<Array<{ value: number }>>`
    INSERT INTO "code_sequences" ("scope", "value", "updatedAt")
    VALUES (${scope}, 1, NOW())
    ON CONFLICT ("scope") DO UPDATE
      SET "value" = "code_sequences"."value" + 1, "updatedAt" = NOW()
    RETURNING "value"`;
  const value = rows[0]?.value;
  if (typeof value !== "number") throw new Error(`Sequence "${scope}" did not return a value.`);
  return value;
}

export function memberSequenceScope(year: number): string {
  return `MEMBER:${year}`;
}

export function formatTrackingCode(year: number, sequence: number): string {
  return `OJT-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Issues the next member tracking code for the current Díli year, e.g. OJT-2026-0042. */
export async function issueTrackingCode(client: Client, now: Date = new Date()): Promise<string> {
  const year = currentDiliYear(now);
  const seq = await nextSequenceValue(client, memberSequenceScope(year));
  return formatTrackingCode(year, seq);
}

/** Normalises user input such as " ojt-2026-42 " → "OJT-2026-0042" (or null if invalid). */
export function normalizeTrackingCode(input: string): string | null {
  const match = /^OJT-?(\d{4})-?(\d{1,})$/.exec(input.trim().toUpperCase());
  if (!match) return null;
  return formatTrackingCode(Number(match[1]), Number(match[2]));
}

/** Random, non-sequential event ticket code (40 bits of entropy), e.g. TKT-7KQ2-M9XD. */
export function generateTicketCode(): string {
  const chars = Array.from({ length: 8 }, () => CROCKFORD[randomInt(CROCKFORD.length)]);
  return `TKT-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
