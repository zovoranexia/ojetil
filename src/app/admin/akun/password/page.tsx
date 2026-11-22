import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { getSessionUser } from "@/lib/security/guards";
import { logoutAction } from "@/modules/auth/actions";
import { ChangePasswordForm } from "./change-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.account");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * Lives outside the (panel) layout on purpose: accounts on a temporary password
 * are redirected here from every other backoffice page until they choose their own.
 */
export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/admin/login?callbackUrl=${encodeURIComponent("/admin/akun/password")}`);
  const t = await getTranslations("admin.account");

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TaisRibbon />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <div className="flex items-center gap-3">
          <Emblem size={44} />
          <span className="font-serif text-xl font-bold">{t("backofficeName")}</span>
        </div>
        <h1 className="mt-8 text-3xl">{user.mustChangePassword ? t("titleMustChange") : t("title")}</h1>
        <p className="mt-2 text-ink-secondary">
          {user.mustChangePassword ? t("introMustChange") : t("intro", { email: user.email })}
        </p>
        <div className="mt-8 rounded-card border border-border-subtle bg-surface-card p-5">
          <ChangePasswordForm />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          {!user.mustChangePassword ? (
            <Link href="/admin" className="font-semibold text-ojetil-red hover:underline">
              {t("backToBackoffice")}
            </Link>
          ) : (
            <span />
          )}
          <form action={logoutAction}>
            <button type="submit" className="inline-flex min-h-tap items-center font-semibold text-ink-secondary hover:text-ink">
              {t("signOut")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
