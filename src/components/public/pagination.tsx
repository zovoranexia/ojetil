import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Server-rendered previous/next pagination that preserves the current query. */
export async function Pagination({
  pathname,
  page,
  pageCount,
  query,
}: {
  pathname: string;
  page: number;
  pageCount: number;
  query: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const t = await getTranslations("common");
  const href = (p: number) => ({
    pathname,
    query: Object.fromEntries(
      Object.entries({ ...query, page: p > 1 ? String(p) : undefined }).filter((e): e is [string, string] => Boolean(e[1])),
    ),
  });
  const base = "inline-flex min-h-tap items-center gap-1.5 rounded-control border border-border-subtle bg-surface-card px-4 text-sm font-semibold";

  return (
    <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(base, "hover:border-border-strong")}>
          <ChevronLeft aria-hidden="true" className="size-4" /> {t("previous")}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <p className="text-sm tabular-nums text-ink-secondary">{t("pageOf", { page, count: pageCount })}</p>
      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className={cn(base, "hover:border-border-strong")}>
          {t("next")} <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
