import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getAdminLocale } from "@/lib/admin-preferences";
import { APP_TIME_ZONE } from "@/lib/dates";
import { routing } from "./routing";

/**
 * Public pages always carry a locale (URL segment / intl middleware). Requests
 * without one come from outside the localized site — the backoffice, its Server
 * Actions and admin route handlers — and use the staff member's chosen UI
 * language (cookie, see src/config/admin-preferences.ts).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested === undefined
      ? await getAdminLocale()
      : hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

  return {
    locale,
    timeZone: APP_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
