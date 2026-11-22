# OJETIL WebApp

**Organização da Juventude e dos Estudantes de Timor-Leste** — *Saber para Servir · Pátria, Povo*

Public website (Tetun · Português · Bahasa Indonesia · English), member & veteran
registration portal, and an RBAC-protected backoffice.

> **Status:** Phase 1 MVP complete (all 5 build phases). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
> for the directory tree, data model and security model.
>
> **Production deployment (VPS Ubuntu 26.04, Bahasa Indonesia):** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS 4 + OJETIL design tokens ·
shadcn/ui (Radix) · React Hook Form + Zod · PostgreSQL 17 + Prisma 6 · Auth.js v5 ·
argon2id · AES-256-GCM · next-intl.

## Getting started

Requirements: Node.js ≥ 20.18, Docker Desktop.

```bash
npm install
npm run setup:env      # creates .env with freshly generated secrets
npm run db:up          # PostgreSQL on 127.0.0.1:54329
npm run db:deploy      # apply migrations
npm run db:seed        # demo data (idempotent)
npm run dev            # http://localhost:3000  ·  backoffice at /admin
```

`npm run db:reset` drops the database, re-applies all migrations and re-seeds.

### Demo admin accounts (development only)

| Role | Email |
| --- | --- |
| SUPER_ADMIN | `superadmin@ojetil.test` |
| VERIFIER | `verifier@ojetil.test` |
| EDITOR | `editor@ojetil.test` |
| VIEWER | `viewer@ojetil.test` |

All four share the password stored in `.env` as `SEED_DEMO_PASSWORD`.
The seed refuses to run with `NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=true`.

## Backoffice roles

| Capability | SUPER_ADMIN | VERIFIER | EDITOR | VIEWER |
| --- | :---: | :---: | :---: | :---: |
| KPI overview | ✓ | ✓ | ✓ | ✓ |
| News, documents (PDF), profile, timeline, leadership | edit + publish | read | edit + publish | read |
| Events & attendees | edit + export | read | edit + export | read |
| Member records | full + decrypt | full + decrypt | — | aggregates only |
| Approve / revise / reject | ✓ | ✓ | — | — |
| Users & roles | ✓ | — | — | — |
| Audit log | all | verification only | — | all |

Personal data is decrypted only on an explicit “Reveal”, and every reveal, export, decision,
publication and account change is written to the append-only audit log.

## Scripts

| Script | Purpose |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `typecheck` / `lint` | `tsc --noEmit` / ESLint |
| `i18n:check` | Verify the four message catalogues have identical keys |
| `setup:env` | Generate `.env` from `.env.example`. Overwrite with `npm run setup:env -- --force` (rotates every key — existing encrypted PII becomes unreadable!) |
| `db:up` / `db:down` | Start / stop the PostgreSQL container |
| `db:migrate` | Create a new migration during development |
| `db:deploy` / `db:seed` / `db:reset` / `db:studio` | Apply migrations / seed / reset / Prisma Studio |
| `admin:create` | Create a Super Admin with a one-time temporary password: `npm run admin:create -- --email … --name "…"` (production bootstrap) |
| `SEED_SCOPE=content npm run db:seed` | Load only the institutional profile + history timeline as DRAFT (no demo accounts or data; never overwrites existing rows). Allowed in production |

## Security notes

* Member PII (address, phone, national ID) is encrypted in the application with
  AES-256-GCM before it reaches PostgreSQL. **Back up `PII_ENCRYPTION_KEYS`** — losing
  it makes that data unrecoverable.
* `audit_logs` is append-only at the database level.
* Never commit `.env`.

## Content review before launch

Seed content is demonstration material. Before going live, the OJETIL Secretariat
should review the historical timeline copy, replace the illustrative leadership
roster and confirm the contact details in `src/config/site.ts`.
