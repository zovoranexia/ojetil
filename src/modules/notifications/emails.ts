import "server-only";
import type { MemberCategory, Municipality, RegistrationStatus } from "@prisma/client";
import { createTranslator } from "use-intl/core";
import { fromDbLocale, type AppLocale } from "@/config/locales";
import { municipalityLabel } from "@/config/municipalities";
import { CHECK_STATUS_PATH } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { formatDateTimeRange } from "@/lib/format";
import { renderEmail, type EmailContent } from "@/lib/mail/layout";
import { adminNotifyRecipients, sendMail } from "@/lib/mail/transport";
import { absoluteUrl } from "@/lib/site-url";
import { pickTranslation, translationLocales } from "@/modules/content/translation";

import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import pt from "../../../messages/pt.json";
import tet from "../../../messages/tet.json";

/*
 * Transactional emails. Each function loads what it needs, renders in the
 * recipient's language and sends; none of them throws (see sendMail), so they
 * can run after the response without risking a saved registration or decision.
 */

const MESSAGES = { tet, pt, id, en } as const;

/**
 * Translator that works both inside Next.js and in plain scripts (the
 * reminder job), where next-intl's request config is not available.
 */
type Translator = (key: string, values?: Record<string, string | number>) => string;
function translator(locale: AppLocale, namespace: string): Translator {
  return createTranslator({ locale, messages: MESSAGES[locale] as never, namespace: namespace as never }) as unknown as Translator;
}
async function getTranslations(opts: { locale: AppLocale; namespace: string }): Promise<Translator> {
  return translator(opts.locale, opts.namespace);
}

/** Public URL in the recipient's language (Tetun has no prefix; route segments stay Tetun). */
const link = (path: string, locale: AppLocale, query?: Record<string, string>) => {
  const url = absoluteUrl(`${locale === "tet" ? "" : `/${locale}`}${path === "/" && locale !== "tet" ? "" : path}`);
  return query ? `${url}?${new URLSearchParams(query)}` : url;
};

async function send(to: string | string[], locale: AppLocale, build: (t: Translator) => Omit<EmailContent, "lang" | "footer"> & { subject: string; footer?: string }) {
  const t = translator(locale, "emails");
  const { subject, footer, ...content } = build(t);
  const { html, text } = renderEmail({ ...content, lang: locale, footer: footer ?? t("footer", { org: siteConfig.shortName }) });
  return sendMail({ to, subject, html, text });
}

/* ── Members ──────────────────────────────────────────────────────────────── */

/** Applicant: "we received your registration" with the tracking code (only if they gave an email). */
export async function sendMemberRegistrationReceived(p: { email: string | null; fullName: string; trackingCode: string; category: MemberCategory; locale: AppLocale }) {
  if (!p.email) return false;
  const tCat = await getTranslations({ locale: p.locale, namespace: "memberRegistration.categories" });
  return send(p.email, p.locale, (t) => ({
    subject: t("memberReceived.subject", { code: p.trackingCode }),
    preheader: t("memberReceived.preheader"),
    heading: t("memberReceived.heading"),
    paragraphs: [t("greeting", { name: p.fullName }), t("memberReceived.body"), t("memberReceived.keepCode")],
    details: [
      [t("memberReceived.code"), p.trackingCode],
      [t("memberReceived.category"), tCat(p.category)],
    ],
    button: { label: t("memberReceived.button"), href: link(CHECK_STATUS_PATH, p.locale, { code: p.trackingCode }) },
  }));
}

/** Applicant: outcome of verification. The note is shown only for revision / rejection, as on the status page. */
export async function sendMemberDecision(registrationId: string) {
  const r = await db.memberRegistration.findUnique({
    where: { id: registrationId },
    select: { email: true, fullName: true, trackingCode: true, status: true, verificationNotes: true, submittedLocale: true },
  });
  if (!r?.email || r.status === "PENDING_VERIFICATION") return false;
  const locale = fromDbLocale(r.submittedLocale);
  const status = r.status as Exclude<RegistrationStatus, "PENDING_VERIFICATION">;
  const showNote = status !== "VERIFIED" && r.verificationNotes;
  return send(r.email, locale, (t) => ({
    subject: t(`memberDecision.${status}.subject`, { code: r.trackingCode }),
    preheader: t(`memberDecision.${status}.heading`),
    heading: t(`memberDecision.${status}.heading`),
    paragraphs: [t("greeting", { name: r.fullName }), t(`memberDecision.${status}.body`)],
    details: [[t("memberReceived.code"), r.trackingCode]],
    ...(showNote ? { quote: { label: t("memberDecision.noteLabel"), text: r.verificationNotes! } } : {}),
    button: { label: t("memberDecision.button"), href: link(CHECK_STATUS_PATH, locale, { code: r.trackingCode }) },
  }));
}

/** Staff: a new application is waiting. No personal data beyond the category and município. */
export async function sendAdminNewMember(p: { trackingCode: string; category: MemberCategory; municipality: Municipality }) {
  const to = adminNotifyRecipients();
  if (!to.length) return false;
  const tCat = await getTranslations({ locale: "tet", namespace: "memberRegistration.categories" });
  return send(to, "tet", (t) => ({
    subject: t("adminMember.subject", { code: p.trackingCode }),
    preheader: t("adminMember.body"),
    heading: t("adminMember.heading"),
    paragraphs: [t("adminMember.body")],
    details: [
      [t("memberReceived.code"), p.trackingCode],
      [t("memberReceived.category"), tCat(p.category)],
      [t("adminMember.municipality"), municipalityLabel(p.municipality)],
    ],
    button: { label: t("adminMember.button"), href: absoluteUrl(`/admin/anggota?q=${encodeURIComponent(p.trackingCode)}`) },
    footer: t("adminFooter"),
  }));
}

/** Staff: a new contact-form message. Sender details stay in the inbox (behind login). */
export async function sendAdminNewContactMessage(p: { id: string; topic: string; locale: AppLocale }) {
  const to = adminNotifyRecipients();
  if (!to.length) return false;
  const tTopic = await getTranslations({ locale: "tet", namespace: "contact.form.topics" });
  return send(to, "tet", (t) => ({
    subject: t("adminContact.subject", { topic: tTopic(p.topic) }),
    preheader: t("adminContact.body"),
    heading: t("adminContact.heading"),
    paragraphs: [t("adminContact.body")],
    details: [
      [t("adminContact.topic"), tTopic(p.topic)],
      [t("adminContact.language"), p.locale.toUpperCase()],
    ],
    button: { label: t("adminContact.button"), href: absoluteUrl(`/admin/pesan/${p.id}`) },
    footer: t("adminFooter"),
  }));
}

/* ── Events ───────────────────────────────────────────────────────────────── */

async function loadRegistration(ticketCode: string) {
  const reg = await db.eventRegistration.findUnique({
    where: { ticketCode },
    select: {
      id: true,
      email: true,
      fullName: true,
      ticketCode: true,
      locale: true,
      status: true,
      event: {
        select: {
          slug: true,
          startAt: true,
          endAt: true,
          location: true,
          isOnline: true,
          onlineUrl: true,
          status: true,
          translations: { select: { locale: true, title: true } },
        },
      },
    },
  });
  if (!reg) return null;
  const locale = fromDbLocale(reg.locale);
  const title = pickTranslation(reg.event.translations.filter((x) => translationLocales(locale).includes(x.locale)), locale)?.title ?? reg.event.slug;
  return { reg, locale, title };
}

function eventDetails(t: Translator, e: { startAt: Date; endAt: Date; location: string; isOnline: boolean }, locale: AppLocale, ticket: string): Array<[string, string]> {
  return [
    [t("event.ticket"), ticket],
    [t("event.when"), `${formatDateTimeRange(e.startAt, e.endAt, locale)} (${siteConfig.timeZoneLabel})`],
    [t("event.where"), e.isOnline ? t("event.online") : e.location],
  ];
}

/** Attendee: ticket confirmation right after registering. */
export async function sendEventRegistrationConfirmation(ticketCode: string) {
  const data = await loadRegistration(ticketCode);
  if (!data) return false;
  const { reg, locale, title } = data;
  return send(reg.email, locale, (t) => ({
    subject: t("eventRegistered.subject", { title }),
    preheader: t("eventRegistered.preheader", { ticket: reg.ticketCode }),
    heading: t("eventRegistered.heading"),
    paragraphs: [t("greeting", { name: reg.fullName }), t("eventRegistered.body", { title }), reg.event.isOnline ? t("eventRegistered.onlineNote") : t("eventRegistered.inPersonNote")],
    details: eventDetails(t, reg.event, locale, reg.ticketCode),
    button: { label: t("event.button"), href: link(`/edukasaun/acara/${reg.event.slug}`, locale) },
  }));
}

/** Attendee: reminder about a day before; carries the meeting link for online events. */
export async function sendEventReminder(ticketCode: string) {
  const data = await loadRegistration(ticketCode);
  if (!data || data.reg.status !== "REGISTERED" || data.reg.event.status !== "PUBLISHED") return false;
  const { reg, locale, title } = data;
  const online = reg.event.isOnline && reg.event.onlineUrl;
  return send(reg.email, locale, (t) => ({
    subject: t("eventReminder.subject", { title }),
    preheader: t("eventReminder.preheader"),
    heading: t("eventReminder.heading", { title }),
    paragraphs: [t("greeting", { name: reg.fullName }), online ? t("eventReminder.bodyOnline") : t("eventReminder.bodyInPerson")],
    details: eventDetails(t, reg.event, locale, reg.ticketCode),
    button: online ? { label: t("eventReminder.join"), href: reg.event.onlineUrl! } : { label: t("event.button"), href: link(`/edukasaun/acara/${reg.event.slug}`, locale) },
  }));
}

/** Attendees: the event was cancelled. Returns how many emails were sent. */
export async function sendEventCancelled(eventId: string): Promise<number> {
  const regs = await db.eventRegistration.findMany({ where: { eventId, status: "REGISTERED" }, select: { ticketCode: true } });
  let sent = 0;
  for (const { ticketCode } of regs) {
    const data = await loadRegistration(ticketCode);
    if (!data) continue;
    const { reg, locale, title } = data;
    const ok = await send(reg.email, locale, (t) => ({
      subject: t("eventCancelled.subject", { title }),
      preheader: t("eventCancelled.heading"),
      heading: t("eventCancelled.heading"),
      paragraphs: [t("greeting", { name: reg.fullName }), t("eventCancelled.body", { title })],
      details: eventDetails(t, reg.event, locale, reg.ticketCode),
      button: { label: t("eventCancelled.button"), href: link("/edukasaun/acara", locale) },
    }));
    if (ok) sent++;
  }
  return sent;
}

/** Look-ahead for reminders: events starting within this window get their reminder. */
export const REMINDER_WINDOW_MS = 24 * 3_600_000;

/**
 * Sends due reminders (run every 15–60 min by a timer, see scripts/send-event-reminders.ts).
 * Each registration is claimed with a conditional update before sending, so two
 * overlapping runs never email the same person twice; a failed send releases the claim.
 */
export async function sendDueEventReminders(now = new Date()): Promise<{ due: number; sent: number }> {
  const due = await db.eventRegistration.findMany({
    where: {
      status: "REGISTERED",
      reminderSentAt: null,
      event: { status: "PUBLISHED", startAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) } },
    },
    select: { id: true, ticketCode: true },
    take: 500,
  });
  let sent = 0;
  for (const r of due) {
    const claimed = await db.eventRegistration.updateMany({ where: { id: r.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count !== 1) continue;
    if (await sendEventReminder(r.ticketCode)) sent++;
    else await db.eventRegistration.update({ where: { id: r.id }, data: { reminderSentAt: null } });
  }
  return { due: due.length, sent };
}

