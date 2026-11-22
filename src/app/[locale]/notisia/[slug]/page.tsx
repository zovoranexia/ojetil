import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMetadataLocale, getPageLocale } from "@/i18n/page-locale";
import { Markdown } from "@/components/content/markdown";
import { ContentImage } from "@/components/public/content-image";
import { NewsCard } from "@/components/public/news-card";
import { Badge } from "@/components/ui/badge";
import { fromDbLocale } from "@/config/locales";
import { Link } from "@/i18n/navigation";
import { formatDate, isoDate } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";
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

  return (
    <article>
      <header className="border-b border-border-subtle">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 md:px-8 md:pt-12">
          <Link href="/notisia" className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ojetil-red">
            <ArrowLeft aria-hidden="true" className="size-4" /> {t("back")}
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Badge tone={article.category === "PRESS_RELEASE" ? "info" : "heritage"}>{t(`categories.${article.category}`)}</Badge>
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
        <Markdown source={article.body} />
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
