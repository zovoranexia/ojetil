import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env";

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const env = getServerEnv();
  if (!env.SMTP_HOST) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    // Never fall back to plaintext on port 587.
    requireTLS: env.SMTP_SECURE !== "true",
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

/**
 * Development aid: with MAIL_PREVIEW_DIR set (and no SMTP), each email is
 * written there as an .html file to open in a browser. Ignored in production.
 */
async function writePreview(message: MailMessage): Promise<void> {
  const dir = process.env.MAIL_PREVIEW_DIR;
  if (!dir || process.env.NODE_ENV === "production") return;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  await mkdir(dir, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${message.subject.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60)}.html`;
  await writeFile(join(dir, name), message.html, "utf8").catch(() => undefined);
}

export function isMailConfigured(): boolean {
  return Boolean(getServerEnv().SMTP_HOST);
}

/** Staff recipients for admin alerts (empty when not configured). */
export function adminNotifyRecipients(): string[] {
  return (getServerEnv().ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+$/.test(s));
}

/**
 * Sends one email. Never throws: a mail outage must not break a registration
 * or a decision that has already been saved. Returns whether it was sent.
 * Without SMTP_HOST (local development) the subject and recipient count are logged.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const to = Array.isArray(message.to) ? message.to : [message.to];
  if (to.length === 0) return false;
  const t = getTransporter();
  if (!t) {
    console.info(`[mail] SMTP not configured — not sent: "${message.subject}" → ${to.length} recipient(s)`);
    await writePreview(message);
    return false;
  }
  const env = getServerEnv();
  try {
    await t.sendMail({ from: env.MAIL_FROM, replyTo: env.MAIL_REPLY_TO, to, subject: message.subject, text: message.text, html: message.html });
    return true;
  } catch (error) {
    // Log the failure, never the recipient address or content.
    console.error(`[mail] send failed: "${message.subject}"`, error instanceof Error ? error.message : error);
    return false;
  }
}
