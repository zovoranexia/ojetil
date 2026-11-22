/**
 * Sends one test email to check the SMTP settings after deploying.
 *
 *   npm run mail:test -- you@example.org
 */
import "dotenv/config";
import { renderEmail } from "../src/lib/mail/layout";
import { isMailConfigured, sendMail } from "../src/lib/mail/transport";

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to || !/^[^\s@]+@[^\s@]+$/.test(to)) {
    console.error("Usage: npm run mail:test -- you@example.org");
    process.exitCode = 1;
    return;
  }
  if (!isMailConfigured()) {
    console.error("SMTP_HOST is not set in .env — nothing to test.");
    process.exitCode = 1;
    return;
  }
  const { html, text } = renderEmail({
    lang: "tet",
    preheader: "SMTP test",
    heading: "Email teste OJETIL",
    paragraphs: ["Se ita simu email ne'e, konfigurasaun SMTP servidór nian di'ak ona.", "If you received this email, the server's SMTP settings work."],
    footer: "Email automátiku — test.",
  });
  const ok = await sendMail({ to, subject: "OJETIL — SMTP test", html, text });
  console.log(ok ? "✔ Sent. Check the inbox (and the spam folder)." : "✖ Not sent — see the error above.");
  if (!ok) process.exitCode = 1;
}

void main();
