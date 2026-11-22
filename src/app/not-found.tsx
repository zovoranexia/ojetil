import Link from "next/link";
import { fontVariables } from "./fonts";

/* Fallback 404 for paths outside both the localized site and /admin. */
export default function GlobalNotFound() {
  return (
    <html lang="tet" className={fontVariables} data-bandwidth="normal">
      <body className="flex min-h-dvh flex-col bg-paper">
        <div aria-hidden="true" className="tais-ribbon" />
        <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16">
          <p className="font-mono text-sm text-ink-secondary">404</p>
          <h1 className="mt-1 text-3xl">Pájina la hetan · Page not found</h1>
          <Link href="/" className="mt-6 inline-flex min-h-tap items-center font-semibold text-ojetil-red underline-offset-4 hover:underline">
            OJETIL — Inísiu / Home
          </Link>
        </main>
      </body>
    </html>
  );
}
