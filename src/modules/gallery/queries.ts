import "server-only";
import type { ContentStatus, MediaKind, Municipality, Prisma } from "@prisma/client";
import type { AppLocale } from "@/config/locales";
import { db } from "@/lib/db";
import { fromTranslationRows } from "@/modules/content/admin-schema";
import { pickTranslation, translationLocales } from "@/modules/content/translation";
import { toMediaDTO } from "@/modules/media/service";
import type { MediaAssetDTO } from "@/modules/media/schema";
import { GALLERY_TRANSLATION_FIELDS, type GalleryFormValues } from "./schema";

const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/* ── Backoffice ───────────────────────────────────────────────────────────── */

export async function listAlbumsAdmin(params: { q?: string; status?: ContentStatus; page: number }) {
  const pageSize = 20;
  const where: Prisma.GalleryAlbumWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q ? { OR: [{ slug: { contains: params.q, mode: "insensitive" } }, { translations: { some: { title: { contains: params.q, mode: "insensitive" } } } }] } : {}),
  };
  const total = await db.galleryAlbum.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(params.page, pageCount);
  const rows = await db.galleryAlbum.findMany({
    where,
    orderBy: [{ takenOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      status: true,
      takenOn: true,
      updatedAt: true,
      translations: { select: { locale: true, title: true } },
      items: { orderBy: { position: "asc" }, take: 1, select: { asset: { select: { kind: true, url: true } } } },
      _count: { select: { items: true } },
    },
  });
  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      status: r.status,
      takenOn: r.takenOn,
      updatedAt: r.updatedAt,
      title: (r.translations.find((t) => t.locale === "TET") ?? r.translations[0])?.title ?? r.slug,
      locales: r.translations.map((t) => t.locale),
      cover: r.items[0]?.asset ?? null,
      count: r._count.items,
    })),
    total,
    page,
    pageCount,
  };
}

export interface AlbumEditorItem {
  asset: MediaAssetDTO;
  caption: string;
}

export async function getAlbumForEdit(id: string) {
  const a = await db.galleryAlbum.findUnique({
    where: { id },
    include: { translations: true, items: { orderBy: { position: "asc" }, include: { asset: { include: { createdBy: { select: { name: true } } } } } } },
  });
  if (!a) return null;
  const values: Omit<GalleryFormValues, "items"> = {
    id: a.id,
    slug: a.slug,
    takenOn: isoDay(a.takenOn),
    municipality: a.municipality ?? "",
    eventId: a.eventId ?? "",
    translations: fromTranslationRows(a.translations, GALLERY_TRANSLATION_FIELDS),
  };
  const items: AlbumEditorItem[] = a.items.map((i) => ({ asset: toMediaDTO(i.asset), caption: i.caption ?? "" }));
  return { id: a.id, status: a.status, values, items };
}

/** Events to link an album to (most recent first). */
export async function albumEventOptions(): Promise<Array<{ id: string; title: string; startAt: Date }>> {
  const rows = await db.event.findMany({
    where: { status: { in: ["PUBLISHED", "CANCELLED"] } },
    orderBy: { startAt: "desc" },
    take: 100,
    select: { id: true, slug: true, startAt: true, translations: { select: { locale: true, title: true } } },
  });
  return rows.map((r) => ({ id: r.id, startAt: r.startAt, title: (r.translations.find((t) => t.locale === "TET") ?? r.translations[0])?.title ?? r.slug }));
}

/* ── Public ──────────────────────────────────────────────────────────────── */

export interface PublicAlbumCard {
  slug: string;
  title: string;
  takenOn: Date | null;
  municipality: Municipality | null;
  count: number;
  cover: { kind: MediaKind; url: string; altText: string | null } | null;
}

const PUBLIC_PAGE_SIZE = 12;

const cardSelect = (locale: AppLocale) =>
  ({
    slug: true,
    takenOn: true,
    municipality: true,
    translations: { where: { locale: { in: translationLocales(locale) } }, select: { locale: true, title: true, description: true } },
    items: { orderBy: { position: "asc" }, where: { asset: { kind: "IMAGE" } }, take: 1, select: { asset: { select: { kind: true, url: true, altText: true } } } },
    _count: { select: { items: true } },
  }) satisfies Prisma.GalleryAlbumSelect;

function toCard(r: Prisma.GalleryAlbumGetPayload<{ select: ReturnType<typeof cardSelect> }>, locale: AppLocale): PublicAlbumCard | null {
  const tr = pickTranslation(r.translations, locale);
  if (!tr) return null;
  return { slug: r.slug, title: tr.title, takenOn: r.takenOn, municipality: r.municipality, count: r._count.items, cover: r.items[0]?.asset ?? null };
}

export async function listPublishedAlbums(params: { locale: AppLocale; page: number }) {
  const where: Prisma.GalleryAlbumWhereInput = { status: "PUBLISHED" };
  const total = await db.galleryAlbum.count({ where });
  const pageCount = Math.max(Math.ceil(total / PUBLIC_PAGE_SIZE), 1);
  const page = Math.min(params.page, pageCount);
  const rows = await db.galleryAlbum.findMany({
    where,
    orderBy: [{ takenOn: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
    skip: (page - 1) * PUBLIC_PAGE_SIZE,
    take: PUBLIC_PAGE_SIZE,
    select: cardSelect(params.locale),
  });
  return { items: rows.map((r) => toCard(r, params.locale)).filter((x): x is PublicAlbumCard => x !== null), total, page, pageCount };
}

export async function getPublishedAlbum(slug: string, locale: AppLocale) {
  const a = await db.galleryAlbum.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      slug: true,
      takenOn: true,
      municipality: true,
      updatedAt: true,
      translations: { where: { locale: { in: translationLocales(locale) } }, select: { locale: true, title: true, description: true } },
      event: { select: { slug: true, status: true, translations: { where: { locale: { in: translationLocales(locale) } }, select: { locale: true, title: true } } } },
      items: {
        orderBy: { position: "asc" },
        select: { id: true, caption: true, asset: { select: { kind: true, url: true, width: true, height: true, altText: true, credit: true } } },
      },
    },
  });
  if (!a) return null;
  const tr = pickTranslation(a.translations, locale);
  if (!tr) return null;
  const eventTitle = a.event && a.event.status !== "DRAFT" ? pickTranslation(a.event.translations, locale)?.title : null;
  return {
    slug: a.slug,
    title: tr.title,
    description: tr.description,
    servedLocale: tr.locale,
    takenOn: a.takenOn,
    municipality: a.municipality,
    updatedAt: a.updatedAt,
    event: a.event && eventTitle ? { slug: a.event.slug, title: eventTitle } : null,
    items: a.items.map((i) => ({ id: i.id, caption: i.caption, ...i.asset })),
  };
}

/** Published albums linked to an event (shown on the event page). */
export async function albumsForEvent(eventSlug: string, locale: AppLocale): Promise<PublicAlbumCard[]> {
  const rows = await db.galleryAlbum.findMany({ where: { status: "PUBLISHED", event: { slug: eventSlug } }, orderBy: { takenOn: "desc" }, take: 3, select: cardSelect(locale) });
  return rows.map((r) => toCard(r, locale)).filter((x): x is PublicAlbumCard => x !== null);
}

export async function publishedAlbumsForSitemap(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return db.galleryAlbum.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5000 });
}
