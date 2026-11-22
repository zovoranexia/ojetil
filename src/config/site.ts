/**
 * Institutional constants. Contact details below are the values currently
 * used for development; confirm them with the OJETIL Secretariat before launch.
 */
export const siteConfig = {
  shortName: "OJETIL",
  fullName: "Organização da Juventude e dos Estudantes de Timor-Leste",
  motto: "Saber para Servir",
  mottoSubline: "Pátria — Povo",
  emblemAlt: "Emblema OJETIL: enxada no pena kruzadu, ho lema “Saber para Servir — Pátria, Povo”",
  headquarters: {
    street: "Bidau Lecidere",
    city: "Díli",
    country: "Timor-Leste",
    /** Approximate coordinates of Bidau Lecidere waterfront, Díli. */
    geo: { lat: -8.5537, lng: 125.5847 },
  },
  contact: {
    email: "sekretariadu@ojetil.tl",
    phone: "+670 7700 0000",
  },
  timeZone: "Asia/Dili",
  /** Displayed next to every event time. Timor-Leste observes UTC+09:00 year-round. */
  timeZoneLabel: "OTL · UTC+09:00",
} as const;

export type SiteConfig = typeof siteConfig;
