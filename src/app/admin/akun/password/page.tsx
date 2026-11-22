import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { getSessionUser } from "@/lib/security/guards";
import { logoutAction } from "@/modules/auth/actions";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Change password", robots: { index: false, follow: false } };

/**
 * Lives outside the (panel) layout on purpose: accounts on a temporary password
 * are redirected here from every other backoffice page until they choose their own.
 */
export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/admin/login?callbackUrl=${encodeURIComponent("/admin/akun/password")}`);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TaisRibbon />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <div className="flex items-center gap-3">
          <Emblem size={44} />
          <span className="font-serif text-xl font-bold">OJETIL Backoffice</span>
        </div>
        <h1 className="mt-8 text-3xl">{user.mustChangePassword ? "Choose your own password" : "Change password"}</h1>
        <p className="mt-2 text-ink-secondary">
          {user.mustChangePassword
            ? "You signed in with a temporary password issued by an administrator. Set a personal password to continue — no one else should know it."
            : `Signed in as ${user.email}. You will be asked to sign in again with the new password.`}
        </p>
        <div className="mt-8 rounded-card border border-border-subtle bg-surface-card p-5">
          <ChangePasswordForm />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          {!user.mustChangePassword ? (
            <Link href="/admin" className="font-semibold text-ojetil-red hover:underline">
              Back to the backoffice
            </Link>
          ) : (
            <span />
          )}
          <form action={logoutAction}>
            <button type="submit" className="inline-flex min-h-tap items-center font-semibold text-ink-secondary hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
