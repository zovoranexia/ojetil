import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Clock, Download, FileText, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { RichContent } from "@/components/content/rich-content";
import { JsonLd, organizationLd } from "@/components/seo/json-ld";
import { NewsCard } from "@/components/public/news-card";
import { ShareButtons } from "@/components/public/share-buttons";
import { ViewBeacon } from "@/components/public/view-beacon";
import { Badge } from "@/components/ui/badge";
import { fromDbLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { Link } from "@/i18n/navigation";
import { formatDate, isoDate } from "@/lib/format";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { getPublishedDocumentSummary } from "@/modules/documents/queries";
import { documentDownloadPath, formatFileSize } from "@/modules/documents/schema";
import { getServerEnv } from "@/lib/env";
import { getPublishedArticle, latestNews } from "@/modules/news/queries";
import { articlePlainText } from "@/lib/content/sanitize";
import { Button } from "@/components/ui/button";
import { REGISTER_PATH } from "@/config/navigation";

/** About 200 words a minute, never less than one minute. */
function readingMinutes(body: string): number {
  const words = articlePlainText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Two initials for the author badge ("Etelvina dos Santos" → "ES"). */
function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await getMetadataLocale(params);
  if (!locale) return {};
  const { slug } = await params;
  const article = await getPublishedArticle(slug, locale);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: localizedAlternates(`/notisia/${slug}`, locale),
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt.toISOString(),
      // The cover is no longer shown on the article page, but it is the preview image when the link is shared.
      ...(article.coverImageUrl ? { images: [{ url: article.coverImageUrl, alt: article.coverImageAlt || article.title }] } : {}),
    },
    twitter: { card: article.coverImageUrl ? "summary_large_image" : "summary", title: article.title, description: article.excerpt },
  };
}

export default async function NewsArticlePage({ params }: { params: Params }) {
  const locale = await getPageLocale(params);
  const { slug } = await params;

  const [t, tHome, article, latest] = await Promise.all([
    getTranslations("news"),
    getTranslations("home"),
    getPublishedArticle(slug, locale),
    latestNews(locale, 5, { featuredFirst: false, excludeSlug: slug }),
  ]);
  if (!article) notFound();
  const minutes = readingMinutes(article.body);

  const servedLocale = fromDbLocale(article.servedLocale);
  // Absolute link to this page in the reader's language (Tetun has no prefix).
  const shareUrl = new URL(`${locale === "tet" ? "" : `/${locale}`}/notisia/${article.slug}`, getServerEnv().APP_URL).toString();
  // Only a PUBLISHED document is shown; an unpublished attachment silently disappears.
  const attachment = article.documentId ? await getPublishedDocumentSummary(article.documentId, locale) : null;

  return (
    <article>
      <JsonLd
        data={{
          "@type": "NewsArticle",
          headline: article.title.slice(0, 110),
          description: article.excerpt,
          inLanguage: servedLocale,
          datePublished: article.publishedAt.toISOString(),
          dateModified: article.updatedAt.toISOString(),
          mainEntityOfPage: shareUrl,
          ...(article.coverImageUrl ? { image: [absoluteUrl(article.coverImageUrl)] } : {}),
          ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
          author: article.byline ? { "@type": "Person", name: article.byline } : { "@id": absoluteUrl("/#organization") },
          publisher: organizationLd(),
        }}
      />
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="pt-8 md:pt-10">
          <Link href="/notisia" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ojetil-red">
            <ArrowLeft aria-hidden="true" className="size-4" /> {t("back")}
          </Link>
        </div>

        <div className="grid gap-12 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <div className="min-w-0 max-w-[46rem]">
            <header className="border-b border-border-subtle pb-8">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge tone={article.category === "PRESS_RELEASE" ? "info" : "heritage"}>{t(`categories.${article.category}`)}</Badge>
                {article.municipality ? (
                  <span className="inline-flex items-center gap-1 text-ink-secondary">
                    <MapPin aria-hidden="true" className="size-3.5" />
                    <span className="sr-only">{t("municipalityLabel")}: </span>
                    {municipalityLabel(article.municipality)}
                  </span>
                ) : null}
              </div>
              <h1 lang={servedLocale} className="mt-4 text-4xl leading-[1.12] md:text-5xl">
                {article.title}
              </h1>
              <p lang={servedLocale} className="mt-5 border-l-[3px] border-gold-accent pl-4 text-lg leading-relaxed text-ink-secondary md:text-xl">
                {article.excerpt}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                  {article.byline ? (
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-deep font-serif text-sm font-bold text-gold-accent">
                      {initials(article.byline)}
                    </span>
                  ) : null}
                  <div className="text-sm leading-snug">
                    {article.byline ? <p className="font-semibold text-ink">{t("byline", { name: article.byline })}</p> : null}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-ink-secondary">
                      <time dateTime={isoDate(article.publishedAt)} className="tabular-nums">
                        {t("publishedOn", { date: formatDate(article.publishedAt, locale, { weekday: true }) })}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock aria-hidden="true" className="size-3.5" />
                        {t("readingTime", { minutes })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <ShareButtons className="mt-6" url={shareUrl} title={article.title} tone="neutral" />
              <ViewBeacon slug={article.slug} />
            </header>

            <div lang={servedLocale} className="pt-8">
              <RichContent body={article.body} />
            </div>

            {attachment ? (
              <section aria-labelledby="attachment-heading" className="mt-10 rounded-card border border-border-subtle bg-surface-card p-5">
                <h2 id="attachment-heading" className="text-sm font-semibold uppercase tracking-wide text-ink-secondary">
                  {t("attachment")}
                </h2>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <FileText aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-ojetil-red" />
                    <div className="min-w-0">
                      <p lang={fromDbLocale(attachment.servedLocale)} className="font-semibold">
                        {attachment.title}
                      </p>
                      {attachment.description ? (
                        <p lang={fromDbLocale(attachment.servedLocale)} className="mt-1 text-sm text-ink-secondary">
                          {attachment.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs tabular-nums text-ink-secondary">{t("pdfSize", { size: formatFileSize(attachment.fileSize) })}</p>
                    </div>
                  </div>
                  <a
                    href={documentDownloadPath(attachment.slug)}
                    download
                    className="inline-flex min-h-tap shrink-0 items-center justify-center gap-2 rounded-control bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink/85 md:min-h-10"
                  >
                    <Download aria-hidden="true" className="size-4" /> {t("downloadPdf")}
                  </a>
                </div>
              </section>
            ) : null}

            {article.tags.length ? (
              <div className="mt-10 border-t border-border-subtle pt-6">
                <h2 className="sr-only">{t("tagsLabel")}</h2>
                <ul className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={{ pathname: "/notisia", query: { tag } }}
                        className="inline-flex min-h-tap items-center rounded-control border border-border-subtle bg-surface-card px-3 text-sm hover:border-border-strong md:min-h-8"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-10 rounded-card border border-border-subtle bg-surface-card p-5">
              <p className="text-sm font-semibold text-ink">{t("shareArticle")}</p>
              <ShareButtons className="mt-3 [&>span:first-child]:sr-only" url={shareUrl} title={article.title} />
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {latest.length ? (
              <section aria-labelledby="latest-heading" className="rounded-card border border-border-subtle bg-surface-card p-5">
                <h2 id="latest-heading" className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold-text">
                  {t("latest")}
                </h2>
                <ol className="mt-4 divide-y divide-border-subtle">
                  {latest.map((a) => (
                    <li key={a.slug} className="py-3 first:pt-0 last:pb-0">
                      <Link href={`/notisia/${a.slug}`} className="group block">
                        <span className="line-clamp-3 font-serif text-[0.95rem] font-semibold leading-snug text-ink group-hover:text-ojetil-red group-hover:underline">
                          {a.title}
                        </span>
                        <time dateTime={isoDate(a.publishedAt)} className="mt-1 block text-xs tabular-nums text-ink-secondary">
                          {formatDate(a.publishedAt, locale)}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link href="/notisia" className="mt-4 inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ojetil-red hover:underline md:min-h-9">
                  {t("more")} <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </section>
            ) : null}

            <section aria-labelledby="join-heading" className="ink-chrome relative overflow-hidden rounded-card bg-brand-deep p-5 text-paper">
              <div aria-hidden="true" className="tais-ribbon absolute inset-x-0 top-0" />
              <h2 id="join-heading" className="mt-1 text-xl text-paper">
                {t("joinTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-paper/80">{t("joinBody")}</p>
              <Button asChild size="sm" variant="editorial" className="mt-4 w-full">
                <Link href={REGISTER_PATH}>
                  {tHome("cta.button")} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          </aside>
        </div>
      </div>

      {article.related.length ? (
        <aside aria-labelledby="related" className="border-t border-border-subtle bg-surface-card">
          <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
            <h2 id="related" className="text-2xl">
              {t("more")}
            </h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-3">
              {article.related.map((a) => (
                <li key={a.slug}>
                  <NewsCard article={a} showImage={false} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      ) : null}
    </article>
  );
}
