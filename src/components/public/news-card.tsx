import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/config/locales";
import { Link } from "@/i18n/navigation";
import { formatDate, isoDate } from "@/lib/format";
import type { NewsListItem } from "@/modules/news/queries";
import { ContentImage } from "./content-image";

export async function NewsCard({ article, showImage = true }: { article: NewsListItem; showImage?: boolean }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("news");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-card transition-shadow hover:shadow-[0_8px_24px_-12px_rgb(24_24_27/0.25)]">
      {/* Image block only when the article has one; in Low-Data Mode it becomes a light placeholder. */}
      {showImage && article.coverImageUrl ? (
        <ContentImage
          src={article.coverImageUrl}
          alt={article.coverImageAlt ?? ""}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9] w-full"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Badge tone={article.category === "PRESS_RELEASE" ? "info" : "heritage"}>{t(`categories.${article.category}`)}</Badge>
          <time dateTime={isoDate(article.publishedAt)} className="tabular-nums text-ink-secondary">
            {formatDate(article.publishedAt, locale)}
          </time>
        </div>
        <h3 className="text-xl leading-snug">
          <Link href={`/notisia/${article.slug}`} className="after:absolute after:inset-0 group-hover:text-ojetil-red">
            {article.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-ink-secondary">{article.excerpt}</p>
      </div>
    </article>
  );
}
