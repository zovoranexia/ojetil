-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'PDF', 'VIDEO', 'AUDIO', 'VIDEO_LINK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_DELETED';

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "credit" TEXT,
    "altText" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_url_key" ON "media_assets"("url");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_fileKey_key" ON "media_assets"("fileKey");

-- CreateIndex
CREATE INDEX "media_assets_kind_createdAt_idx" ON "media_assets"("kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "media_assets_createdAt_idx" ON "media_assets"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
