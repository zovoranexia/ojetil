import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/guards";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { siteConfig } from "@/config/site";
import { safeAdminCallback } from "@/modules/auth/schemas";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff sign-in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; changed?: string }>;
}) {
  const { callbackUrl, changed } = await searchParams;
  const destination = safeAdminCallback(Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl);

  // DB-revalidated: a revoked or deactivated session returns null and stays here.
  if (await getSessionUser()) redirect(destination);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TaisRibbon />
      <div className="grid flex-1 grid-rows-[auto_1fr] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-1">
        <aside className="flex flex-col justify-between gap-8 bg-ink px-6 py-8 text-paper md:px-12 md:py-14">
          <div className="flex items-center gap-4">
            <Emblem size={56} priority />
            <div>
              <p className="font-serif text-2xl font-bold leading-none">{siteConfig.shortName}</p>
              <p className="mt-1 text-sm text-paper/75">Backoffice</p>
            </div>
          </div>
          <div className="hidden md:block">
            <p className="font-serif text-4xl font-bold leading-tight text-gold-accent">{siteConfig.motto}</p>
            <p className="mt-2 font-serif text-xl text-paper/85">{siteConfig.mottoSubline}</p>
            <p className="mt-8 max-w-sm text-sm text-paper/70">{siteConfig.fullName}</p>
          </div>
          <p className="hidden text-xs text-paper/60 md:block">
            Authorised OJETIL staff only. Every sign-in and every access to member data is recorded.
          </p>
        </aside>

        <main className="flex items-start justify-center px-4 py-10 md:items-center md:px-10">
          <div className="w-full max-w-md">
            <h1 className="text-3xl">Staff sign-in</h1>
            <p className="mt-2 text-ink-secondary">Use the account issued to you by the OJETIL Secretariat.</p>
            {changed ? (
              <p role="status" className="mt-6 rounded-control border border-status-verified/25 bg-status-verified-bg p-3 text-sm text-status-verified">
                Password changed. Sign in with your new password.
              </p>
            ) : null}
            <div className="mt-8">
              <LoginForm callbackUrl={destination} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
