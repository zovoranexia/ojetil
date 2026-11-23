import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { AdminPageHeading } from "@/components/admin/ui";
import { requirePageAccess } from "@/lib/security/guards";
import { OfficeRegistration } from "./office-registration";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.members.office");
  return { title: t("metaTitle") };
}

/**
 * /admin/anggota/baru — register a member at the office (no internet access of
 * their own). Same form, validation and encryption as the website; the
 * application then waits in the verification queue for ANOTHER staff member.
 */
export default async function OfficeRegistrationPage() {
  await requirePageAccess("members:register", "/admin/anggota/baru");
  const [t, messages, locale] = await Promise.all([getTranslations("admin.members.office"), getMessages(), getLocale()]);

  return (
    <>
      <AdminPageHeading back={{ href: "/admin/anggota", label: t("back") }} title={t("title")} description={t("description")} />
      <p role="note" className="mb-6 flex max-w-3xl gap-3 rounded-card border border-status-info/25 bg-status-info-bg p-4 text-sm text-status-info">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>{t("fourEyesNote")}</span>
      </p>
      {/* The form reuses the public wizard's texts, in the staff member's admin language. */}
      <NextIntlClientProvider locale={locale} messages={{ admin: messages.admin, memberRegistration: messages.memberRegistration, statusLookup: messages.statusLookup }}>
        <div className="max-w-3xl">
          <OfficeRegistration />
        </div>
      </NextIntlClientProvider>
    </>
  );
}
