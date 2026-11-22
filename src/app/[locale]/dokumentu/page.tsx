import type { Metadata } from "next";
import { CalendarDays, ChevronDown, Download, FileText, Search, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { PageHeader } from "@/components/public/page-header";
import { Pagination } from "@/components/public/pagination";
import { Button } from "@/components/ui/button";
import { fromDbLocale, LOCALE_META } from "@/config/locales";
import { Link } from "@/i18n/navigation";
import { formatDate, isoDate } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { listPublishedDocuments, publishedDocumentYears } from "@/modules/documents/queries";
import { DOCUMENT_CATEGORIES, documentDownloadPath, formatFileSize, isDocumentCategory } from "@/modules/documents/schema";

type SearchParams = Promise<{ q?: string | string[]; kategoria?: string | string[]; tinan?: string | string[]; page?: string | string[] }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: "documents" });
  return { title: t("metaTitle"), description: t("lead"), alternates: localizedAlternates("/dokumentu", locale) };
}

/*
 * Public document library. Same pattern as the news list: plain GET form and
 * links (works without JavaScript; every result page is shareable).
 */
export default async function DocumentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const locale = await getPageLocale(params);
  const sp = await searchParams;

  const q = first(sp.q)?.trim().slice(0, 100) || undefined;
  const rawCategory = first(sp.kategoria);
  const category = isDocumentCategory(rawCategory) ? rawCategory : undefined;
  const years = await publishedDocumentYears();
  const rawYear = Number.parseInt(first(sp.tinan) ?? "", 10);
  const year = years.includes(rawYear) ? rawYear : undefined;
  const page = Math.max(Number.parseInt(first(sp.page) ?? "1", 10) || 1, 1);

  const [t, result] = await Promise.all([getTranslations("documents"), listPublishedDocuments({ locale, query: q, category, year, page })]);

  const query = (over: Record<string, string | undefined>) =>
    Object.fromEntries(Object.entries({ q, kategoria: category, tinan: year ? String(year) : undefined, ...over }).filter(([, v]) => v)) as Record<string, string>;

  const activeFilters = [
    ...(q ? [{ key: "q", label: `“${q}”`, href: query({ q: undefined }) }] : []),
    ...(year ? [{ key: "tinan", label: String(year), href: query({ tinan: undefined }) }] : []),
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <form
          role="search"
          method="get"
          className="mt-8 grid max-w-4xl gap-2 rounded-card border border-border-subtle bg-surface-card p-2 shadow-[0_1px_2px_rgb(24_24_27/0.04)] sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_auto]"
        >
          {category ? <input type="hidden" name="kategoria" value={category} /> : null}
          <div className="relative">
            <label htmlFor="doc-q" className="sr-only">
              {t("searchLabel")}
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            <input
              id="doc-q"
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
            <label htmlFor="doc-year" className="sr-only">
              {t("yearLabel")}
            </label>
            <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            <select
              id="doc-year"
              name="tinan"
              defaultValue={year ? String(year) : ""}
              className="min-h-tap w-full appearance-none rounded-control border-0 bg-transparent pl-9 pr-9 text-base tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-ojetil-red md:min-h-11 md:text-[0.9375rem]"
            >
              <option value="">{t("allYears")}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
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
        <nav aria-label={t("categoryLabel")} className="-mx-4 overflow-x-auto border-b border-border-subtle px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <ul className="flex gap-6">
            {[undefined, ...DOCUMENT_CATEGORIES].map((c) => {
              const active = category === c;
              return (
                <li key={c ?? "all"}>
                  <Link
                    href={{ pathname: "/dokumentu", query: query({ kategoria: c }) }}
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

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
          <p className="font-serif text-lg font-semibold text-ink">{t("results", { count: result.total })}</p>
          {activeFilters.length ? (
            <ul className="flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <li key={f.key}>
                  <Link
                    href={{ pathname: "/dokumentu", query: f.href }}
                    aria-label={t("removeFilter", { label: f.label })}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-control bg-surface-muted px-2.5 text-sm text-ink hover:bg-border-subtle"
                  >
                    {f.label}
                    <X aria-hidden="true" className="size-3.5 text-ink-secondary" />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/dokumentu" className="inline-flex min-h-8 items-center px-1 text-sm font-semibold text-ojetil-red hover:underline">
                  {t("clear")}
                </Link>
              </li>
            </ul>
          ) : null}
        </div>

        {result.items.length ? (
          <ul className="mt-6 divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-surface-card">
            {result.items.map((d) => {
              const served = fromDbLocale(d.servedLocale);
              return (
                <li key={d.slug} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span aria-hidden="true" className="flex size-12 shrink-0 flex-col items-center justify-center rounded-control bg-ojetil-red/10 text-ojetil-red">
                      <FileText className="size-5" />
                      <span className="text-[0.625rem] font-bold leading-none">PDF</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">{t(`categories.${d.category}`)}</p>
                      <h2 className="mt-1 font-serif text-xl font-semibold leading-snug" lang={served !== locale ? served : undefined}>
                        {d.title}
                      </h2>
                      {d.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-secondary" lang={served !== locale ? served : undefined}>
                          {d.description}
                        </p>
                      ) : null}
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                        <time dateTime={isoDate(d.publishedAt)}>{formatDate(d.publishedAt, locale)}</time>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">PDF, {formatFileSize(d.fileSize)}</span>
                        {served !== locale ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{t("availableIn", { language: LOCALE_META[served].nativeName })}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="shrink-0 sm:self-center">
                    <a href={documentDownloadPath(d.slug)} download>
                      <Download aria-hidden="true" /> {t("download")}
                      <span className="sr-only">: {d.title}</span>
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-card border border-dashed border-border-subtle px-6 py-12 text-center">
            <p className="text-ink-secondary">{t("empty")}</p>
            {activeFilters.length || category ? (
              <Link href="/dokumentu" className="mt-3 inline-flex min-h-tap items-center text-sm font-semibold text-ojetil-red hover:underline">
                {t("clear")}
              </Link>
            ) : null}
          </div>
        )}

        <Pagination pathname="/dokumentu" page={result.page} pageCount={result.pageCount} query={query({})} />
      </div>
    </>
  );
}
