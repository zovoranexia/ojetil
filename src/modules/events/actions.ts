"use server";

import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { isAppLocale } from "@/config/locales";
import { fieldErrorsFrom, type ActionResult } from "@/lib/actions";
import { getRequestContext } from "@/lib/request-context";
import { rateLimit } from "@/lib/security/rate-limit";
import { createEventRegistrationSchema, type EventRegistrationInput } from "./registration-schema";
import { sendEventRegistrationConfirmation } from "@/modules/notifications/emails";
import { EventRegistrationError, registerForEvent } from "./registration-service";

/** Public self-service event registration. Returns a ticket code or a localised error. */
export async function registerForEventAction(
  locale: string,
  input: EventRegistrationInput,
): Promise<ActionResult<{ ticketCode: string; isOnline: boolean }>> {
  const lang = isAppLocale(locale) ? locale : "tet";
  const t = await getTranslations({ locale: lang, namespace: "eventRegistration.errors" });

  // Without a limit, a script could fill an event with fake emails and lock real attendees out.
  const { ipAddress } = await getRequestContext();
  if (!rateLimit("event-register", ipAddress ?? "unknown", 10, 10 * 60_000).ok) {
    return { ok: false, error: { code: "CONFLICT", message: t("rateLimited") } };
  }

  const parsed = createEventRegistrationSchema((k) => t(k)).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION", message: t("form"), fieldErrors: fieldErrorsFrom(parsed.error) } };
  }

  try {
    const result = await registerForEvent(parsed.data, lang);
    after(() => sendEventRegistrationConfirmation(result.ticketCode));
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof EventRegistrationError) {
      const code = error.reason === "notFound" ? "NOT_FOUND" : "CONFLICT";
      const fieldErrors = error.reason === "duplicate" ? { email: [t("duplicate")] } : undefined;
      return { ok: false, error: { code, message: t(error.reason), fieldErrors } };
    }
    console.error("[events] registration failed", error);
    return { ok: false, error: { code: "INTERNAL", message: t("generic") } };
  }
}
