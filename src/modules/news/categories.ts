import type { NewsCategory } from "@prisma/client";

/** Client-safe news category list and English labels for the backoffice. */
export const NEWS_CATEGORY_VALUES = [
  "ORGANIZATION",
  "CIVIC_EDUCATION",
  "YOUTH",
  "COMMEMORATION",
  "PRESS_RELEASE",
] as const satisfies readonly NewsCategory[];

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  ORGANIZATION: "Organisation",
  CIVIC_EDUCATION: "Civic education",
  YOUTH: "Youth",
  COMMEMORATION: "Commemoration",
  PRESS_RELEASE: "Press release",
};
