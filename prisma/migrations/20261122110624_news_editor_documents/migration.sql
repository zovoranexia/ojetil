-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_UPLOADED';

-- AlterTable
ALTER TABLE "news_articles" ADD COLUMN     "byline" TEXT,
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "municipality" "Municipality",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_translations" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "document_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_slug_key" ON "documents"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "documents_fileKey_key" ON "documents"("fileKey");

-- CreateIndex
CREATE INDEX "documents_status_updatedAt_idx" ON "documents"("status", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "document_translations_documentId_locale_key" ON "document_translations"("documentId", "locale");

-- CreateIndex
CREATE INDEX "news_articles_municipality_status_idx" ON "news_articles"("municipality", "status");

-- CreateIndex
CREATE INDEX "news_articles_tags_idx" ON "news_articles" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "news_articles_documentId_idx" ON "news_articles"("documentId");

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_translations" ADD CONSTRAINT "document_translations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
