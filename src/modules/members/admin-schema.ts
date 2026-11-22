import { z } from "zod";

/** Verification decisions. A reason note is always required — it is part of the record. */
export const DECISIONS = ["VERIFIED", "NEEDS_REVISION", "REJECTED"] as const;
export type Decision = (typeof DECISIONS)[number];

export const decisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(DECISIONS),
  /** Status the verifier saw; prevents two verifiers overwriting each other's decision. */
  expectedStatus: z.enum(["PENDING_VERIFICATION", "NEEDS_REVISION", "VERIFIED", "REJECTED"]),
  note: z.string().trim().min(5, "Write a short reason (at least 5 characters).").max(1000, "Keep the note under 1000 characters."),
});

export type DecisionInput = z.input<typeof decisionSchema>;

export const memberIdSchema = z.object({ id: z.string().min(1) });
