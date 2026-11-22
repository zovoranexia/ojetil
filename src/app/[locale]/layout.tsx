import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { BackToTop } from "@/components/public/back-to-top";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getBandwidthMode } from "@/lib/bandwidth";
import { fontVariables } from "../fonts";

/*
 * Every public page reads the Low-Data cookie and live data (seats, news), so it
 * is rendered per request. Declaring it here stops `next build` from attempting
 * static prerenders that would query the database at build time (and fail in CI).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t("siteTitle"), template: `%s · ${siteConfig.shortName}` },
    description: t("siteDescription"),
    icons: { icon: "/brand/ojetil-emblem.jpg" },
    openGraph: { siteName: siteConfig.shortName, locale, type: "website" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18181B",
};

/** Client components only receive the namespaces they use, keeping the RSC payload small. */
const CLIENT_NAMESPACES = [
  "common",
  "share",
  "nav",
  "lowData",
  "history",
  "eventRegistration",
  "memberRegistration",
  "statusLookup",
  "error",
] as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [bandwidth, messages, t] = await Promise.all([getBandwidthMode(), getMessages(), getTranslations("common")]);
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));

  return (
    <html lang={locale} data-bandwidth={bandwidth} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        {/* Focus lands here after "back to top", so the next Tab reaches the skip link. */}
        <span id="page-top" tabIndex={-1} className="outline-none" />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <SiteHeader bandwidth={bandwidth} />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter />
          <BackToTop />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
