-- General "News" category (Berita / Notísia / Notícia), listed first.
ALTER TYPE "NewsCategory" ADD VALUE IF NOT EXISTS 'NEWS' BEFORE 'ORGANIZATION';
