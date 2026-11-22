import type { PrismaClient, ProfileSectionKey } from "@prisma/client";
import { type L10n, log, translationRows } from "./helpers";

type Section = { key: ProfileSectionKey; displayOrder: number; content: L10n<{ title: string; body: string }> };

const SECTIONS: Section[] = [
  {
    key: "PROFILE",
    displayOrder: 1,
    content: {
      TET: {
        title: "Kona-ba OJETIL",
        body:
          "OJETIL — Organizasaun Juventude no Estudante Timor-Leste nian — moris iha tinan 1980 sira nu'udar rede klandestina joven no estudante sira ne'ebé luta ba ukun-rasik-an.\n\n" +
          "Ohin loron, OJETIL serbisu nu'udar sentru nasionál ba edukasaun sívika, diskursu públiku no partisipasaun foin-sa'e sira iha munisípiu hotu-hotu. Ami hamutuk veteranu klandestinu sira ho jerasaun foun atu memória luta nian bele sai matenek ba futuru.",
      },
      PT: {
        title: "Sobre a OJETIL",
        body:
          "A OJETIL — Organização da Juventude e dos Estudantes de Timor-Leste — nasceu na década de 1980 como uma rede clandestina de jovens e estudantes empenhados na luta pela independência.\n\n" +
          "Hoje, a OJETIL atua como centro nacional de educação cívica, debate público e participação juvenil em todos os municípios. Reunimos veteranos da clandestinidade e novas gerações para que a memória da luta se transforme em conhecimento para o futuro.",
      },
      ID: {
        title: "Tentang OJETIL",
        body:
          "OJETIL — Organisasi Pemuda dan Pelajar Timor-Leste — lahir pada dekade 1980-an sebagai jaringan klandestin pemuda dan pelajar yang berjuang untuk kemerdekaan.\n\n" +
          "Kini, OJETIL berperan sebagai pusat nasional pendidikan kewarganegaraan, diskursus publik, dan partisipasi pemuda di seluruh munisipalitas. Kami mempertemukan para veteran klandestin dengan generasi baru agar ingatan perjuangan menjadi pengetahuan untuk masa depan.",
      },
      EN: {
        title: "About OJETIL",
        body:
          "OJETIL — the Organisation of Youth and Students of Timor-Leste — was born in the 1980s as a clandestine network of young people and students committed to the struggle for independence.\n\n" +
          "Today, OJETIL serves as a national centre for civic education, public discourse and youth participation in every municipality. We bring veterans of the clandestine front together with new generations so that the memory of the struggle becomes knowledge for the future.",
      },
    },
  },
  {
    key: "VISION",
    displayOrder: 2,
    content: {
      TET: {
        title: "Vizaun",
        body: "Jerasaun foin-sa'e ida ne'ebé matenek, iha konxiénsia sívika no prontu atu serbí Pátria no Povu.",
      },
      PT: {
        title: "Visão",
        body: "Uma geração jovem informada, com consciência cívica e pronta a servir a Pátria e o Povo.",
      },
      ID: {
        title: "Visi",
        body: "Generasi muda yang berpengetahuan, memiliki kesadaran kewarganegaraan, dan siap mengabdi kepada Tanah Air dan Rakyat.",
      },
      EN: {
        title: "Vision",
        body: "An informed young generation with civic awareness, ready to serve the Homeland and the People.",
      },
    },
  },
  {
    key: "MISSION",
    displayOrder: 3,
    content: {
      TET: {
        title: "Misaun",
        body:
          "- Hametin edukasaun sívika no memória istórika ba joven no estudante sira.\n" +
          "- Loke espasu ba debate públiku ne'ebé livre, inkluzivu no respeitozu.\n" +
          "- Liga veteranu klandestinu sira ho jerasaun foun.\n" +
          "- Fó apoiu ba lideransa foin-sa'e iha munisípiu hotu no iha diáspora.",
      },
      PT: {
        title: "Missão",
        body:
          "- Fortalecer a educação cívica e a memória histórica entre jovens e estudantes.\n" +
          "- Abrir espaços de debate público livre, inclusivo e respeitoso.\n" +
          "- Ligar os veteranos da clandestinidade às novas gerações.\n" +
          "- Apoiar a liderança juvenil em todos os municípios e na diáspora.",
      },
      ID: {
        title: "Misi",
        body:
          "- Memperkuat pendidikan kewarganegaraan dan ingatan sejarah di kalangan pemuda dan pelajar.\n" +
          "- Membuka ruang debat publik yang bebas, inklusif, dan saling menghormati.\n" +
          "- Menghubungkan para veteran klandestin dengan generasi baru.\n" +
          "- Mendukung kepemimpinan pemuda di seluruh munisipalitas dan diaspora.",
      },
      EN: {
        title: "Mission",
        body:
          "- Strengthen civic education and historical memory among young people and students.\n" +
          "- Open spaces for free, inclusive and respectful public debate.\n" +
          "- Connect veterans of the clandestine front with new generations.\n" +
          "- Support youth leadership in every municipality and in the diaspora.",
      },
    },
  },
  {
    key: "VALUES",
    displayOrder: 4,
    content: {
      TET: {
        title: "Saber para Servir — Pátria, Povo",
        body:
          "Ami-nia lema hanorin katak matenek la'ós ba an rasik, maibé atu serbí. Valór sira ne'ebé ami kaer: **integridade**, **solidariedade**, **memória** no **serbisu ba komunidade**.",
      },
      PT: {
        title: "Saber para Servir — Pátria, Povo",
        body:
          "O nosso lema ensina que o saber não é para si próprio, mas para servir. Os valores que defendemos: **integridade**, **solidariedade**, **memória** e **serviço à comunidade**.",
      },
      ID: {
        title: "Saber para Servir — Pátria, Povo",
        body:
          "Semboyan kami mengajarkan bahwa pengetahuan bukan untuk diri sendiri, melainkan untuk mengabdi. Nilai-nilai yang kami pegang: **integritas**, **solidaritas**, **ingatan**, dan **pengabdian kepada masyarakat**.",
      },
      EN: {
        title: "Saber para Servir — Pátria, Povo",
        body:
          "Our motto — “Knowledge to Serve: Homeland, People” — teaches that knowledge is not for oneself but for service. The values we uphold: **integrity**, **solidarity**, **memory** and **service to the community**.",
      },
    },
  },
  {
    key: "HISTORY_INTRO",
    displayOrder: 5,
    content: {
      TET: {
        title: "Istória ida ne'ebé joven sira hakerek",
        body: "Husi sala aula klandestina iha tinan 1980 sira to'o Konsulta Populár 1999, joven no estudante sira mak hakerek pájina importante barak iha luta ba ukun-rasik-an. Ne'e mak sira-nia istória.",
      },
      PT: {
        title: "Uma história escrita pelos jovens",
        body: "Das salas de aula clandestinas dos anos 80 à Consulta Popular de 1999, jovens e estudantes escreveram muitas das páginas decisivas da luta pela independência. Esta é a sua história.",
      },
      ID: {
        title: "Sejarah yang ditulis oleh kaum muda",
        body: "Dari ruang kelas klandestin pada 1980-an hingga Jajak Pendapat 1999, pemuda dan pelajar menulis banyak halaman penting dalam perjuangan kemerdekaan. Inilah kisah mereka.",
      },
      EN: {
        title: "A history written by the young",
        body: "From the clandestine classrooms of the 1980s to the 1999 Popular Consultation, young people and students wrote many of the decisive pages of the independence struggle. This is their story.",
      },
    },
  },
];

export async function seedProfile(db: PrismaClient): Promise<void> {
  for (const s of SECTIONS) {
    const translations = translationRows(s.content);
    await db.profileSection.upsert({
      where: { key: s.key },
      create: { key: s.key, displayOrder: s.displayOrder, status: "PUBLISHED", translations: { create: translations } },
      update: {
        displayOrder: s.displayOrder,
        status: "PUBLISHED",
        translations: { deleteMany: {}, create: translations },
      },
    });
  }
  log("Profile sections", `${SECTIONS.length} sections × 4 locales`);
}
