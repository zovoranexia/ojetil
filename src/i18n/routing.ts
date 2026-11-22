import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/config/locales";

/**
 * Public-site locale routing.
 *  • Tetun is the default and has no URL prefix:  /kona-ba
 *  • Other locales are prefixed:                   /pt/kona-ba, /id/kona-ba, /en/kona-ba
 *  • Route segments stay in Tetun for every locale so shared links stay stable.
 *  • Browser-language detection is off: everyone lands on Tetun first and picks
 *    a language explicitly (TET | PT | ID | EN switcher in the top bar).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  alternateLinks: true,
});
