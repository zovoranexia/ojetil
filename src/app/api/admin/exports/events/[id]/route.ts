import { municipalityLabel } from "@/config/municipalities";
import { adminDateTime } from "@/lib/admin-format";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { withApiAuth } from "@/lib/security/guards";
import { recordAudit } from "@/modules/audit/service";

export const runtime = "nodejs";

/** GET /api/admin/exports/events/:id — attendee roster CSV (events:export, audited). */
export const GET = withApiAuth<{ id: string }>("events:export", async (_request, user, { params }) => {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    select: {
      slug: true,
      registrations: {
        orderBy: { fullName: "asc" },
        select: { ticketCode: true, fullName: true, email: true, phone: true, institution: true, municipality: true, status: true, checkedInAt: true, createdAt: true },
      },
    },
  });
  if (!event) return new Response("Not found", { status: 404 });

  const csv = toCsv(
    ["Ticket", "Full name", "Email", "Phone", "Institution", "Municipality", "Status", "Checked in", "Registered at"],
    event.registrations.map((r) => [
      r.ticketCode,
      r.fullName,
      r.email,
      r.phone,
      r.institution,
      r.municipality ? municipalityLabel(r.municipality) : "",
      r.status,
      r.checkedInAt ? adminDateTime(r.checkedInAt) : "",
      adminDateTime(r.createdAt),
    ]),
  );
  await recordAudit({
    action: "EVENT_ATTENDEES_EXPORTED",
    actor: user,
    target: { type: "Event", id },
    metadata: { slug: event.slug, rowCount: event.registrations.length, format: "csv" },
  });
  return csvResponse(`ojetil-attendees-${event.slug}.csv`, csv);
});
