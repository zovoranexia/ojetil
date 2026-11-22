"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Recoverable error boundary for public pages (e.g. a dropped mobile connection). */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  const common = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-2xl px-4 py-20 md:px-8">
      <h1 className="text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-ink-secondary">{t("body")}</p>
      <Button className="mt-8" onClick={reset}>
        {common("tryAgain")}
      </Button>
    </div>
  );
}
