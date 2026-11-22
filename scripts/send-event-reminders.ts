/**
 * Emails attendees of events that start within the next 24 hours (once per
 * registration). Online events: the email carries the meeting link — the
 * registration page promises it ("the link will be sent to your email").
 *
 *   npm run events:remind
 *
 * Run it regularly from a systemd timer or cron (every 15–30 minutes; see
 * docs/DEPLOYMENT.md). Safe to overlap: each registration is claimed before sending.
 * Without SMTP settings nothing is sent and nothing is marked as reminded.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { isMailConfigured } from "../src/lib/mail/transport";
import { sendDueEventReminders } from "../src/modules/notifications/emails";

async function main(): Promise<void> {
  if (!isMailConfigured()) {
    console.log("SMTP is not configured (SMTP_HOST) — no reminders sent.");
    return;
  }
  const { due, sent } = await sendDueEventReminders();
  console.log(`Event reminders: ${due} due, ${sent} sent.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Reminders failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
