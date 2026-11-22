import "./globals.css";

/*
 * The app has two real root layouts, each rendering its own <html>:
 *   app/[locale]/layout.tsx — public site (lang = current locale)
 *   app/admin/layout.tsx    — backoffice (lang = en)
 * This pass-through exists so app/not-found.tsx has a parent layout.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
