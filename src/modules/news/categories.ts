import type { NewsCategory } from "@prisma/client";

/** Client-safe news category list. Backoffice labels: messages `admin.news.categories.<VALUE>`. */
export const NEWS_CATEGORY_VALUES = [
  "NEWS",
  "ORGANIZATION",
  "CIVIC_EDUCATION",
  "YOUTH",
  "COMMEMORATION",
  "PRESS_RELEASE",
] as const satisfies readonly NewsCategory[];
