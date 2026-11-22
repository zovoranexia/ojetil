import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");
  const common = await getTranslations("common");
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 md:px-8">
      <p className="font-mono text-sm text-ink-secondary">404</p>
      <h1 className="mt-2 text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-ink-secondary">{t("body")}</p>
      <Button asChild className="mt-8">
        <Link href="/">{common("backHome")}</Link>
      </Button>
    </div>
  );
}
