import "server-only";
import { z } from "zod";
import type { PermissionRequirement } from "@/config/rbac";
import { requireUser, type SessionUser } from "@/lib/security/guards";
import { ForbiddenError, UnauthorizedError } from "@/lib/security/permissions";

/**
 * Uniform Server Action result, consumed by React Hook Form on the client:
 * field errors map onto inputs, `message` feeds the form-level alert.
 */
export type ActionErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "INTERNAL";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ActionErrorCode; message: string; fieldErrors?: Record<string, string[]> } };

/** Throw from a handler for expected domain failures (e.g. NOT_FOUND, CONFLICT). */
export class ActionError extends Error {
  override name = "ActionError";
  constructor(
    readonly code: Exclude<ActionErrorCode, "INTERNAL">,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function toFailure(error: unknown): ActionResult<never> {
  if (error instanceof UnauthorizedError) return { ok: false, error: { code: "UNAUTHORIZED", message: error.message } };
  if (error instanceof ForbiddenError) return { ok: false, error: { code: "FORBIDDEN", message: error.message } };
  if (error instanceof ActionError) {
    return { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } };
  }
  console.error("[action] unhandled error", error);
  return { ok: false, error: { code: "INTERNAL", message: "Something went wrong. Please try again." } };
}

/**
 * Builds a Server Action that (1) authenticates, (2) authorises against the
 * RBAC matrix, (3) validates input with Zod, then runs `handler`.
 *
 *   export const publishArticle = authorizedAction("content:publish", schema, async (input, user) => …);
 */
export function authorizedAction<S extends z.ZodType, T>(
  requirement: PermissionRequirement,
  schema: S,
  handler: (input: z.output<S>, user: SessionUser) => Promise<T>,
): (input: z.input<S>) => Promise<ActionResult<T>> {
  return async (input) => {
    try {
      const user = await requireUser(requirement);
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: { code: "VALIDATION", message: "Please correct the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) },
        };
      }
      return { ok: true, data: await handler(parsed.data, user) };
    } catch (error) {
      return toFailure(error);
    }
  };
}

/** Same as `authorizedAction` for public (unauthenticated) actions such as registrations. */
export function publicAction<S extends z.ZodType, T>(
  schema: S,
  handler: (input: z.output<S>) => Promise<T>,
): (input: z.input<S>) => Promise<ActionResult<T>> {
  return async (input) => {
    try {
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: { code: "VALIDATION", message: "Please correct the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) },
        };
      }
      return { ok: true, data: await handler(parsed.data) };
    } catch (error) {
      return toFailure(error);
    }
  };
}
