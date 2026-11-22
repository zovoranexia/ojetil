import type { Metadata } from "next";
import { Search, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { NewsCard } from "@/components/public/news-card";
import { PageHeader } from "@/components/public/page-header";
import { Pagination } from "@/components/public/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { localizedAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORIES, isNewsCategory, listPublishedNews } from "@/modules/news/queries";

type SearchParams = Promise<{ q?: string | string[]; kategoria?: string | string[]; page?: string | string[] }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "news" });
  return { title: t("metaTitle"), description: t("lead"), alternates: localizedAlternates("/notisia", locale) };
}

/*
 * Search and category filters are plain GET forms and links: they work on any
 * phone, without JavaScript, and every result page is shareable/bookmarkable.
 */
export default async function NewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await getPageLocale(params);
  const sp = await searchParams;

  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const rawCategory = first(sp.kategoria);
  const category = isNewsCategory(rawCategory) ? rawCategory : undefined;
  const page = Math.max(Number.parseInt(first(sp.page) ?? "1", 10) || 1, 1);

  const [t, result] = await Promise.all([getTranslations("news"), listPublishedNews({ locale, query: q, category, page })]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-tap shrink-0 items-center rounded-control border px-3.5 text-sm font-semibold transition-colors md:min-h-9",
      active ? "border-ink bg-ink text-paper" : "border-border-subtle bg-surface-card text-ink hover:border-border-strong",
    );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <form role="search" method="get" className="mt-8 flex max-w-2xl gap-2">
          {category ? <input type="hidden" name="kategoria" value={category} /> : null}
          <label htmlFor="news-q" className="sr-only">
            {t("searchLabel")}
          </label>
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            <Input id="news-q" name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder")} className="pl-9" maxLength={100} enterKeyHint="search" />
          </div>
          <Button type="submit" variant="editorial">
            {t("searchButton")}
          </Button>
        </form>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <nav aria-label={t("categoryLabel")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <ul className="flex gap-2">
            <li>
              <Link href={{ pathname: "/notisia", query: q ? { q } : {} }} aria-current={!category ? "page" : undefined} className={chip(!category)}>
                {t("allCategories")}
              </Link>
            </li>
            {NEWS_CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  href={{ pathname: "/notisia", query: { ...(q ? { q } : {}), kategoria: c } }}
                  aria-current={category === c ? "page" : undefined}
                  className={chip(category === c)}
                >
                  {t(`categories.${c}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 flex flex-wrap items-center gap-3" aria-live="polite">
          <p className="text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{t("results", { count: result.total })}</span>
            {q ? <> {t("resultsFor", { query: q })}</> : null}
          </p>
          {q || category ? (
            <Link href="/notisia" className="inline-flex min-h-tap items-center gap-1 text-sm font-semibold text-ojetil-red hover:underline md:min-h-8">
              <X aria-hidden="true" className="size-4" /> {t("clear")}
            </Link>
          ) : null}
        </div>

        {result.items.length ? (
          <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.items.map((a) => (
              <li key={a.slug}>
                <NewsCard article={a} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-card border border-dashed border-border-subtle p-8 text-center text-ink-secondary">{t("empty")}</p>
        )}

        <Pagination pathname="/notisia" page={result.page} pageCount={result.pageCount} query={{ q, kategoria: category }} />
      </div>
    </>
  );
}
