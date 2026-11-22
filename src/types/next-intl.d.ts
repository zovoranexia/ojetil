import type { AppLocale } from "@/config/locales";
import type messages from "../../messages/en.json";

/* Type-safe translation keys: a typo in t("…") is a compile error.
   scripts/check-messages.mjs verifies the other three catalogues match en.json. */
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
