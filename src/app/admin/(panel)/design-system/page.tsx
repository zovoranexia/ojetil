import type { Metadata } from "next";
import { Emblem } from "@/components/brand/emblem";
import { TaisRibbon } from "@/components/brand/tais-ribbon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";
import { requirePageAccess } from "@/lib/security/guards";

/** Living reference of the OJETIL design tokens for the editorial team. */
export const metadata: Metadata = { title: "Design System" };

const swatches = [
  { token: "--ojetil-red-primary", hex: "#A61C1C", use: "Primary CTA, active states, timeline accents", dark: true },
  { token: "--ojetil-red-hover", hex: "#7F1313", use: "Primary hover / pressed", dark: true },
  { token: "--ojetil-ink-primary", hex: "#18181B", use: "Text, headings, footer, editorial buttons", dark: true },
  { token: "--ojetil-ink-secondary", hex: "#52525B", use: "Metadata, timestamps, labels", dark: true },
  { token: "--ojetil-gold-accent", hex: "#C98A12", use: "Accents on ink surfaces ONLY", dark: false },
  { token: "--ojetil-gold-text", hex: "#855806", use: "Ochre text & badges on light surfaces", dark: true },
  { token: "--ojetil-surface-paper", hex: "#F8F5EF", use: "Public page canvas", dark: false },
  { token: "--ojetil-surface-card", hex: "#FFFFFF", use: "Cards, modals, admin workspace", dark: false },
  { token: "--ojetil-border-subtle", hex: "#E4DDD2", use: "Borders, dividers, inputs", dark: false },
] as const;

export default async function DesignSystemPage() {
  await requirePageAccess("dashboard:view", "/admin/design-system");
  return (
    <div className="space-y-14">
      <div className="flex items-center gap-4">
        <Emblem size={56} />
        <div>
          <p className="font-serif text-2xl font-bold leading-none text-ink">{siteConfig.shortName}</p>
          <p className="text-sm text-ink-secondary">{siteConfig.fullName}</p>
        </div>
      </div>
      <TaisRibbon />
        <section aria-labelledby="intro" className="space-y-3">
          <Badge tone="heritage">Design system</Badge>
          <h1 id="intro" className="text-4xl md:text-5xl">
            Dignified Archive, <span className="text-ojetil-red">Next-Generation Energy</span>
          </h1>
          <p className="max-w-2xl text-lg text-ink-secondary">
            Token reference for the OJETIL web platform. Diacritics check: Ataúro, Lautém, Liquiçá, Díli,
            Organização, informações, As&apos;wain, Bilhete de Identidade.
          </p>
        </section>

        <section aria-labelledby="colours" className="space-y-5">
          <h2 id="colours" className="text-2xl">Colour tokens</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {swatches.map((s) => (
              <li key={s.token}>
                <Card className="overflow-hidden">
                  <div
                    className="flex h-20 items-end p-3 font-mono text-xs"
                    style={{ backgroundColor: s.hex, color: s.dark ? "#FFFFFF" : "#18181B" }}
                  >
                    {s.hex}
                  </div>
                  <CardContent className="space-y-1 pt-4">
                    <p className="font-mono text-xs text-ink">{s.token}</p>
                    <p className="text-sm text-ink-secondary">{s.use}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="status" className="space-y-4">
          <h2 id="status" className="text-2xl">Status semantics</h2>
          <div className="flex flex-wrap gap-3">
            <Badge tone="verified">VERIFIED · Verifikadu</Badge>
            <Badge tone="pending">PENDING_VERIFICATION · Hein verifikasaun</Badge>
            <Badge tone="rejected">REJECTED · Rejeitadu</Badge>
            <Badge tone="info">NEEDS_REVISION · Presiza revizaun</Badge>
            <Badge tone="heritage">Veteranu Klandestinu</Badge>
          </div>
          <div className="rounded-card bg-ink p-5">
            <p className="font-serif text-xl text-paper">
              On ink surfaces the gold accent is permitted: <span className="text-gold-accent">12 Novembru 1991</span>
            </p>
          </div>
        </section>

        <section aria-labelledby="type" className="space-y-4">
          <h2 id="type" className="text-2xl">Typography</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="font-serif text-5xl font-bold">Saber para Servir</p>
              <p className="font-serif text-3xl font-semibold">Pátria — Povo</p>
              <p className="max-w-prose">
                Plus Jakarta Sans for interface and body copy. Joven no estudante sira hamutuk atu aprende, debate
                no serbí komunidade.
              </p>
              <p className="tabular-nums text-ink-secondary">
                Tabular numerals: 1980 · 1989 · 1991 · 1999 · 2002 · 78,5%
              </p>
              <p className="tracking-code text-lg">OJT-2026-0042 · TKT-7KQ2-M9XD</p>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="controls" className="space-y-4">
          <h2 id="controls" className="text-2xl">Controls (≥ 44px tap targets)</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Rejista agora</Button>
            <Button variant="editorial">Lee istória</Button>
            <Button variant="outline">Filtru</Button>
            <Button variant="ghost">Kansela</Button>
            <Button variant="link">Haree hotu</Button>
          </div>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Cek status</CardTitle>
              <CardDescription>Hatama ita-nia kódigu rejistu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="demo-code" required>
                Kódigu rejistu
              </Label>
              <Input id="demo-code" placeholder="OJT-2026-0042" className="tracking-code" />
            </CardContent>
          </Card>
        </section>
    </div>
  );
}
