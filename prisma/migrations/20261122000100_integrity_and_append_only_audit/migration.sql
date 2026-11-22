-- ═══════════════════════════════════════════════════════════════════════════
-- Database-level guarantees that Prisma's schema language cannot express.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Append-only audit trail ──────────────────────────────────────────────
-- Application code only ever INSERTs into audit_logs. Any UPDATE, DELETE or
-- TRUNCATE (including from a compromised admin session or a careless script)
-- is rejected by the database itself.
CREATE OR REPLACE FUNCTION audit_logs_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_logs_no_update_or_delete
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_reject_mutation();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_reject_mutation();

-- ── 2. Integrity checks ─────────────────────────────────────────────────────
ALTER TABLE "member_registrations"
  ADD CONSTRAINT "member_registrations_tracking_code_format"
    CHECK ("trackingCode" ~ '^OJT-[0-9]{4}-[0-9]{4,}$'),
  ADD CONSTRAINT "member_registrations_consent_required"
    CHECK ("consentGiven" = TRUE),
  ADD CONSTRAINT "member_registrations_year_joined_range"
    CHECK ("yearJoined" IS NULL OR "yearJoined" BETWEEN 1974 AND 2002),
  ADD CONSTRAINT "member_registrations_iv_length"
    CHECK (octet_length("addressIv") = 12 AND octet_length("phoneIv") = 12 AND octet_length("nationalIdIv") = 12),
  ADD CONSTRAINT "member_registrations_tag_length"
    CHECK (octet_length("addressAuthTag") = 16 AND octet_length("phoneAuthTag") = 16 AND octet_length("nationalIdAuthTag") = 16);

ALTER TABLE "events"
  ADD CONSTRAINT "events_capacity_positive" CHECK ("capacity" > 0),
  ADD CONSTRAINT "events_end_after_start" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "events_online_url_required" CHECK (NOT "isOnline" OR "onlineUrl" IS NOT NULL);

ALTER TABLE "event_registrations"
  ADD CONSTRAINT "event_registrations_ticket_code_format"
    CHECK ("ticketCode" ~ '^TKT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$');

ALTER TABLE "timeline_milestones"
  ADD CONSTRAINT "timeline_milestones_month_range" CHECK ("month" IS NULL OR "month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "timeline_milestones_day_range" CHECK ("day" IS NULL OR "day" BETWEEN 1 AND 31);

ALTER TABLE "leadership_members"
  ADD CONSTRAINT "leadership_members_municipal_requires_municipality"
    CHECK ("level" <> 'MUNICIPAL' OR "municipality" IS NOT NULL),
  ADD CONSTRAINT "leadership_members_term_order"
    CHECK ("termEnd" IS NULL OR "termEnd" >= "termStart");
