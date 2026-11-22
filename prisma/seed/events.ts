import type { AttendeeStatus, EventStatus, EventType, Municipality, PrismaClient } from "@prisma/client";
import { generateTicketCode } from "../../src/lib/codes";
import { diliDaysFromNow } from "../../src/lib/dates";
import { type L10n, log, translationRows } from "./helpers";
import { markdownToHtml } from "../../src/lib/content/markdown-to-html";

type SeedEvent = {
  slug: string;
  type: EventType;
  status: EventStatus;
  /** Days from the seed date (Díli time); negative = past event. */
  dayOffset: number;
  startHour: number;
  durationHours: number;
  location: string;
  municipality: Municipality | null;
  isOnline: boolean;
  onlineUrl?: string;
  capacity: number;
  registrations: number;
  attendeeStatus: AttendeeStatus;
  content: L10n<{ title: string; summary: string; description: string; locationDetails?: string }>;
};

const EVENTS: SeedEvent[] = [
  {
    slug: "seminariu-edukasaun-sivika-baucau",
    type: "SEMINAR",
    status: "PUBLISHED",
    dayOffset: 13,
    startHour: 9,
    durationHours: 4,
    location: "Salaun Paróquia São Domingos, Baucau Vila",
    municipality: "BAUCAU",
    isOnline: false,
    capacity: 120,
    registrations: 47,
    attendeeStatus: "REGISTERED",
    content: {
      TET: {
        title: "Semináriu: Konstituisaun no Joven Sidadaun",
        summary: "Semináriu loron-balun ida kona-ba direitu no dever sidadaun nian, ba estudante sekundária no universitáriu iha Baucau.",
        description:
          "Ko'alia-na'in sira sei esplika artigu prinsipál sira husi Konstituisaun RDTL no oinsá joven sira bele partisipa iha moris públiku.\n\n" +
          "**Ajenda**\n- 09:00 Simu partisipante\n- 09:30 Aprezentasaun: Konstituisaun ba joven\n- 11:00 Testemuña veteranu Baucau\n- 12:00 Perguntas no resposta",
        locationDetails: "Besik Igreja São Domingos; tama husi odamatan sorin.",
      },
      PT: {
        title: "Seminário: A Constituição e o Jovem Cidadão",
        summary: "Um seminário de meio dia sobre direitos e deveres de cidadania, para estudantes do secundário e universitários em Baucau.",
        description:
          "Os oradores explicarão os principais artigos da Constituição da RDTL e como os jovens podem participar na vida pública.\n\n" +
          "**Programa**\n- 09:00 Receção dos participantes\n- 09:30 Apresentação: a Constituição para jovens\n- 11:00 Testemunho de veteranos de Baucau\n- 12:00 Perguntas e respostas",
        locationDetails: "Junto à Igreja de São Domingos; entrada pela porta lateral.",
      },
      ID: {
        title: "Seminar: Konstitusi dan Warga Muda",
        summary: "Seminar setengah hari tentang hak dan kewajiban warga negara bagi pelajar SMA dan mahasiswa di Baucau.",
        description:
          "Para pembicara akan menjelaskan pasal-pasal utama Konstitusi RDTL dan bagaimana kaum muda dapat berpartisipasi dalam kehidupan publik.\n\n" +
          "**Agenda**\n- 09:00 Registrasi peserta\n- 09:30 Presentasi: Konstitusi untuk pemuda\n- 11:00 Kesaksian veteran Baucau\n- 12:00 Tanya jawab",
        locationDetails: "Di samping Gereja São Domingos; masuk melalui pintu samping.",
      },
      EN: {
        title: "Seminar: The Constitution and the Young Citizen",
        summary: "A half-day seminar on citizens' rights and duties for secondary and university students in Baucau.",
        description:
          "Speakers will explain the key articles of the RDTL Constitution and how young people can take part in public life.\n\n" +
          "**Agenda**\n- 09:00 Participant welcome\n- 09:30 Presentation: the Constitution for young people\n- 11:00 Testimony from Baucau veterans\n- 12:00 Questions and answers",
        locationDetails: "Next to São Domingos Church; enter through the side door.",
      },
    },
  },
  {
    slug: "debate-publiku-joven-no-servisu",
    type: "DEBATE",
    status: "PUBLISHED",
    dayOffset: 20,
    startHour: 14,
    durationHours: 3,
    location: "Auditóriu UNTL, Kampus Caicoli, Díli",
    municipality: "DILI",
    isOnline: false,
    capacity: 250,
    registrations: 231,
    attendeeStatus: "REGISTERED",
    content: {
      TET: {
        title: "Debate Públiku: Joven no Servisu iha Ekonomia Foun",
        summary: "Ekipa universidade haat debate kona-ba empregu joven, empreendedorizmu no formasaun profisionál.",
        description:
          "Mosaun: \"Estadu tenke prioritiza formasaun profisionál liu bolsa estudu iha rai-li'ur.\"\n\nPúbliku bele vota no husu pergunta ba ekipa sira iha final.",
      },
      PT: {
        title: "Debate Público: Os Jovens e o Trabalho na Nova Economia",
        summary: "Quatro equipas universitárias debatem emprego jovem, empreendedorismo e formação profissional.",
        description:
          "Moção: \"O Estado deve dar prioridade à formação profissional em vez das bolsas de estudo no estrangeiro.\"\n\nO público poderá votar e colocar perguntas às equipas no final.",
      },
      ID: {
        title: "Debat Publik: Pemuda dan Pekerjaan di Ekonomi Baru",
        summary: "Empat tim universitas berdebat tentang lapangan kerja pemuda, kewirausahaan, dan pelatihan vokasi.",
        description:
          "Mosi: \"Negara harus memprioritaskan pelatihan vokasi dibanding beasiswa ke luar negeri.\"\n\nPenonton dapat memberikan suara dan mengajukan pertanyaan kepada tim di akhir acara.",
      },
      EN: {
        title: "Public Debate: Youth and Work in the New Economy",
        summary: "Four university teams debate youth employment, entrepreneurship and vocational training.",
        description:
          "Motion: \"The State should prioritise vocational training over overseas scholarships.\"\n\nThe audience will vote and put questions to the teams at the end.",
      },
    },
  },
  {
    slug: "workshop-jornalizmu-sidadaun",
    type: "WORKSHOP",
    status: "PUBLISHED",
    dayOffset: 27,
    startHour: 19,
    durationHours: 2,
    location: "Online (Zoom)",
    municipality: null,
    isOnline: true,
    onlineUrl: "https://zoom.us/j/0000000000",
    capacity: 40,
    registrations: 34,
    attendeeStatus: "REGISTERED",
    content: {
      TET: {
        title: "Workshop: Jornalizmu Sidadaun no Verifikasaun Faktu",
        summary: "Workshop online ida ba joven sira iha munisípiu no diáspora: oinsá hakerek notísia no verifika informasaun.",
        description:
          "Partisipante sei aprende téknika báziku entrevista, hakerek notísia badak no identifika informasaun falsu iha média sosiál.\n\nLink Zoom sei haruka ba partisipante rejistadu loron ida molok workshop.",
      },
      PT: {
        title: "Workshop: Jornalismo Cidadão e Verificação de Factos",
        summary: "Um workshop online para jovens nos municípios e na diáspora: como escrever notícias e verificar informação.",
        description:
          "Os participantes aprenderão técnicas básicas de entrevista, redação de notícias curtas e identificação de desinformação nas redes sociais.\n\nA ligação Zoom será enviada aos inscritos na véspera do workshop.",
      },
      ID: {
        title: "Lokakarya: Jurnalisme Warga dan Cek Fakta",
        summary: "Lokakarya daring bagi pemuda di munisipalitas dan diaspora: cara menulis berita dan memverifikasi informasi.",
        description:
          "Peserta akan mempelajari teknik dasar wawancara, menulis berita singkat, dan mengenali disinformasi di media sosial.\n\nTautan Zoom akan dikirim kepada peserta terdaftar sehari sebelum lokakarya.",
      },
      EN: {
        title: "Workshop: Citizen Journalism and Fact-Checking",
        summary: "An online workshop for young people in the municipalities and the diaspora: how to write news and verify information.",
        description:
          "Participants will learn basic interviewing techniques, short news writing and how to spot misinformation on social media.\n\nThe Zoom link will be sent to registered participants the day before the workshop.",
      },
    },
  },
  {
    slug: "dialogu-jerasaun-santa-cruz-2026",
    type: "SEMINAR",
    status: "PUBLISHED",
    dayOffset: -10,
    startHour: 15,
    durationHours: 3,
    location: "Sede OJETIL, Bidau Lecidere, Díli",
    municipality: "DILI",
    isOnline: false,
    capacity: 80,
    registrations: 72,
    attendeeStatus: "ATTENDED",
    content: {
      TET: {
        title: "Diálogu Entre Jerasaun: Memória Santa Cruz",
        summary: "Veteranu klandestinu sira fahe testemuña ho estudante sira iha Loron Nasionál Juventude.",
        description: "Diálogu ida iha sede OJETIL ho eis-membru selula klandestina no estudante husi eskola sekundária Díli nian.",
      },
      PT: {
        title: "Diálogo Intergeracional: Memória de Santa Cruz",
        summary: "Veteranos da clandestinidade partilham testemunhos com estudantes no Dia Nacional da Juventude.",
        description: "Um diálogo na sede da OJETIL com antigos membros das células clandestinas e estudantes de escolas secundárias de Díli.",
      },
      ID: {
        title: "Dialog Antargenerasi: Mengenang Santa Cruz",
        summary: "Para veteran klandestin berbagi kesaksian dengan pelajar pada Hari Pemuda Nasional.",
        description: "Dialog di kantor pusat OJETIL bersama mantan anggota sel klandestin dan pelajar sekolah menengah di Díli.",
      },
      EN: {
        title: "Intergenerational Dialogue: Remembering Santa Cruz",
        summary: "Veterans of the clandestine front share testimonies with students on National Youth Day.",
        description: "A dialogue at OJETIL headquarters with former members of clandestine cells and students from Díli secondary schools.",
      },
    },
  },
];

const FIRST_NAMES = [
  "Abílio", "Adelina", "Agostinho", "Albertina", "Aleixo", "Amélia", "Armando", "Bendita", "Celestino", "Cidália",
  "Domingas", "Eugénio", "Felismina", "Filomeno", "Graciano", "Helena", "Inácio", "Jacinta", "Januário", "Leonor",
  "Lúcia", "Manuel", "Marcelina", "Natalino", "Olívia", "Paulino", "Rosália", "Sebastião", "Teresinha", "Zeferino",
];
const LAST_NAMES = [
  "Amaral", "Belo", "Cabral", "da Costa", "da Cruz", "de Araújo", "de Jesus", "dos Santos", "Fernandes", "Freitas",
  "Guterres", "Ximenes", "Mendonça", "Pereira", "Pinto", "Soares", "Sarmento", "Tilman", "Correia", "Martins",
];
const INSTITUTIONS = [
  "UNTL", "UNPAZ", "UNITAL", "ESG Ensino Secundário Geral Nicolau Lobato", "ESTV Becora", "Dili Institute of Technology",
  "ESG Baucau", "Instituto Superior Cristal",
];
const MUNICIPALITY_POOL: Municipality[] = ["DILI", "DILI", "DILI", "BAUCAU", "ERMERA", "LIQUICA", "AILEU", "MANATUTO", "DIASPORA"];

function ascii(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".");
}

function attendee(i: number) {
  const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
  const last = LAST_NAMES[(i * 7) % LAST_NAMES.length]!;
  return {
    fullName: `${first} ${last}`,
    email: `${ascii(first)}.${ascii(last)}.${i}@example.com`,
    phone: `+670 77${String(100000 + i * 137).slice(-6)}`,
    institution: INSTITUTIONS[i % INSTITUTIONS.length]!,
    municipality: MUNICIPALITY_POOL[i % MUNICIPALITY_POOL.length]!,
  };
}

export async function seedEvents(db: PrismaClient, createdById: string): Promise<void> {
  const seedDate = new Date();
  let totalRegistrations = 0;

  for (const e of EVENTS) {
    const startAt = diliDaysFromNow(e.dayOffset, e.startHour, 0, seedDate);
    const endAt = new Date(startAt.getTime() + e.durationHours * 3_600_000);
    // Descriptions are stored as rich-text HTML, like the editor produces.
    const translations = translationRows(e.content).map((t) => ({ ...t, description: markdownToHtml(t.description) }));
    const data = {
      type: e.type,
      status: e.status,
      startAt,
      endAt,
      timezone: "Asia/Dili",
      location: e.location,
      municipality: e.municipality,
      isOnline: e.isOnline,
      onlineUrl: e.onlineUrl ?? null,
      capacity: e.capacity,
      registrationOpen: e.dayOffset > 0,
      registrationDeadline: e.dayOffset > 0 ? new Date(startAt.getTime() - 24 * 3_600_000) : null,
      publishedAt: diliDaysFromNow(Math.min(e.dayOffset - 21, -1), 9, 0, seedDate),
      createdById,
    };

    const event = await db.event.upsert({
      where: { slug: e.slug },
      create: { slug: e.slug, ...data, translations: { create: translations } },
      update: { ...data, translations: { deleteMany: {}, create: translations } },
    });

    // Offset the attendee pool per event so names differ between events.
    const base = EVENTS.indexOf(e) * 53;
    for (let n = 0; n < e.registrations; n++) {
      const a = attendee(base + n);
      await db.eventRegistration.upsert({
        where: { eventId_email: { eventId: event.id, email: a.email } },
        // Event dates are recomputed relative to "now" on every run; keep attendance consistent with them.
        update: { status: e.attendeeStatus, checkedInAt: e.attendeeStatus === "ATTENDED" ? startAt : null },
        create: {
          eventId: event.id,
          ticketCode: generateTicketCode(),
          ...a,
          status: e.attendeeStatus,
          checkedInAt: e.attendeeStatus === "ATTENDED" ? startAt : null,
          locale: (["TET", "TET", "PT", "ID", "EN"] as const)[n % 5]!,
        },
      });
    }
    totalRegistrations += e.registrations;
  }

  log("Events", `${EVENTS.length} events (3 upcoming, 1 past) × 4 locales, ${totalRegistrations} attendee registrations`);
}
