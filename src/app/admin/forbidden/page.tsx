import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/security/guards";
import { logoutAction } from "@/modules/auth/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.forbidden");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Rendered by the middleware (rewrite, HTTP 403) and by page guards (redirect). */
export default async function ForbiddenPage() {
  const [user, t, tRoles] = await Promise.all([
    getSessionUser(),
    getTranslations("admin.forbidden"),
    getTranslations("admin.roles"),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TaisRibbon />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded-card border border-border-subtle bg-surface-card p-6 md:p-8">
          <ShieldAlert aria-hidden="true" className="size-10 text-ojetil-red" />
          <p className="mt-4 font-mono text-sm text-ink-secondary">403</p>
          <h1 className="mt-1 text-3xl">{t("title")}</h1>
          <p className="mt-3 text-ink-secondary">
            {user ? t("roleDenied", { role: tRoles(`${user.role}.label`) }) : t("signInRequired")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <>
                <Button asChild>
                  <Link href="/admin">{t("backToDashboard")}</Link>
                </Button>
                <form action={logoutAction}>
                  <Button type="submit" variant="outline">
                    {t("signInAsOther")}
                  </Button>
                </form>
              </>
            ) : (
              <Button asChild>
                <Link href="/admin/login">{t("signIn")}</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
