import type { DatePrecision, PrismaClient } from "@prisma/client";
import { type L10n, log, translationRows } from "./helpers";

type Milestone = {
  slug: string;
  year: number;
  month?: number;
  day?: number;
  datePrecision: DatePrecision;
  isHighlighted: boolean;
  content: L10n<{ title: string; summary: string; body: string }>;
};

/*
 * Narrative milestones (storytelling, not an archive). Dates are given only to
 * the precision that is well documented; the editorial team should review all
 * copy with OJETIL veterans before publication.
 */
const MILESTONES: Milestone[] = [
  {
    slug: "abut-klandestina-1980s",
    year: 1980,
    datePrecision: "DECADE",
    isHighlighted: true,
    content: {
      TET: {
        title: "Abut klandestina iha eskola sira",
        summary:
          "Iha tinan 1980 sira, estudante sira iha Díli no iha territóriu tomak hahú organiza-an iha selula kiik no segredu atu apoiu rezisténsia.",
        body:
          "Durante okupasaun, organizasaun polítika nakloke la bele halo. Joven sira hasoru malu iha sala aula, paróquia no uma família — haruka mensajen, halibur informasaun no fó apoiu ba frente armada iha foho.\n\n" +
          "Rede estudante no traballadór joven sira ne'e mak sai rai-fatin ba OJETIL atu moris no buras — kesi hamutuk ho konfiansa, naran klandestina no kompromisu ida de'it ba Timor-Leste ukun-rasik-an.",
      },
      PT: {
        title: "Raízes clandestinas nas escolas",
        summary:
          "Na década de 1980, estudantes em Díli e em todo o território começaram a organizar-se em pequenas células secretas de apoio à resistência.",
        body:
          "Sob a ocupação, a organização política aberta era impossível. Os jovens reuniam-se em salas de aula, paróquias e casas de família, transmitindo mensagens, recolhendo informações e apoiando a frente armada nas montanhas.\n\n" +
          "Estas redes discretas de estudantes e jovens trabalhadores foram o terreno onde a OJETIL nasceu e cresceu — unidas pela confiança, pelos nomes de código e por um compromisso comum com um Timor-Leste independente.",
      },
      ID: {
        title: "Akar klandestin di sekolah-sekolah",
        summary:
          "Pada 1980-an, pelajar di Díli dan di seluruh wilayah mulai berorganisasi dalam sel-sel rahasia kecil untuk mendukung perlawanan.",
        body:
          "Di bawah pendudukan, organisasi politik secara terbuka tidak mungkin dilakukan. Kaum muda bertemu di ruang kelas, paroki, dan rumah keluarga — menyampaikan pesan, mengumpulkan informasi, dan mendukung front bersenjata di pegunungan.\n\n" +
          "Jaringan pelajar dan pekerja muda yang tersembunyi inilah yang menjadi lahan lahir dan tumbuhnya OJETIL — diikat oleh kepercayaan, nama samaran, dan komitmen bersama untuk Timor-Leste yang merdeka.",
      },
      EN: {
        title: "Clandestine roots in the schools",
        summary:
          "In the 1980s, students in Díli and across the territory began organising in small, secret cells to support the resistance.",
        body:
          "Under occupation, open political organisation was impossible. Young people met in classrooms, parishes and family homes — passing messages, gathering information and supporting the armed front in the mountains.\n\n" +
          "These discreet networks of students and young workers were the ground from which OJETIL was born and grew — bound by trust, code names and a shared commitment to an independent Timor-Leste.",
      },
    },
  },
  {
    slug: "faixa-tasitolu-1989",
    year: 1989,
    month: 10,
    day: 12,
    datePrecision: "DAY",
    isHighlighted: true,
    content: {
      TET: {
        title: "Faixa sira iha Tasitolu",
        summary:
          "Durante Misa Papa João Paulo II nian iha Tasitolu, joven sira loke faixa ba ukun-rasik-an iha jornalista internasionál sira nia oin.",
        body:
          "Vizita Papa nian lori jornalista internasionál sira mai Díli ba dala uluk iha tinan barak nia laran. Bainhira Misa remata, estudante sira hakat ba oin ho faixa no hakilar slogan, no forsa seguransa baku no kaptura sira iha kámara nia oin.\n\n" +
          "Asaun ne'e hatudu katak jerasaun foun ne'ebé hetan edukasaun iha okupasaun laran, la simu okupasaun ne'e.",
      },
      PT: {
        title: "Faixas em Tasitolu",
        summary:
          "Durante a missa do Papa João Paulo II em Tasitolu, jovens desfraldaram faixas pró-independência perante a imprensa internacional.",
        body:
          "A visita papal trouxe jornalistas internacionais a Díli pela primeira vez em muitos anos. No final da missa, estudantes avançaram com faixas e palavras de ordem e foram espancados e detidos pelas forças de segurança diante das câmaras.\n\n" +
          "O gesto mostrou que uma nova geração, educada sob a ocupação, não a tinha aceitado.",
      },
      ID: {
        title: "Spanduk di Tasitolu",
        summary:
          "Saat Misa Paus Yohanes Paulus II di Tasitolu, kaum muda membentangkan spanduk pro-kemerdekaan di hadapan pers internasional.",
        body:
          "Kunjungan Paus membawa jurnalis internasional ke Díli untuk pertama kalinya setelah bertahun-tahun. Ketika Misa usai, para pelajar maju membawa spanduk dan meneriakkan slogan, lalu dipukuli dan ditangkap aparat keamanan di depan kamera.\n\n" +
          "Aksi itu menunjukkan bahwa generasi baru yang dididik di bawah pendudukan tidak pernah menerimanya.",
      },
      EN: {
        title: "Banners at Tasitolu",
        summary:
          "During Pope John Paul II's Mass at Tasitolu, young people unfurled pro-independence banners before the international press.",
        body:
          "The papal visit brought international journalists to Díli for the first time in years. As the Mass ended, students surged forward with banners and slogans, and were beaten and arrested by security forces in full view of the cameras.\n\n" +
          "The action showed that a new generation, educated under occupation, had never accepted it.",
      },
    },
  },
  {
    slug: "manifestasaun-embaixador-1990",
    year: 1990,
    month: 1,
    datePrecision: "MONTH",
    isHighlighted: false,
    content: {
      TET: {
        title: "Manifestasaun ba Embaixadór EUA",
        summary:
          "Estudante sira halo manifestasaun iha Hotel Turismo nia oin durante vizita Embaixadór EUA John Monjo, ezije referendu.",
        body:
          "Joven sira uza vizita diplomátika ida ne'ebé raru atu hato'o sira-nia hakarak diretamente. Forsa seguransa hakotu manifestasaun ho forsa, maibé mensajen — katak juventude timoroan hakarak autodeterminasaun — to'o kapitál estranjeiru sira.\n\n" +
          "Asaun hotu hanesan ne'e prepara ho segredu liuhusi rede estudante sira.",
      },
      PT: {
        title: "Protesto perante o Embaixador dos EUA",
        summary:
          "Estudantes manifestaram-se junto ao Hotel Turismo durante a visita do Embaixador dos EUA, John Monjo, exigindo um referendo.",
        body:
          "Os jovens aproveitaram uma rara visita diplomática para fazer ouvir diretamente as suas reivindicações. O protesto foi dispersado à força, mas a mensagem — de que a juventude timorense queria a autodeterminação — chegou às capitais estrangeiras.\n\n" +
          "Cada uma destas ações era preparada em segredo pelas redes estudantis.",
      },
      ID: {
        title: "Unjuk rasa saat kunjungan Duta Besar AS",
        summary:
          "Pelajar berdemonstrasi di depan Hotel Turismo saat kunjungan Duta Besar AS John Monjo, menuntut referendum.",
        body:
          "Kaum muda memanfaatkan kunjungan diplomatik yang langka untuk menyuarakan tuntutan mereka secara langsung. Aksi itu dibubarkan dengan kekerasan, tetapi pesannya — bahwa pemuda Timor menginginkan penentuan nasib sendiri — sampai ke ibu kota negara-negara lain.\n\n" +
          "Setiap aksi semacam ini direncanakan secara rahasia melalui jaringan pelajar.",
      },
      EN: {
        title: "Protest for the US Ambassador",
        summary:
          "Students demonstrated outside the Hotel Turismo during the visit of US Ambassador John Monjo, demanding a referendum.",
        body:
          "Young people seized a rare diplomatic visit to make their demands heard directly. The protest was broken up by force, but the message — that Timorese youth wanted self-determination — reached foreign capitals.\n\n" +
          "Every action of this kind was planned in secret through the student networks.",
      },
    },
  },
  {
    slug: "santa-cruz-1991",
    year: 1991,
    month: 11,
    day: 12,
    datePrecision: "DAY",
    isHighlighted: true,
    content: {
      TET: {
        title: "Masakre Santa Cruz",
        summary:
          "Iha loron 12 Novembru 1991, militár Indonézia tiru ba prosesaun pasífiku ida — maioria joven sira — iha Semitériu Santa Cruz.",
        body:
          "Ema rihun ba rihun la'o husi Igreja Motael to'o Santa Cruz atu fó omenajen ba Sebastião Gomes, ativista joven ne'ebé mate semana rua molok ne'e. Iha semitériu nia odamatan, soldadu sira tiru ba ema barak; ema atus ba atus mate ka lakon.\n\n" +
          "Imajen sira ne'ebé hasai ho segredu husi rai-laran lori luta Timor-Leste nian ba mundu tomak nia atensaun. Ohin loron, 12 Novembru selebra nu'udar Loron Nasionál Juventude.",
      },
      PT: {
        title: "O Massacre de Santa Cruz",
        summary:
          "A 12 de novembro de 1991, tropas indonésias abriram fogo sobre uma procissão pacífica — composta sobretudo por jovens — no Cemitério de Santa Cruz.",
        body:
          "Milhares de pessoas caminharam da Igreja de Motael até Santa Cruz para homenagear Sebastião Gomes, jovem ativista morto duas semanas antes. Junto aos portões do cemitério, os soldados dispararam sobre a multidão; centenas foram mortos ou desapareceram.\n\n" +
          "As imagens retiradas clandestinamente do país levaram a luta de Timor-Leste à atenção do mundo. Hoje, o 12 de novembro é celebrado como Dia Nacional da Juventude.",
      },
      ID: {
        title: "Pembantaian Santa Cruz",
        summary:
          "Pada 12 November 1991, tentara Indonesia menembaki prosesi damai — sebagian besar kaum muda — di Pemakaman Santa Cruz.",
        body:
          "Ribuan orang berjalan dari Gereja Motael ke Santa Cruz untuk menghormati Sebastião Gomes, aktivis muda yang terbunuh dua minggu sebelumnya. Di gerbang pemakaman, tentara menembaki kerumunan; ratusan orang tewas atau hilang.\n\n" +
          "Rekaman yang diselundupkan ke luar negeri membawa perjuangan Timor-Leste ke perhatian dunia. Kini, 12 November diperingati sebagai Hari Pemuda Nasional.",
      },
      EN: {
        title: "The Santa Cruz Massacre",
        summary:
          "On 12 November 1991, Indonesian troops opened fire on a peaceful procession — mostly young people — at Santa Cruz Cemetery.",
        body:
          "Thousands walked from Motael Church to Santa Cruz to honour Sebastião Gomes, a young activist killed two weeks earlier. At the cemetery gates, soldiers fired into the crowd; hundreds were killed or disappeared.\n\n" +
          "Footage smuggled out of the country brought Timor-Leste's struggle to the world's attention. Today, 12 November is commemorated as National Youth Day.",
      },
    },
  },
  {
    slug: "dialogu-estudante-1998",
    year: 1998,
    datePrecision: "YEAR",
    isHighlighted: false,
    content: {
      TET: {
        title: "Estudante sira loke diálogu",
        summary:
          "Hafoin Suharto monu iha Maiu 1998, estudante timoroan sira organiza diálogu nakloke no manifestasaun boot iha territóriu tomak.",
        body:
          "Ba dala uluk iha tinan ruanulu resin nia laran, joven sira bele ko'alia ho nakloke kona-ba autodeterminasaun. Grupu estudante sira la'o ba vila no aldeia sira atu halo diálogu ho komunidade no esplika opsaun sira ne'ebé atu mai.\n\n" +
          "Rede klandestina sira husi tinan 1980 sai ruin-kotuk ba movimentu ida ne'ebé nakloke no dame.",
      },
      PT: {
        title: "Os estudantes abrem o diálogo",
        summary:
          "Após a queda de Suharto em maio de 1998, os estudantes timorenses organizaram diálogos abertos e grandes concentrações em todo o território.",
        body:
          "Pela primeira vez em mais de duas décadas, os jovens podiam falar publicamente sobre autodeterminação. Grupos de estudantes percorreram vilas e aldeias para dialogar com as comunidades e explicar as escolhas que se aproximavam.\n\n" +
          "As redes clandestinas dos anos 80 tornaram-se a espinha dorsal de um movimento aberto e pacífico.",
      },
      ID: {
        title: "Pelajar membuka dialog",
        summary:
          "Setelah jatuhnya Soeharto pada Mei 1998, pelajar Timor menggelar dialog terbuka dan aksi massa di seluruh wilayah.",
        body:
          "Untuk pertama kalinya dalam lebih dari dua dekade, kaum muda dapat berbicara secara terbuka tentang penentuan nasib sendiri. Kelompok pelajar berkeliling ke kota dan desa untuk berdialog dengan masyarakat dan menjelaskan pilihan yang akan datang.\n\n" +
          "Jaringan klandestin tahun 1980-an menjadi tulang punggung sebuah gerakan yang terbuka dan damai.",
      },
      EN: {
        title: "Students open the dialogue",
        summary:
          "After the fall of Suharto in May 1998, Timorese students organised open dialogues and mass rallies across the territory.",
        body:
          "For the first time in more than two decades, young people could speak publicly about self-determination. Student groups travelled to towns and villages to hold dialogues with communities and explain the choices ahead.\n\n" +
          "The clandestine networks of the 1980s became the backbone of an open, peaceful movement.",
      },
    },
  },
  {
    slug: "konsulta-popular-1999",
    year: 1999,
    month: 8,
    day: 30,
    datePrecision: "DAY",
    isHighlighted: true,
    content: {
      TET: {
        title: "Konsulta Populár",
        summary:
          "Iha loron 30 Agostu 1999, votante 78,5% hili ukun-rasik-an iha Konsulta Populár ne'ebé ONU organiza.",
        body:
          "Maske hetan intimidasaun fulan barak, kuaze votante rejistadu hotu ba vota. Joven sira serbisu nu'udar edukadór sívika, observadór no organizadór, la'o loron barak atu to'o suku sira ne'ebé dook.\n\n" +
          "Rezultadu, ne'ebé anunsia iha loron 4 Setembru, tuir kedas ho violénsia ne'ebé estraga buat hotu — maibé povu nia hakarak rejista ona no labele kansela.",
      },
      PT: {
        title: "A Consulta Popular",
        summary:
          "A 30 de agosto de 1999, 78,5% dos eleitores escolheram a independência na Consulta Popular organizada pela ONU.",
        body:
          "Apesar de meses de intimidação, quase todos os eleitores recenseados votaram. Os jovens trabalharam como educadores cívicos, observadores e organizadores, caminhando dias para chegar aos sucos mais remotos.\n\n" +
          "O resultado, anunciado a 4 de setembro, foi seguido de violência devastadora — mas a vontade do povo ficara registada e não podia ser desfeita.",
      },
      ID: {
        title: "Jajak Pendapat",
        summary:
          "Pada 30 Agustus 1999, 78,5% pemilih memilih kemerdekaan dalam Jajak Pendapat yang diselenggarakan PBB.",
        body:
          "Meskipun diintimidasi selama berbulan-bulan, hampir semua pemilih terdaftar memberikan suaranya. Kaum muda bekerja sebagai pendidik kewarganegaraan, pemantau, dan pengorganisir, berjalan berhari-hari untuk mencapai suco-suco terpencil.\n\n" +
          "Hasilnya, yang diumumkan pada 4 September, disusul kekerasan yang menghancurkan — tetapi kehendak rakyat telah tercatat dan tidak dapat dibatalkan.",
      },
      EN: {
        title: "The Popular Consultation",
        summary:
          "On 30 August 1999, 78.5% of voters chose independence in the UN-organised Popular Consultation.",
        body:
          "Despite months of intimidation, almost every registered voter cast a ballot. Young people worked as civic educators, monitors and organisers, walking for days to reach remote sucos.\n\n" +
          "The result, announced on 4 September, was followed by devastating violence — but the will of the people had been recorded and could not be undone.",
      },
    },
  },
  {
    slug: "restaurasaun-independensia-2002",
    year: 2002,
    month: 5,
    day: 20,
    datePrecision: "DAY",
    isHighlighted: false,
    content: {
      TET: {
        title: "Restaurasaun Independénsia",
        summary: "Iha loron 20 Maiu 2002, Repúblika Demokrátika Timor-Leste restaura nia independénsia.",
        body:
          "Jerasaun ne'ebé organiza-an ho segredu, agora hahú harii Estadu. Eis-ativista estudante barak tama ba funsaun públika, ensinu, Igreja no sosiedade sivíl.\n\n" +
          "OJETIL lori nia lema — Saber para Servir — ba misaun foun ida: eduka sidadaun foin-sa'e sira ba nasaun livre ida.",
      },
      PT: {
        title: "Independência restaurada",
        summary: "A 20 de maio de 2002, a República Democrática de Timor-Leste restaurou a sua independência.",
        body:
          "A geração que se organizara em segredo lançou-se à construção do Estado. Muitos antigos ativistas estudantis entraram na função pública, no ensino, na Igreja e na sociedade civil.\n\n" +
          "A OJETIL levou o seu lema — Saber para Servir — para uma nova missão: educar jovens cidadãos para uma nação livre.",
      },
      ID: {
        title: "Kemerdekaan dipulihkan",
        summary: "Pada 20 Mei 2002, Republik Demokratik Timor-Leste memulihkan kemerdekaannya.",
        body:
          "Generasi yang dulu berorganisasi secara rahasia kini mulai membangun negara. Banyak mantan aktivis pelajar masuk ke pelayanan publik, dunia pendidikan, Gereja, dan masyarakat sipil.\n\n" +
          "OJETIL membawa semboyannya — Saber para Servir — ke dalam misi baru: mendidik warga muda bagi bangsa yang merdeka.",
      },
      EN: {
        title: "Independence restored",
        summary: "On 20 May 2002, the Democratic Republic of Timor-Leste restored its independence.",
        body:
          "The generation that had organised in secret now set about building a state. Many former student activists entered public service, teaching, the Church and civil society.\n\n" +
          "OJETIL carried its motto — Saber para Servir — into a new mission: educating young citizens for a free nation.",
      },
    },
  },
];

export async function seedTimeline(db: PrismaClient): Promise<void> {
  for (const [index, m] of MILESTONES.entries()) {
    const translations = translationRows(m.content);
    const data = {
      year: m.year,
      month: m.month ?? null,
      day: m.day ?? null,
      datePrecision: m.datePrecision,
      isHighlighted: m.isHighlighted,
      displayOrder: (index + 1) * 10,
      status: "PUBLISHED" as const,
    };
    await db.timelineMilestone.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug, ...data, translations: { create: translations } },
      update: { ...data, translations: { deleteMany: {}, create: translations } },
    });
  }
  log("Timeline milestones", `${MILESTONES.length} milestones × 4 locales`);
}
