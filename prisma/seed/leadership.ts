import type { LeadershipLevel, Municipality, PrismaClient } from "@prisma/client";
import { type L10n, log, translationRows } from "./helpers";

/*
 * Demonstration leadership directory. Names are illustrative placeholders and
 * must be replaced with the official roster through /admin/pengurus.
 */
type Leader = {
  id: string;
  fullName: string;
  level: LeadershipLevel;
  municipality?: Municipality;
  termStart: number;
  termEnd?: number;
  content: L10n<{ title: string; bio?: string }>;
};

const municipalCoordinator = (place: string): L10n<{ title: string }> => ({
  TET: { title: `Koordenadór Munisipál ${place}` },
  PT: { title: `Coordenador Municipal de ${place}` },
  ID: { title: `Koordinator Munisipal ${place}` },
  EN: { title: `Municipal Coordinator, ${place}` },
});

const LEADERS: Leader[] = [
  {
    id: "seed-leader-presidente",
    fullName: "Domingos Soares da Costa",
    level: "NATIONAL",
    termStart: 2024,
    termEnd: 2027,
    content: {
      TET: { title: "Prezidente", bio: "Eis-estudante klandestinu iha Díli; agora mestre no aktivista edukasaun sívika." },
      PT: { title: "Presidente", bio: "Antigo estudante clandestino em Díli; hoje professor e ativista da educação cívica." },
      ID: { title: "Ketua Umum", bio: "Mantan pelajar klandestin di Díli; kini guru dan aktivis pendidikan kewarganegaraan." },
      EN: { title: "President", bio: "Former clandestine student in Díli; now a teacher and civic education advocate." },
    },
  },
  {
    id: "seed-leader-vice-presidente",
    fullName: "Maria Fátima Ximenes",
    level: "NATIONAL",
    termStart: 2024,
    termEnd: 2027,
    content: {
      TET: { title: "Vise-Prezidente", bio: "Koordena programa juventude no partisipasaun feto foin-sa'e." },
      PT: { title: "Vice-Presidente", bio: "Coordena os programas de juventude e a participação das jovens mulheres." },
      ID: { title: "Wakil Ketua", bio: "Mengoordinasikan program pemuda dan partisipasi perempuan muda." },
      EN: { title: "Vice-President", bio: "Coordinates youth programmes and young women's participation." },
    },
  },
  {
    id: "seed-leader-sekretariu-jeral",
    fullName: "Agostinho Belo Guterres",
    level: "NATIONAL",
    termStart: 2024,
    termEnd: 2027,
    content: {
      TET: { title: "Sekretáriu-Jerál", bio: "Responsável ba sekretariadu no verifikasaun membru." },
      PT: { title: "Secretário-Geral", bio: "Responsável pelo secretariado e pela verificação de membros." },
      ID: { title: "Sekretaris Jenderal", bio: "Bertanggung jawab atas sekretariat dan verifikasi anggota." },
      EN: { title: "Secretary-General", bio: "Responsible for the secretariat and member verification." },
    },
  },
  {
    id: "seed-leader-tezoureiru",
    fullName: "Joana da Silva Pereira",
    level: "NATIONAL",
    termStart: 2024,
    termEnd: 2027,
    content: {
      TET: { title: "Tezoureira" },
      PT: { title: "Tesoureira" },
      ID: { title: "Bendahara" },
      EN: { title: "Treasurer" },
    },
  },
  {
    id: "seed-leader-baucau",
    fullName: "Francisco Freitas Amaral",
    level: "MUNICIPAL",
    municipality: "BAUCAU",
    termStart: 2025,
    content: municipalCoordinator("Baucau"),
  },
  {
    id: "seed-leader-ermera",
    fullName: "Rosa de Jesus Mendonça",
    level: "MUNICIPAL",
    municipality: "ERMERA",
    termStart: 2025,
    content: municipalCoordinator("Ermera"),
  },
  {
    id: "seed-leader-lautem",
    fullName: "Lourenço Pinto Cabral",
    level: "MUNICIPAL",
    municipality: "LAUTEM",
    termStart: 2025,
    content: municipalCoordinator("Lautém"),
  },
  {
    id: "seed-leader-oecusse",
    fullName: "Ana Maria Taek",
    level: "MUNICIPAL",
    municipality: "OECUSSE",
    termStart: 2025,
    content: {
      TET: { title: "Koordenadora RAEOA" },
      PT: { title: "Coordenadora da RAEOA" },
      ID: { title: "Koordinator RAEOA" },
      EN: { title: "Coordinator, RAEOA (Oecusse)" },
    },
  },
];

export async function seedLeadership(db: PrismaClient): Promise<void> {
  for (const [index, l] of LEADERS.entries()) {
    const translations = translationRows(l.content);
    const data = {
      fullName: l.fullName,
      level: l.level,
      municipality: l.municipality ?? null,
      termStart: l.termStart,
      termEnd: l.termEnd ?? null,
      displayOrder: (index + 1) * 10,
      status: "PUBLISHED" as const,
    };
    await db.leadershipMember.upsert({
      where: { id: l.id },
      create: { id: l.id, ...data, translations: { create: translations } },
      update: { ...data, translations: { deleteMany: {}, create: translations } },
    });
  }
  log("Leadership", `${LEADERS.length} members (national + municipal) × 4 locales`);
}
