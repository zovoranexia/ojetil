import type {
  Gender,
  InterestArea,
  Locale,
  MemberCategory,
  Municipality,
  PrismaClient,
  RegistrationStatus,
} from "@prisma/client";
import { formatTrackingCode, memberSequenceScope } from "../../src/lib/codes";
import { diliDateTime, diliDaysFromNow } from "../../src/lib/dates";
import { encryptMemberPii, nationalIdBlindIndex } from "../../src/modules/members/pii";
import { log } from "./helpers";
import type { SeededUsers } from "./users";

/*
 * Fictional applications covering every status, both tracks and a spread of
 * municipalities. All PII is invented and goes through the same AES-256-GCM
 * path as real submissions.
 */
export const CONSENT_VERSION = "2026-11-v1";

type Application = {
  seq: number;
  category: MemberCategory;
  status: RegistrationStatus;
  submittedDaysAgo: number;
  fullName: string;
  clandestineAlias?: string;
  dob: [number, number, number];
  gender: Gender;
  municipality: Municipality;
  administrativePost: string;
  email?: string;
  pii: { address: string; phone: string; nationalId: string };
  veteran?: { yearJoined: number; clandestineCell: string; clandestineRegion: string; witnessReference?: string };
  youth?: { institution: string; interests: InterestArea[]; motivation: string };
  locale: Locale;
  decision?: { by: "VERIFIER" | "SUPER_ADMIN"; daysAgo: number; note: string };
};

const APPLICATIONS: Application[] = [
  {
    seq: 33,
    category: "VETERAN_KLANDESTIN",
    status: "VERIFIED",
    submittedDaysAgo: 41,
    fullName: "Raimundo da Costa Sarmento",
    clandestineAlias: "Mau Lear",
    dob: [1968, 3, 14],
    gender: "MALE",
    municipality: "DILI",
    administrativePost: "Nain Feto",
    email: "raimundo.sarmento@example.com",
    pii: { address: "Rua de Bidau Santana, Aldeia 20 de Setembro, Díli", phone: "+670 7723 4512", nationalId: "BI 0234 5678 901" },
    veteran: { yearJoined: 1986, clandestineCell: "Selula Estudante Externato São José", clandestineRegion: "Díli", witnessReference: "Agostinho Belo Guterres" },
    locale: "TET",
    decision: { by: "VERIFIER", daysAgo: 30, note: "Testemuña husi kamarada rua konfirma partisipasaun iha selula Externato São José." },
  },
  {
    seq: 34,
    category: "VETERAN_KLANDESTIN",
    status: "VERIFIED",
    submittedDaysAgo: 38,
    fullName: "Ermelinda Soares Ximenes",
    clandestineAlias: "Bui Kiak",
    dob: [1971, 9, 2],
    gender: "FEMALE",
    municipality: "BAUCAU",
    administrativePost: "Baucau Vila",
    pii: { address: "Aldeia Uatabo, Suku Buruma, Baucau", phone: "+670 7788 1203", nationalId: "BI 0341 2290 115" },
    veteran: { yearJoined: 1989, clandestineCell: "Rede Feto Joven Baucau", clandestineRegion: "Baucau", witnessReference: "Francisco Freitas Amaral" },
    locale: "PT",
    decision: { by: "VERIFIER", daysAgo: 25, note: "Verificado com o coordenador municipal de Baucau." },
  },
  {
    seq: 35,
    category: "ANGGOTA_PEMUDA",
    status: "VERIFIED",
    submittedDaysAgo: 33,
    fullName: "Natália Pereira dos Santos",
    dob: [2003, 6, 21],
    gender: "FEMALE",
    municipality: "ERMERA",
    administrativePost: "Gleno",
    email: "natalia.santos@example.com",
    pii: { address: "Suku Talimoro, Gleno, Ermera", phone: "+670 7654 9921", nationalId: "BI 1203 4456 778" },
    youth: { institution: "UNTL — Fakuldade Edukasaun", interests: ["EDUCATION", "COMMUNITY_SERVICE"], motivation: "Hakarak hanorin istória rezisténsia ba labarik sira iha Ermera." },
    locale: "TET",
    decision: { by: "VERIFIER", daysAgo: 28, note: "Dokumentu kompletu." },
  },
  {
    seq: 36,
    category: "ANGGOTA_PEMUDA",
    status: "VERIFIED",
    submittedDaysAgo: 29,
    fullName: "Julião Guterres Fernandes",
    dob: [2001, 12, 5],
    gender: "MALE",
    municipality: "DIASPORA",
    administrativePost: "Lisboa, Portugal",
    email: "juliao.fernandes@example.com",
    pii: { address: "Rua das Flores 12, 2º Esq., 1200-195 Lisboa, Portugal", phone: "+351 912 345 678", nationalId: "BI 1188 0042 356" },
    youth: { institution: "Universidade de Lisboa — Ciência Política", interests: ["ADVOCACY", "MEDIA"], motivation: "Quero ligar a diáspora timorense aos debates juvenis no país." },
    locale: "PT",
    decision: { by: "SUPER_ADMIN", daysAgo: 20, note: "Validado por videochamada." },
  },
  {
    seq: 37,
    category: "VETERAN_KLANDESTIN",
    status: "NEEDS_REVISION",
    submittedDaysAgo: 18,
    fullName: "Venâncio Amaral Cabral",
    clandestineAlias: "As'wain Kiak",
    dob: [1966, 1, 30],
    gender: "MALE",
    municipality: "LAUTEM",
    administrativePost: "Lospalos",
    pii: { address: "Aldeia Home, Suku Fuiloro, Lospalos, Lautém", phone: "+670 7721 0087", nationalId: "BI 0198 7766 054" },
    veteran: { yearJoined: 1983, clandestineCell: "Frente Klandestina Ponta Leste", clandestineRegion: "Lautém" },
    locale: "TET",
    decision: { by: "VERIFIER", daysAgo: 9, note: "Favor aumenta naran kamarada ida ne'ebé bele sai testemuña ba verifikasaun." },
  },
  {
    seq: 38,
    category: "ANGGOTA_PEMUDA",
    status: "REJECTED",
    submittedDaysAgo: 16,
    fullName: "Teste Duplikadu Cardoso",
    dob: [2004, 4, 4],
    gender: "PREFER_NOT_TO_SAY",
    municipality: "DILI",
    administrativePost: "Cristo Rei",
    pii: { address: "Becora, Díli", phone: "+670 7700 1111", nationalId: "BI 1203 4456 779" },
    youth: { institution: "—", interests: ["MEDIA"], motivation: "-" },
    locale: "ID",
    decision: { by: "VERIFIER", daysAgo: 12, note: "Aplikasaun duplikadu ho dadus la loos; aplikante kontaktadu." },
  },
  {
    seq: 39,
    category: "VETERAN_KLANDESTIN",
    status: "PENDING_VERIFICATION",
    submittedDaysAgo: 6,
    fullName: "Cecília de Jesus Mendonça",
    clandestineAlias: "Lafaek Feto",
    dob: [1970, 7, 19],
    gender: "FEMALE",
    municipality: "MANUFAHI",
    administrativePost: "Same",
    pii: { address: "Suku Letefoho, Same, Manufahi", phone: "+670 7745 3398", nationalId: "BI 0287 1102 663" },
    veteran: { yearJoined: 1990, clandestineCell: "Selula OJETIL Same", clandestineRegion: "Manufahi", witnessReference: "Domingos Soares da Costa" },
    locale: "TET",
  },
  {
    seq: 40,
    category: "ANGGOTA_PEMUDA",
    status: "PENDING_VERIFICATION",
    submittedDaysAgo: 4,
    fullName: "Mateus Tilman Correia",
    dob: [2005, 2, 11],
    gender: "MALE",
    municipality: "OECUSSE",
    administrativePost: "Pante Macassar",
    email: "mateus.correia@example.com",
    pii: { address: "Bairro Lalisuk, Pante Macassar, RAEOA", phone: "+670 7712 6654", nationalId: "BI 1302 8871 220" },
    youth: { institution: "ESG Pante Macassar", interests: ["COMMUNITY_SERVICE", "EDUCATION"], motivation: "Hau hakarak organiza grupu estudu ba joven sira iha Oecusse." },
    locale: "TET",
  },
  {
    seq: 41,
    category: "ANGGOTA_PEMUDA",
    status: "PENDING_VERIFICATION",
    submittedDaysAgo: 2,
    fullName: "Ilda Maria Martins",
    dob: [2002, 10, 27],
    gender: "FEMALE",
    municipality: "ATAURO",
    administrativePost: "Vila",
    pii: { address: "Suku Vila Maumeta, Ataúro", phone: "+670 7799 2045", nationalId: "BI 1255 6120 909" },
    youth: { institution: "Peskadora no voluntária komunidade", interests: ["COMMUNITY_SERVICE"], motivation: "Ajuda joven sira iha Ataúro partisipa iha programa nasionál." },
    locale: "TET",
  },
  {
    seq: 42,
    category: "VETERAN_KLANDESTIN",
    status: "PENDING_VERIFICATION",
    submittedDaysAgo: 1,
    fullName: "Bernardino Freitas da Cruz",
    clandestineAlias: "Kalohan",
    dob: [1964, 11, 8],
    gender: "MALE",
    municipality: "LIQUICA",
    administrativePost: "Maubara",
    pii: { address: "Aldeia Vaviquinia, Maubara, Liquiçá", phone: "+670 7730 5561", nationalId: "BI 0176 3345 812" },
    veteran: { yearJoined: 1981, clandestineCell: "Rede Klandestina Maubara", clandestineRegion: "Liquiçá" },
    locale: "PT",
  },
];

export async function seedMembers(db: PrismaClient, users: SeededUsers): Promise<void> {
  const year = 2026;
  const now = new Date();

  const skipped: string[] = [];
  for (const a of APPLICATIONS) {
    const trackingCode = formatTrackingCode(year, a.seq);

    // Never overwrite a real application that happens to hold one of the demo codes:
    // only rows whose national-ID blind index matches the demo record are seed-owned.
    const existingRow = await db.memberRegistration.findUnique({ where: { trackingCode }, select: { nationalIdHash: true } });
    if (existingRow && existingRow.nationalIdHash !== nationalIdBlindIndex(a.pii.nationalId)) {
      skipped.push(trackingCode);
      continue;
    }
    const createdAt = diliDaysFromNow(-a.submittedDaysAgo, 10, 15, now);
    const decider = a.decision ? users[a.decision.by] : null;
    const decidedAt = a.decision ? diliDaysFromNow(-a.decision.daysAgo, 14, 0, now) : null;

    const data = {
      category: a.category,
      status: a.status,
      fullName: a.fullName,
      clandestineAlias: a.clandestineAlias ?? null,
      dateOfBirth: diliDateTime(a.dob[0], a.dob[1], a.dob[2], 9),
      gender: a.gender,
      municipality: a.municipality,
      administrativePost: a.administrativePost,
      email: a.email ?? null,
      ...encryptMemberPii(a.pii),
      yearJoined: a.veteran?.yearJoined ?? null,
      clandestineCell: a.veteran?.clandestineCell ?? null,
      clandestineRegion: a.veteran?.clandestineRegion ?? null,
      witnessReference: a.veteran?.witnessReference ?? null,
      institution: a.youth?.institution ?? null,
      interests: a.youth?.interests ?? [],
      motivation: a.youth?.motivation ?? null,
      consentGiven: true,
      consentVersion: CONSENT_VERSION,
      consentAt: createdAt,
      submittedLocale: a.locale,
      verifiedById: decider?.id ?? null,
      verifiedAt: a.status === "VERIFIED" ? decidedAt : null,
      verificationNotes: a.decision?.note ?? null,
      createdAt,
    };

    const history = [
      { fromStatus: null, toStatus: "PENDING_VERIFICATION" as const, note: null, actorId: null, createdAt },
      ...(a.decision && decider && decidedAt
        ? [{ fromStatus: "PENDING_VERIFICATION" as const, toStatus: a.status, note: a.decision.note, actorId: decider.id, createdAt: decidedAt }]
        : []),
    ];

    await db.memberRegistration.upsert({
      where: { trackingCode },
      create: { trackingCode, ...data, statusChanges: { create: history } },
      update: { ...data, statusChanges: { deleteMany: {}, create: history } },
    });
  }

  // Keep the live counter ahead of seeded codes so the next real submission gets OJT-2026-0043.
  const maxSeq = Math.max(...APPLICATIONS.map((a) => a.seq));
  const scope = memberSequenceScope(year);
  const existing = await db.codeSequence.findUnique({ where: { scope } });
  if (!existing || existing.value < maxSeq) {
    await db.codeSequence.upsert({ where: { scope }, create: { scope, value: maxSeq }, update: { value: maxSeq } });
  }

  const byStatus = APPLICATIONS.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  log(
    "Member applications",
    `${APPLICATIONS.length - skipped.length} (${Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(", ")}), PII encrypted`,
  );
  if (skipped.length) {
    console.warn(`  ⚠ Kept ${skipped.length} real application(s) that already use demo codes: ${skipped.join(", ")}`);
  }
}
