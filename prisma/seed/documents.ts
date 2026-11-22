import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ContentStatus, PrismaClient } from "@prisma/client";
import { type L10n, log, translationRows } from "./helpers";

/**
 * Demo PDF library. The PDFs are generated here (one text page each) so the
 * seed has no binary fixtures. Idempotent: rows are upserted by slug and a
 * file is only (re)written when the row is new or its file is missing.
 */
type Doc = {
  slug: string;
  status: ContentStatus;
  fileName: string;
  pdfLines: string[];
  content: L10n<{ title: string; description: string | null }>;
};

export const DOCUMENTS: Doc[] = [
  {
    slug: "estatutu-ojetil",
    status: "PUBLISHED",
    fileName: "Estatutu-OJETIL.pdf",
    pdfLines: ["OJETIL - Estatutu (ezemplu demo)", "", "Kapitulu I - Naran, sede no objetivu", "Artigu 1. Organizacao da Juventude e dos Estudantes de Timor-Leste.", "", "Dokumentu ida ne'e ezemplu ba dezenvolvimentu de'it."],
    content: {
      TET: { title: "Estatutu OJETIL", description: "Estatutu organizasaun nian ne'ebé aprova iha Kongresu Nasionál." },
      PT: { title: "Estatutos da OJETIL", description: "Estatutos da organização aprovados em Congresso Nacional." },
      ID: { title: "Anggaran Dasar OJETIL", description: "Anggaran dasar organisasi yang disahkan dalam Kongres Nasional." },
      EN: { title: "OJETIL Statutes", description: "The organisation's statutes as approved by the National Congress." },
    },
  },
  {
    slug: "guia-rejistu-membru-2026",
    status: "PUBLISHED",
    fileName: "Guia-rejistu-membru.pdf",
    pdfLines: ["Guia rejistu membru no veteranu 2026 (demo)", "", "1. Prepara Bilhete de Identidade.", "2. Prenche formulariu online iha pasu tolu.", "3. Rai kodigu rejistu atu tuir status."],
    content: {
      TET: { title: "Guia rejistu membru no veteranu", description: "Pasu-pasu atu rejista online no tuir status verifikasaun." },
      PT: { title: "Guia de registo de membros e veteranos", description: "Passo a passo para o registo online e acompanhamento da verificação." },
      ID: { title: "Panduan pendaftaran anggota dan veteran", description: "Langkah-langkah pendaftaran daring dan pemantauan status verifikasi." },
      EN: { title: "Member and veteran registration guide", description: "Step-by-step guide to registering online and tracking verification." },
    },
  },
  {
    slug: "relatoriu-atividade-2025",
    status: "DRAFT",
    fileName: "Relatoriu-atividade-2025.pdf",
    pdfLines: ["Relatoriu atividade 2025 (rascunho demo)"],
    content: {
      TET: { title: "Relatóriu atividade 2025", description: null },
      PT: { title: "Relatório de atividades 2025", description: null },
      ID: { title: "Laporan kegiatan 2025", description: null },
      EN: { title: "2025 activity report", description: null },
    },
  },
];

/** Builds a valid single-page PDF (Helvetica, ASCII text) with a correct xref table. */
export function minimalPdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[^\x20-\x7e]/g, "").replace(/([\\()])/g, "\\$1");
  const stream = ["BT", "/F1 14 Tf", "72 770 Td", "18 TL", ...lines.map((l) => `(${esc(l)}) '`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const documentRoot = () => resolve(process.env.DOCUMENT_DIR ?? "./storage/documents");

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function writePdf(data: Buffer): Promise<string> {
  const key = `${new Date().getUTCFullYear()}/${randomUUID()}.pdf`;
  const full = resolve(documentRoot(), key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data, { mode: 0o640 });
  return key;
}

export async function seedDocuments(db: PrismaClient, createdById: string): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const d of DOCUMENTS) {
    const existing = await db.document.findUnique({ where: { slug: d.slug }, select: { id: true, fileKey: true } });
    const pdf = minimalPdf(d.pdfLines);
    const fileOk = existing ? await exists(resolve(documentRoot(), existing.fileKey)) : false;
    const file = fileOk
      ? null
      : { fileKey: await writePdf(pdf), fileName: d.fileName, fileSize: pdf.length, sha256: createHash("sha256").update(pdf).digest("hex") };
    const translations = translationRows(d.content);
    const data = { status: d.status, publishedAt: d.status === "PUBLISHED" ? new Date("2026-11-01T00:00:00Z") : null };
    const saved = existing
      ? await db.document.update({ where: { id: existing.id }, data: { ...data, ...(file ?? {}), translations: { deleteMany: {}, create: translations } }, select: { id: true } })
      : await db.document.create({
          data: { slug: d.slug, ...data, ...file!, createdById, translations: { create: translations } },
          select: { id: true },
        });
    ids[d.slug] = saved.id;
  }
  const published = DOCUMENTS.filter((d) => d.status === "PUBLISHED").length;
  log("Documents", `${DOCUMENTS.length} PDFs (${published} published) in ${documentRoot()}`);
  return ids;
}
