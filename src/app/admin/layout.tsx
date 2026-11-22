import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { getAdminLocale, getAdminTheme } from "@/lib/admin-preferences";
import { APP_TIME_ZONE } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fontVariables } from "../fonts";

export const metadata: Metadata = {
  title: { default: `Backoffice · ${siteConfig.shortName}`, template: `%s · ${siteConfig.shortName}` },
  robots: { index: false, follow: false },
  icons: { icon: "/brand/ojetil-emblem.jpg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#18181B" };

/*
 * Runs before first paint. With an explicit choice the server already rendered
 * the right class; with none (`data-theme-pref="system"`) it applies the OS
 * preference and follows later OS changes, so there is never a light flash.
 */
const THEME_SCRIPT = `(function(){try{var d=document.documentElement;if(d.dataset.themePref!=="system")return;var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){if(d.dataset.themePref==="system")d.classList.toggle("dark",m.matches)};a();m.addEventListener("change",a)}catch(e){}})();`;

/**
 * Backoffice root layout. UI language and theme are per-user preferences
 * (src/config/admin-preferences.ts); content editors still edit all four
 * content locales regardless of the UI language.
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme, messages] = await Promise.all([getAdminLocale(), getAdminTheme(), getMessages()]);

  return (
    <html
      lang={locale}
      data-bandwidth="normal"
      data-theme-pref={theme ?? "system"}
      className={cn(fontVariables, theme === "dark" && "dark")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <NextIntlClientProvider locale={locale} timeZone={APP_TIME_ZONE} messages={{ admin: messages.admin }}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
