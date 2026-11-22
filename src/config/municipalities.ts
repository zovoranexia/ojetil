import type { InterestArea, Municipality } from "@prisma/client";

/**
 * Official territorial units of Timor-Leste (14, incl. RAEOA and Ataúro) plus
 * Diaspora. Labels keep their Portuguese/Tetum diacritics. Type-only Prisma
 * imports keep this module safe for client components.
 */
export const MUNICIPALITIES = [
  { value: "AILEU", label: "Aileu" },
  { value: "AINARO", label: "Ainaro" },
  { value: "ATAURO", label: "Ataúro" },
  { value: "BAUCAU", label: "Baucau" },
  { value: "BOBONARO", label: "Bobonaro" },
  { value: "COVA_LIMA", label: "Cova Lima" },
  { value: "DILI", label: "Díli" },
  { value: "ERMERA", label: "Ermera" },
  { value: "LAUTEM", label: "Lautém" },
  { value: "LIQUICA", label: "Liquiçá" },
  { value: "MANATUTO", label: "Manatuto" },
  { value: "MANUFAHI", label: "Manufahi" },
  { value: "OECUSSE", label: "Oecusse (RAEOA)" },
  { value: "VIQUEQUE", label: "Viqueque" },
  { value: "DIASPORA", label: "Diaspora" },
] as const satisfies ReadonlyArray<{ value: Municipality; label: string }>;

export const MUNICIPALITY_VALUES = MUNICIPALITIES.map((m) => m.value) as [Municipality, ...Municipality[]];

const LABELS = Object.fromEntries(MUNICIPALITIES.map((m) => [m.value, m.label])) as Record<Municipality, string>;

export function municipalityLabel(value: Municipality): string {
  return LABELS[value];
}

export const INTEREST_AREAS = [
  "EDUCATION",
  "ADVOCACY",
  "MEDIA",
  "COMMUNITY_SERVICE",
] as const satisfies readonly InterestArea[];
