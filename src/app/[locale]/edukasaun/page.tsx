import { redirect } from "@/i18n/navigation";
import { getPageLocale } from "@/i18n/page-locale";

/** /edukasaun currently has one section: youth events. */
export default async function EducationIndex({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await getPageLocale(params);
  redirect({ href: "/edukasaun/acara", locale });
}
