-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'VERIFIER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('tet', 'pt', 'id', 'en');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Municipality" AS ENUM ('AILEU', 'AINARO', 'ATAURO', 'BAUCAU', 'BOBONARO', 'COVA_LIMA', 'DILI', 'ERMERA', 'LAUTEM', 'LIQUICA', 'MANATUTO', 'MANUFAHI', 'OECUSSE', 'VIQUEQUE', 'DIASPORA');

-- CreateEnum
CREATE TYPE "MemberCategory" AS ENUM ('VETERAN_KLANDESTIN', 'ANGGOTA_PEMUDA');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_VERIFICATION', 'NEEDS_REVISION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "InterestArea" AS ENUM ('EDUCATION', 'ADVOCACY', 'MEDIA', 'COMMUNITY_SERVICE');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('ORGANIZATION', 'CIVIC_EDUCATION', 'YOUTH', 'COMMEMORATION', 'PRESS_RELEASE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SEMINAR', 'DEBATE', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('DECADE', 'YEAR', 'MONTH', 'DAY');

-- CreateEnum
CREATE TYPE "LeadershipLevel" AS ENUM ('NATIONAL', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "ProfileSectionKey" AS ENUM ('PROFILE', 'VISION', 'MISSION', 'VALUES', 'HISTORY_INTRO');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTH', 'VERIFICATION', 'CONTENT', 'EVENTS', 'USERS', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'ACCOUNT_LOCKED', 'MEMBER_PII_VIEWED', 'MEMBER_STATUS_CHANGED', 'MEMBER_EXPORTED', 'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_PUBLISHED', 'CONTENT_UNPUBLISHED', 'CONTENT_DELETED', 'EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_PUBLISHED', 'EVENT_CANCELLED', 'EVENT_DELETED', 'EVENT_ATTENDEES_EXPORTED', 'EVENT_ATTENDANCE_UPDATED', 'USER_CREATED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'USER_PASSWORD_RESET', 'SEED_EXECUTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "passwordChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_registrations" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "category" "MemberCategory" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "fullName" TEXT NOT NULL,
    "clandestineAlias" TEXT,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "profilePhotoKey" TEXT,
    "municipality" "Municipality" NOT NULL,
    "administrativePost" TEXT NOT NULL,
    "email" TEXT,
    "addressCiphertext" BYTEA NOT NULL,
    "addressIv" BYTEA NOT NULL,
    "addressAuthTag" BYTEA NOT NULL,
    "phoneCiphertext" BYTEA NOT NULL,
    "phoneIv" BYTEA NOT NULL,
    "phoneAuthTag" BYTEA NOT NULL,
    "nationalIdCiphertext" BYTEA NOT NULL,
    "nationalIdIv" BYTEA NOT NULL,
    "nationalIdAuthTag" BYTEA NOT NULL,
    "nationalIdHash" TEXT NOT NULL,
    "piiKeyVersion" INTEGER NOT NULL,
    "yearJoined" INTEGER,
    "clandestineCell" TEXT,
    "clandestineRegion" TEXT,
    "witnessReference" TEXT,
    "institution" TEXT,
    "interests" "InterestArea"[],
    "motivation" TEXT,
    "consentGiven" BOOLEAN NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "submittedLocale" "Locale" NOT NULL DEFAULT 'tet',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMPTZ(3),
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "member_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_status_changes" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "fromStatus" "RegistrationStatus",
    "toStatus" "RegistrationStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_sequences" (
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("scope")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "NewsCategory" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "coverImageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_article_translations" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverImageAlt" TEXT,

    CONSTRAINT "news_article_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dili',
    "location" TEXT NOT NULL,
    "municipality" "Municipality",
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "onlineUrl" TEXT,
    "capacity" INTEGER NOT NULL,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "registrationDeadline" TIMESTAMPTZ(3),
    "coverImageUrl" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_translations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationDetails" TEXT,

    CONSTRAINT "event_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "institution" TEXT,
    "municipality" "Municipality",
    "status" "AttendeeStatus" NOT NULL DEFAULT 'REGISTERED',
    "checkedInAt" TIMESTAMPTZ(3),
    "locale" "Locale" NOT NULL DEFAULT 'tet',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_milestones" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "day" INTEGER,
    "datePrecision" "DatePrecision" NOT NULL DEFAULT 'YEAR',
    "displayOrder" INTEGER NOT NULL,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "timeline_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_milestone_translations" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "imageAlt" TEXT,

    CONSTRAINT "timeline_milestone_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadership_members" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "level" "LeadershipLevel" NOT NULL,
    "municipality" "Municipality",
    "termStart" INTEGER NOT NULL,
    "termEnd" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leadership_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadership_member_translations" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,

    CONSTRAINT "leadership_member_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_sections" (
    "id" TEXT NOT NULL,
    "key" "ProfileSectionKey" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_section_translations" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "profile_section_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" "Role",
    "action" "AuditAction" NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "member_registrations_trackingCode_key" ON "member_registrations"("trackingCode");

-- CreateIndex
CREATE INDEX "member_registrations_status_category_idx" ON "member_registrations"("status", "category");

-- CreateIndex
CREATE INDEX "member_registrations_municipality_idx" ON "member_registrations"("municipality");

-- CreateIndex
CREATE INDEX "member_registrations_nationalIdHash_idx" ON "member_registrations"("nationalIdHash");

-- CreateIndex
CREATE INDEX "member_registrations_createdAt_idx" ON "member_registrations"("createdAt");

-- CreateIndex
CREATE INDEX "member_status_changes_registrationId_createdAt_idx" ON "member_status_changes"("registrationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_slug_key" ON "news_articles"("slug");

-- CreateIndex
CREATE INDEX "news_articles_status_publishedAt_idx" ON "news_articles"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "news_articles_category_status_idx" ON "news_articles"("category", "status");

-- CreateIndex
CREATE INDEX "news_article_translations_locale_idx" ON "news_article_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "news_article_translations_articleId_locale_key" ON "news_article_translations"("articleId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_startAt_idx" ON "events"("status", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_translations_eventId_locale_key" ON "event_translations"("eventId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_ticketCode_key" ON "event_registrations"("ticketCode");

-- CreateIndex
CREATE INDEX "event_registrations_eventId_status_idx" ON "event_registrations"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_eventId_email_key" ON "event_registrations"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_milestones_slug_key" ON "timeline_milestones"("slug");

-- CreateIndex
CREATE INDEX "timeline_milestones_status_displayOrder_idx" ON "timeline_milestones"("status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_milestone_translations_milestoneId_locale_key" ON "timeline_milestone_translations"("milestoneId", "locale");

-- CreateIndex
CREATE INDEX "leadership_members_level_status_displayOrder_idx" ON "leadership_members"("level", "status", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "leadership_member_translations_memberId_locale_key" ON "leadership_member_translations"("memberId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "profile_sections_key_key" ON "profile_sections"("key");

-- CreateIndex
CREATE UNIQUE INDEX "profile_section_translations_sectionId_locale_key" ON "profile_section_translations"("sectionId", "locale");

-- CreateIndex
CREATE INDEX "audit_logs_category_createdAt_idx" ON "audit_logs"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_registrations" ADD CONSTRAINT "member_registrations_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_status_changes" ADD CONSTRAINT "member_status_changes_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "member_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_status_changes" ADD CONSTRAINT "member_status_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_translations" ADD CONSTRAINT "news_article_translations_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_milestone_translations" ADD CONSTRAINT "timeline_milestone_translations_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "timeline_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership_member_translations" ADD CONSTRAINT "leadership_member_translations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "leadership_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_section_translations" ADD CONSTRAINT "profile_section_translations_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "profile_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

