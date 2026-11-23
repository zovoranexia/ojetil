-- CreateTable
CREATE TABLE "news_view_days" (
    "articleId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "news_view_days_pkey" PRIMARY KEY ("articleId","day")
);

-- CreateIndex
CREATE INDEX "news_view_days_day_idx" ON "news_view_days"("day");

-- AddForeignKey
ALTER TABLE "news_view_days" ADD CONSTRAINT "news_view_days_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
