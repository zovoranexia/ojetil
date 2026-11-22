import { redirect } from "@/i18n/navigation";
import { getPageLocale } from "@/i18n/page-locale";

/** /komunidade → registration (the community section's main action). */
export default async function CommunityIndex({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await getPageLocale(params);
  redirect({ href: "/komunidade/registrasi", locale });
}
