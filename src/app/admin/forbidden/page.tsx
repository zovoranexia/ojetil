import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/config/rbac";
import { getSessionUser } from "@/lib/security/guards";
import { logoutAction } from "@/modules/auth/actions";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

/** Rendered by the middleware (rewrite, HTTP 403) and by page guards (redirect). */
export default async function ForbiddenPage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TaisRibbon />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded-card border border-border-subtle bg-surface-card p-6 md:p-8">
          <ShieldAlert aria-hidden="true" className="size-10 text-ojetil-red" />
          <p className="mt-4 font-mono text-sm text-ink-secondary">403</p>
          <h1 className="mt-1 text-3xl">Access denied</h1>
          <p className="mt-3 text-ink-secondary">
            {user
              ? `Your role — ${ROLE_LABELS[user.role].label} — does not include access to this area. If you need it, ask a Super Admin.`
              : "You need to sign in with an authorised account to view this area."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <>
                <Button asChild>
                  <Link href="/admin">Back to dashboard</Link>
                </Button>
                <form action={logoutAction}>
                  <Button type="submit" variant="outline">
                    Sign in as someone else
                  </Button>
                </form>
              </>
            ) : (
              <Button asChild>
                <Link href="/admin/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
