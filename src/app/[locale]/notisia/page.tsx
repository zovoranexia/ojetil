import type { Metadata } from "next";
import { ChevronDown, MapPin, Search, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { NewsCard } from "@/components/public/news-card";
import { PageHeader } from "@/components/public/page-header";
import { Pagination } from "@/components/public/pagination";
import { Button } from "@/components/ui/button";
import { MUNICIPALITIES, municipalityLabel } from "@/config/municipalities";
import { Link } from "@/i18n/navigation";
import { localizedAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORIES, isMunicipality, isNewsCategory, listPublishedNews, popularNewsTags } from "@/modules/news/queries";

type SearchParams = Promise<{ q?: string | string[]; kategoria?: string | string[]; munisipiu?: string | string[]; tag?: string | string[]; page?: string | string[] }>;

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
  const rawMunicipality = first(sp.munisipiu);
  const municipality = isMunicipality(rawMunicipality) ? rawMunicipality : undefined;
  const tag = first(sp.tag)?.trim().slice(0, 40) || undefined;
  const page = Math.max(Number.parseInt(first(sp.page) ?? "1", 10) || 1, 1);

  const [t, result, tags] = await Promise.all([
    getTranslations("news"),
    listPublishedNews({ locale, query: q, category, municipality, tag, page }),
    popularNewsTags(),
  ]);
  /** Current filters, minus the ones being replaced — keeps links composable. */
  const query = (over: Record<string, string | undefined>) =>
    Object.fromEntries(Object.entries({ q, kategoria: category, munisipiu: municipality, tag, ...over }).filter(([, v]) => v)) as Record<string, string>;

  const activeFilters = [
    ...(q ? [{ key: "q", label: `“${q}”`, href: query({ q: undefined }) }] : []),
    ...(municipality ? [{ key: "munisipiu", label: municipalityLabel(municipality), href: query({ munisipiu: undefined }) }] : []),
    ...(tag ? [{ key: "tag", label: `#${tag}`, href: query({ tag: undefined }) }] : []),
  ];
  const tagList = tag && !tags.includes(tag) ? [tag, ...tags] : tags;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        {/* One filter bar: keyword + município, applied together (plain GET form, works without JS). */}
        <form
          role="search"
          method="get"
          className="mt-8 grid max-w-4xl gap-2 rounded-card border border-border-subtle bg-surface-card p-2 shadow-[0_1px_2px_rgb(24_24_27/0.04)] sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
        >
          {category ? <input type="hidden" name="kategoria" value={category} /> : null}
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          <div className="relative">
            <label htmlFor="news-q" className="sr-only">
              {t("searchLabel")}
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            <input
              id="news-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("searchPlaceholder")}
              maxLength={100}
              enterKeyHint="search"
              className="min-h-tap w-full rounded-control border-0 bg-transparent pl-9 pr-3 text-base text-ink placeholder:text-ink-secondary/70 focus-visible:outline-2 focus-visible:outline-ojetil-red md:min-h-11 md:text-[0.9375rem]"
            />
          </div>
          <div className="relative sm:border-l sm:border-border-subtle">
            <label htmlFor="news-municipality" className="sr-only">
              {t("municipalityLabel")}
            </label>
            <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            <select
              id="news-municipality"
              name="munisipiu"
              defaultValue={municipality ?? ""}
              className="min-h-tap w-full appearance-none rounded-control border-0 bg-transparent pl-9 pr-9 text-base text-ink focus-visible:outline-2 focus-visible:outline-ojetil-red md:min-h-11 md:text-[0.9375rem]"
            >
              <option value="">{t("allMunicipalities")}</option>
              {MUNICIPALITIES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
          </div>
          <Button type="submit" variant="editorial" className="md:min-h-11">
            <Search aria-hidden="true" /> {t("searchButton")}
          </Button>
        </form>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 pb-14 md:px-8">
        {/* Categories: tab bar with an underline indicator. */}
        <nav aria-label={t("categoryLabel")} className="-mx-4 overflow-x-auto border-b border-border-subtle px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <ul className="flex gap-6">
            {[undefined, ...NEWS_CATEGORIES].map((c) => {
              const active = category === c;
              return (
                <li key={c ?? "all"}>
                  <Link
                    href={{ pathname: "/notisia", query: query({ kategoria: c }) }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex min-h-12 items-center whitespace-nowrap text-[0.9375rem] font-semibold transition-colors",
                      "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
                      active ? "text-ink after:bg-ojetil-red" : "text-ink-secondary after:bg-transparent hover:text-ink hover:after:bg-border-strong",
                    )}
                  >
                    {c ? t(`categories.${c}`) : t("allCategories")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {tagList.length ? (
          <nav aria-label={t("tagsLabel")} className="-mr-4 mt-5 flex items-center gap-3 sm:mr-0 sm:items-start">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-secondary sm:mt-1.5">{t("tagsLabel")}</span>
            {/* Phones: one row that scrolls sideways; wider screens: wrap. */}
            <ul className="flex min-w-0 gap-1.5 overflow-x-auto pr-4 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pr-0">
              {tagList.map((tg) => (
                <li key={tg}>
                  <Link
                    href={{ pathname: "/notisia", query: query({ tag: tg === tag ? undefined : tg }) }}
                    aria-current={tg === tag ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-sm transition-colors",
                      tg === tag ? "border-ojetil-red bg-ojetil-red text-white" : "border-border-subtle bg-surface-card text-ink-secondary hover:border-border-strong hover:text-ink",
                    )}
                  >
                    #{tg}
                    {tg === tag ? <X aria-hidden="true" className="size-3.5" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/* Result count + active filters (each removable). */}
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
          <p className="font-serif text-lg font-semibold text-ink">{t("results", { count: result.total })}</p>
          {activeFilters.length ? (
            <ul className="flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <li key={f.key}>
                  <Link
                    href={{ pathname: "/notisia", query: f.href }}
                    aria-label={t("removeFilter", { label: f.label })}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-control bg-surface-muted px-2.5 text-sm text-ink hover:bg-border-subtle"
                  >
                    {f.label}
                    <X aria-hidden="true" className="size-3.5 text-ink-secondary" />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/notisia" className="inline-flex min-h-8 items-center px-1 text-sm font-semibold text-ojetil-red hover:underline">
                  {t("clear")}
                </Link>
              </li>
            </ul>
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
          <div className="mt-6 rounded-card border border-dashed border-border-subtle px-6 py-12 text-center">
            <p className="text-ink-secondary">{t("empty")}</p>
            {activeFilters.length || category ? (
              <Link href="/notisia" className="mt-3 inline-flex min-h-tap items-center text-sm font-semibold text-ojetil-red hover:underline">
                {t("clear")}
              </Link>
            ) : null}
          </div>
        )}

        <Pagination pathname="/notisia" page={result.page} pageCount={result.pageCount} query={{ q, kategoria: category, munisipiu: municipality, tag }} />
      </div>
    </>
  );
}
