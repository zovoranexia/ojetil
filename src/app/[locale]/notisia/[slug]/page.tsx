import type { Metadata } from "next";
import { ArrowLeft, Download, FileText, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { RichContent } from "@/components/content/rich-content";
import { ContentImage } from "@/components/public/content-image";
import { NewsCard } from "@/components/public/news-card";
import { Badge } from "@/components/ui/badge";
import { fromDbLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { Link } from "@/i18n/navigation";
import { formatDate, isoDate } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";
import { getPublishedDocumentSummary } from "@/modules/documents/queries";
import { documentDownloadPath, formatFileSize } from "@/modules/documents/schema";
import { getPublishedArticle } from "@/modules/news/queries";

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
    openGraph: { type: "article", title: article.title, description: article.excerpt, publishedTime: article.publishedAt.toISOString() },
  };
}

export default async function NewsArticlePage({ params }: { params: Params }) {
  const locale = await getPageLocale(params);
  const { slug } = await params;

  const [t, article] = await Promise.all([getTranslations("news"), getPublishedArticle(slug, locale)]);
  if (!article) notFound();

  const servedLocale = fromDbLocale(article.servedLocale);
  // Only a PUBLISHED document is shown; an unpublished attachment silently disappears.
  const attachment = article.documentId ? await getPublishedDocumentSummary(article.documentId, locale) : null;

  return (
    <article>
      <header className="border-b border-border-subtle">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 md:px-8 md:pt-12">
          <Link href="/notisia" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ojetil-red">
            <ArrowLeft aria-hidden="true" className="size-4" /> {t("back")}
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Badge tone={article.category === "PRESS_RELEASE" ? "info" : "heritage"}>{t(`categories.${article.category}`)}</Badge>
            {article.municipality ? (
              <span className="inline-flex items-center gap-1 text-ink-secondary">
                <MapPin aria-hidden="true" className="size-3.5" />
                <span className="sr-only">{t("municipalityLabel")}: </span>
                {municipalityLabel(article.municipality)}
              </span>
            ) : null}
            <time dateTime={isoDate(article.publishedAt)} className="tabular-nums text-ink-secondary">
              {t("publishedOn", { date: formatDate(article.publishedAt, locale, { weekday: true }) })}
            </time>
          </div>
          <h1 lang={servedLocale} className="mt-4 text-4xl md:text-5xl">
            {article.title}
          </h1>
          <p lang={servedLocale} className="mt-5 text-xl text-ink-secondary">
            {article.excerpt}
          </p>
          {article.byline ? <p className="mt-5 text-sm font-semibold text-ink">{t("byline", { name: article.byline })}</p> : null}
        </div>
      </header>

      {article.coverImageUrl ? (
        <div className="mx-auto max-w-4xl px-4 pt-8 md:px-8">
          <ContentImage
            src={article.coverImageUrl}
            alt={article.coverImageAlt ?? ""}
            sizes="(min-width: 896px) 896px, 100vw"
            className="aspect-[16/9] w-full rounded-card"
            priority
          />
        </div>
      ) : null}

      <div lang={servedLocale} className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <RichContent body={article.body} />

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
