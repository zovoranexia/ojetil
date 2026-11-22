import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { fontVariables } from "../fonts";

export const metadata: Metadata = {
  title: { default: `Backoffice · ${siteConfig.shortName}`, template: `%s · ${siteConfig.shortName}` },
  robots: { index: false, follow: false },
  icons: { icon: "/brand/ojetil-emblem.jpg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#18181B" };

/** Backoffice root layout. Staff UI is English; content editors handle all four locales. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-bandwidth="normal" className={fontVariables}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
