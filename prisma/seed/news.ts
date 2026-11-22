import type { ContentStatus, NewsCategory, PrismaClient } from "@prisma/client";
import { diliDateTime } from "../../src/lib/dates";
import { type L10n, log, translationRows } from "./helpers";

type Article = {
  slug: string;
  category: NewsCategory;
  status: ContentStatus;
  isFeatured: boolean;
  publishedAt: Date | null;
  content: L10n<{ title: string; excerpt: string; body: string }>;
};

const ARTICLES: Article[] = [
  {
    slug: "loron-nasional-juventude-santa-cruz-35-tinan",
    category: "COMMEMORATION",
    status: "PUBLISHED",
    isFeatured: true,
    publishedAt: diliDateTime(2026, 11, 12, 18, 0),
    content: {
      TET: {
        title: "OJETIL komemora tinan 35 Masakre Santa Cruz",
        excerpt:
          "Veteranu no estudante rihun ba rihun la'o hamutuk husi Motael to'o Santa Cruz atu hanoin vítima sira iha Loron Nasionál Juventude.",
        body:
          "Iha loron 12 Novembru, OJETIL hamutuk ho veteranu klandestinu, eskola no universidade sira halo prosesaun husi Igreja Motael to'o Semitériu Santa Cruz.\n\n" +
          "Iha diskursu, Prezidente OJETIL hato'o katak \"memória la'ós de'it hanoin, maibé responsabilidade\". Estudante sira lee naran vítima sira no tau ai-funan iha semitériu nia odamatan.\n\n" +
          "Lorokraik, OJETIL organiza diálogu entre jerasaun iha Sede OJETIL, Bidau Lecidere, ho testemuña husi eis-membru selula klandestina sira.",
      },
      PT: {
        title: "OJETIL assinala 35 anos do Massacre de Santa Cruz",
        excerpt:
          "Milhares de veteranos e estudantes caminharam juntos de Motael a Santa Cruz para lembrar as vítimas no Dia Nacional da Juventude.",
        body:
          "A 12 de novembro, a OJETIL, juntamente com veteranos da clandestinidade, escolas e universidades, realizou uma procissão da Igreja de Motael até ao Cemitério de Santa Cruz.\n\n" +
          "No seu discurso, o Presidente da OJETIL afirmou que \"a memória não é apenas recordação, é responsabilidade\". Os estudantes leram os nomes das vítimas e depositaram flores junto aos portões do cemitério.\n\n" +
          "À tarde, a OJETIL organizou um diálogo intergeracional na sua sede, em Bidau Lecidere, com testemunhos de antigos membros das células clandestinas.",
      },
      ID: {
        title: "OJETIL memperingati 35 tahun Pembantaian Santa Cruz",
        excerpt:
          "Ribuan veteran dan pelajar berjalan bersama dari Motael ke Santa Cruz untuk mengenang para korban pada Hari Pemuda Nasional.",
        body:
          "Pada 12 November, OJETIL bersama para veteran klandestin, sekolah, dan universitas menggelar prosesi dari Gereja Motael ke Pemakaman Santa Cruz.\n\n" +
          "Dalam pidatonya, Ketua Umum OJETIL menyampaikan bahwa \"ingatan bukan sekadar kenangan, melainkan tanggung jawab\". Para pelajar membacakan nama-nama korban dan meletakkan bunga di gerbang pemakaman.\n\n" +
          "Sore harinya, OJETIL menggelar dialog antargenerasi di kantor pusatnya di Bidau Lecidere, dengan kesaksian dari mantan anggota sel klandestin.",
      },
      EN: {
        title: "OJETIL marks 35 years since the Santa Cruz Massacre",
        excerpt:
          "Thousands of veterans and students walked together from Motael to Santa Cruz to remember the victims on National Youth Day.",
        body:
          "On 12 November, OJETIL joined veterans of the clandestine front, schools and universities in a procession from Motael Church to Santa Cruz Cemetery.\n\n" +
          "In his address, the OJETIL President said that \"memory is not only remembrance — it is responsibility\". Students read the names of the victims and laid flowers at the cemetery gates.\n\n" +
          "In the afternoon, OJETIL hosted an intergenerational dialogue at its headquarters in Bidau Lecidere, with testimonies from former members of clandestine cells.",
      },
    },
  },
  {
    slug: "komunikadu-portal-rejistu-membru",
    category: "PRESS_RELEASE",
    status: "PUBLISHED",
    isFeatured: false,
    publishedAt: diliDateTime(2026, 11, 18, 10, 0),
    content: {
      TET: {
        title: "Komunikadu: Portál rejistu membru no veteranu loke ona",
        excerpt:
          "Veteranu klandestinu no joven sira agora bele rejista online no tuir sira-nia status verifikasaun ho kódigu rejistu.",
        body:
          "OJETIL anunsia loke portál rejistu online foun ba **veteranu klandestinu** no **membru joven / voluntáriu**.\n\n" +
          "Rejistu iha pasu tolu: identidade, rezidénsia no kontaktu, no istória ka interese. Hafoin submete, kada aplikante simu kódigu rejistu (ezemplu: OJT-2026-0042) atu tuir status verifikasaun.\n\n" +
          "Dadus pesoál sensível — hanesan númeru Bilhete de Identidade, telefone no hela-fatin — enkriptadu no so ekipa verifikasaun autorizada mak bele asesu.",
      },
      PT: {
        title: "Comunicado: abre o portal de registo de membros e veteranos",
        excerpt:
          "Veteranos da clandestinidade e jovens podem agora registar-se online e acompanhar o estado da verificação com um código de registo.",
        body:
          "A OJETIL anuncia a abertura de um novo portal de registo online para **veteranos da clandestinidade** e **membros jovens / voluntários**.\n\n" +
          "O registo tem três passos: identidade, residência e contacto, e percurso ou interesses. Após a submissão, cada candidato recebe um código de registo (por exemplo, OJT-2026-0042) para acompanhar a verificação.\n\n" +
          "Os dados pessoais sensíveis — como o número do Bilhete de Identidade, o telefone e a morada — são cifrados e apenas a equipa de verificação autorizada lhes pode aceder.",
      },
      ID: {
        title: "Siaran pers: Portal pendaftaran anggota dan veteran resmi dibuka",
        excerpt:
          "Veteran klandestin dan kaum muda kini dapat mendaftar secara daring dan memantau status verifikasi dengan kode pendaftaran.",
        body:
          "OJETIL mengumumkan dibukanya portal pendaftaran daring baru untuk **veteran klandestin** dan **anggota muda / relawan**.\n\n" +
          "Pendaftaran terdiri dari tiga langkah: identitas, domisili dan kontak, serta latar belakang atau minat. Setelah mengirim, setiap pendaftar menerima kode pendaftaran (misalnya OJT-2026-0042) untuk memantau verifikasi.\n\n" +
          "Data pribadi sensitif — seperti nomor Bilhete de Identidade, telepon, dan alamat — dienkripsi dan hanya dapat diakses oleh tim verifikasi yang berwenang.",
      },
      EN: {
        title: "Press release: Member and veteran registration portal opens",
        excerpt:
          "Veterans of the clandestine front and young people can now register online and follow their verification status with a tracking code.",
        body:
          "OJETIL announces the launch of a new online registration portal for **clandestine-era veterans** and **youth members / volunteers**.\n\n" +
          "Registration takes three steps: identity, residence and contact, and background or interests. After submitting, each applicant receives a tracking code (for example, OJT-2026-0042) to follow their verification.\n\n" +
          "Sensitive personal data — such as Bilhete de Identidade number, phone and address — is encrypted and can only be accessed by the authorised verification team.",
      },
    },
  },
  {
    slug: "edukasaun-sivika-to-o-munisipiu-neen",
    category: "CIVIC_EDUCATION",
    status: "PUBLISHED",
    isFeatured: false,
    publishedAt: diliDateTime(2026, 10, 28, 9, 30),
    content: {
      TET: {
        title: "Programa edukasaun sívika to'o ona munisípiu neen",
        excerpt:
          "Estudante liu 1.200 partisipa iha sesaun kona-ba Konstituisaun, direitu sidadaun no istória rezisténsia iha eskola sekundária sira.",
        body:
          "Programa \"Matenek atu Serbí\" vizita ona eskola sekundária iha Aileu, Baucau, Ermera, Lautém, Manufahi no Viqueque.\n\n" +
          "Kada sesaun kombina lisaun badak kona-ba Konstituisaun RDTL, testemuña husi veteranu lokál no debate kiik entre estudante sira.\n\n" +
          "Fase tuir mai sei to'o Ataúro, Cova Lima no RAEOA iha inísiu tinan 2027.",
      },
      PT: {
        title: "Programa de educação cívica chega a seis municípios",
        excerpt:
          "Mais de 1.200 estudantes participaram em sessões sobre a Constituição, direitos de cidadania e história da resistência em escolas secundárias.",
        body:
          "O programa \"Saber para Servir\" visitou escolas secundárias em Aileu, Baucau, Ermera, Lautém, Manufahi e Viqueque.\n\n" +
          "Cada sessão combina uma breve lição sobre a Constituição da RDTL, testemunhos de veteranos locais e um pequeno debate entre estudantes.\n\n" +
          "A próxima fase chegará a Ataúro, Cova Lima e à RAEOA no início de 2027.",
      },
      ID: {
        title: "Program pendidikan kewarganegaraan menjangkau enam munisipalitas",
        excerpt:
          "Lebih dari 1.200 pelajar mengikuti sesi tentang Konstitusi, hak warga negara, dan sejarah perlawanan di sekolah-sekolah menengah.",
        body:
          "Program \"Saber para Servir\" telah mengunjungi sekolah menengah di Aileu, Baucau, Ermera, Lautém, Manufahi, dan Viqueque.\n\n" +
          "Setiap sesi memadukan pelajaran singkat tentang Konstitusi RDTL, kesaksian veteran setempat, dan debat kecil antarpelajar.\n\n" +
          "Tahap berikutnya akan menjangkau Ataúro, Cova Lima, dan RAEOA pada awal 2027.",
      },
      EN: {
        title: "Civic education programme reaches six municipalities",
        excerpt:
          "More than 1,200 students took part in sessions on the Constitution, citizens' rights and the history of the resistance in secondary schools.",
        body:
          "The \"Knowledge to Serve\" programme has visited secondary schools in Aileu, Baucau, Ermera, Lautém, Manufahi and Viqueque.\n\n" +
          "Each session combines a short lesson on the RDTL Constitution, testimonies from local veterans and a small debate among students.\n\n" +
          "The next phase will reach Ataúro, Cova Lima and RAEOA in early 2027.",
      },
    },
  },
  {
    slug: "debate-joven-orsamentu-jeral-estadu",
    category: "YOUTH",
    status: "PUBLISHED",
    isFeatured: false,
    publishedAt: diliDateTime(2026, 9, 30, 16, 0),
    content: {
      TET: {
        title: "Debate joven kona-ba Orsamentu Jerál Estadu dada estudante 300",
        excerpt:
          "Estudante universitáriu sira debate prioridade edukasaun no empregu ba joven iha proposta orsamentu 2027.",
        body:
          "Iha Auditóriu UNTL, ekipa estudante haat debate pergunta: \"Orsamentu 2027 rekoñese duni prioridade juventude nian?\"\n\n" +
          "Paineil ida ho ekonomista no deputadu foin-sa'e fó komentáriu ba argumentu sira. Rekomendasaun husi debate sei hato'o ba Komisaun Parlamentár ne'ebé relevante.",
      },
      PT: {
        title: "Debate juvenil sobre o Orçamento Geral do Estado reúne 300 estudantes",
        excerpt:
          "Estudantes universitários debateram as prioridades de educação e emprego jovem na proposta de orçamento para 2027.",
        body:
          "No Auditório da UNTL, quatro equipas de estudantes debateram a pergunta: \"O Orçamento de 2027 reconhece realmente as prioridades da juventude?\"\n\n" +
          "Um painel de economistas e jovens deputados comentou os argumentos. As recomendações do debate serão entregues à Comissão Parlamentar competente.",
      },
      ID: {
        title: "Debat pemuda tentang Anggaran Umum Negara diikuti 300 mahasiswa",
        excerpt:
          "Mahasiswa memperdebatkan prioritas pendidikan dan lapangan kerja bagi pemuda dalam rancangan anggaran 2027.",
        body:
          "Di Auditorium UNTL, empat tim mahasiswa memperdebatkan pertanyaan: \"Apakah Anggaran 2027 benar-benar mengakui prioritas pemuda?\"\n\n" +
          "Panel ekonom dan anggota parlemen muda memberikan tanggapan atas argumen-argumen tersebut. Rekomendasi debat akan disampaikan kepada Komisi Parlemen terkait.",
      },
      EN: {
        title: "Youth debate on the State Budget draws 300 students",
        excerpt:
          "University students debated education and youth employment priorities in the proposed 2027 budget.",
        body:
          "At the UNTL Auditorium, four student teams debated the motion: \"Does the 2027 Budget truly recognise youth priorities?\"\n\n" +
          "A panel of economists and young members of parliament responded to the arguments. The debate's recommendations will be submitted to the relevant Parliamentary Committee.",
      },
    },
  },
  {
    slug: "preparasaun-kongresu-nasional-2027",
    category: "ORGANIZATION",
    status: "DRAFT",
    isFeatured: false,
    publishedAt: null,
    content: {
      TET: {
        title: "Preparasaun ba Kongresu Nasionál 2027 hahú ona",
        excerpt: "Komisaun organizadora hahú konsulta ho estrutura munisipál sira kona-ba ajenda kongresu.",
        body: "Komisaun organizadora sei vizita munisípiu hotu iha fulan Janeiru no Fevereiru atu rona proposta husi membru sira.",
      },
      PT: {
        title: "Arrancam os preparativos para o Congresso Nacional de 2027",
        excerpt: "A comissão organizadora iniciou consultas às estruturas municipais sobre a agenda do congresso.",
        body: "A comissão organizadora visitará todos os municípios em janeiro e fevereiro para ouvir as propostas dos membros.",
      },
      ID: {
        title: "Persiapan Kongres Nasional 2027 dimulai",
        excerpt: "Panitia penyelenggara mulai berkonsultasi dengan struktur munisipal mengenai agenda kongres.",
        body: "Panitia penyelenggara akan mengunjungi semua munisipalitas pada Januari dan Februari untuk mendengarkan usulan anggota.",
      },
      EN: {
        title: "Preparations begin for the 2027 National Congress",
        excerpt: "The organising committee has begun consulting municipal structures on the congress agenda.",
        body: "The organising committee will visit every municipality in January and February to hear proposals from members.",
      },
    },
  },
];

export async function seedNews(db: PrismaClient, authorId: string): Promise<void> {
  for (const a of ARTICLES) {
    const translations = translationRows(a.content);
    const data = {
      category: a.category,
      status: a.status,
      isFeatured: a.isFeatured,
      publishedAt: a.publishedAt,
      authorId,
    };
    await db.newsArticle.upsert({
      where: { slug: a.slug },
      create: { slug: a.slug, ...data, translations: { create: translations } },
      update: { ...data, translations: { deleteMany: {}, create: translations } },
    });
  }
  const published = ARTICLES.filter((a) => a.status === "PUBLISHED").length;
  log("News articles", `${ARTICLES.length} articles (${published} published, ${ARTICLES.length - published} draft) × 4 locales`);
}
