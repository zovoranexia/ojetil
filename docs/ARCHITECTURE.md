# OJETIL WebApp — Architecture Blueprint

Phase 1 (MVP) of the OJETIL platform: multilingual public website, member/veteran
registration portal, and an RBAC-protected backoffice. Legend in the tree:
**●** exists now (Phase 1 foundation) · **○** planned, with the build phase that adds it.

## 1. Directory tree

```text
.
├── ● docker-compose.yml               PostgreSQL 17 (loopback :54329)
├── ● .env.example                     Template; `npm run setup:env` generates .env with random secrets
├── ● components.json                  shadcn/ui config (components restyled to OJETIL tokens)
├── ● next.config.ts                   Security headers, argon2 externalised, image sizes for mobile
├── ● package.json / tsconfig.json     Next 15 · React 19 · TS strict + noUncheckedIndexedAccess
├── ● docs/ARCHITECTURE.md             This file
├── ● messages/{tet,pt,id,en}.json     next-intl catalogues (typed from en.json; npm run i18n:check)
├── prisma/
│   ├── ● schema.prisma                Data model (see §3)
│   ├── ● migrations/
│   │   ├── ● 20261122000000_init/                     Generated DDL
│   │   ├── ● 20261122000100_integrity_and_append_only_audit/  Triggers + CHECK constraints
│   │   ├── ● 20261122000200_search_unaccent/          unaccent + f_unaccent() for accent-free news search
│   │   └── ● 20261122000300_password_change_and_audit_actions/  mustChangePassword, EVENT_UNPUBLISHED, USER_PASSWORD_CHANGED
│   ├── ● seed.ts                      Idempotent seed entry point
│   └── ● seed/                        users · profile · timeline · leadership · news · events · members · audit
├── public/brand/● ojetil-emblem.jpg   Official emblem
├── scripts/
│   ├── ● setup-env.mjs                Generates .env secrets (npm run setup:env [-- --force])
│   └── ● check-messages.mjs           Verifies the 4 message catalogues have identical keys (npm run i18n:check)
├── storage/uploads/                   Encrypted profile photos (git-ignored, served via authorised route)
└── src/
    ├── ● middleware.ts                next-intl locale routing + /admin RBAC route gate (layer 1)
    ├── ● auth.ts · auth.config.ts     Auth.js v5 Credentials, JWT in HTTP-only cookie, DB revalidation
    ├── ● instrumentation(-node).ts    Fail-fast env + PII keyring validation at boot
    ├── app/
    │   ├── ● layout.tsx · globals.css Pass-through root + design tokens; fonts.ts shared by both roots
    │   ├── ● favicon.ico/route.ts     Redirects to the emblem (keeps it out of [locale])
    │   ├── ● [locale]/                Public root layout (header, footer, Low-Data); default `tet` unprefixed
    │   │   ├── page.tsx               Home: hero, impact strip, 1980–1999 teaser, events, news, CTA
    │   │   ├── kona-ba/               About: profile, vision & mission, leadership, contact
    │   │   ├── istoria/               Interactive narrative timeline
    │   │   ├── notisia/ · [slug]/     News list (search, category, município, tag filters) and detail (rich text, PDF attachment)
    │   │   ├── edukasaun/acara/ · [slug]/   Events + self-service registration → ticket code
    │   │   └── ● komunidade/registrasi/ · cek-status/   3-step wizard + status lookup (code + DOB)
    │   ├── ● admin/                   Backoffice root layout (en), login, 403, akun/password (forced change of temporary passwords)
│   │   └── ● (panel)/             Shell + KPI overview · anggota · berita (TipTap editor) · dokumen · acara(+peserta) · linimasa · pengurus · profil · users · audit-logs · design-system
    │   └── ● api/
    │       ├── ● auth/[...nextauth]/          Auth.js handlers
    │       ├── ● members/ · members/status/   multipart registration (encrypted) · status lookup; rate-limited, same-origin
    │       ├── (events) self-registration is a Server Action: modules/events/actions.ts
    │       └── ● admin/exports/{members, events/[id]} · admin/members/[id]/photo   CSV + photo (audited)
    ├── components/
    │   ├── ● ui/                      button · badge · card · input · label (shadcn, re-skinned)
    │   ├── ● brand/                   emblem · tais-ribbon
    │   ├── ● public/                  header, nav, TET|PT|ID|EN switcher, Low-Data toggle, footer, cards
    │   ├── ● content/markdown.tsx     Dependency-free, XSS-safe Markdown renderer (profile, timeline, events)
    │   ├── ● content/rich-content.tsx News bodies: sanitised HTML (sanitize-html allowlist, Low-Data aware)
    │   ├── ● forms/                   Field, PhotoField (in-browser downscale), WizardProgress
    │   └── ● admin/                   sidebar, tables/badges, TranslationTabs, ConfirmDialog, EditorActions
    ├── config/
    │   ├── ● site.ts                  Institutional constants (HQ: Bidau Lecidere, Díli)
    │   ├── ● locales.ts               tet · pt · id · en (+ DB enum mapping)
    │   ├── ● municipalities.ts        14 territories + Diaspora, with diacritics
    │   └── ● rbac.ts                  Role → permission matrix + route rules
    ├── ● i18n/                        routing · request · navigation · page-locale (next-intl)
    ├── lib/
    │   ├── ● db.ts                    Prisma singleton
    │   ├── ● dates.ts                 Asia/Dili (UTC+9, no DST) helpers
    │   ├── ● codes.ts                 OJT-YYYY-NNNN tracking codes (atomic), TKT-XXXX-XXXX tickets
    │   ├── ● utils.ts                 cn()
    │   └── security/
    │       ├── ● crypto.ts            AES-256-GCM, versioned keyring, AAD, HMAC blind index
    │       ├── ● password.ts          argon2id hash/verify, timing equaliser
    │       ├── ● permissions.ts       requirePermission(role, permission), 401/403 errors
    │       ├── ● guards.ts            requireUser · requirePageAccess · can · withApiAuth (layer 2)
    │       └── ● password-policy.ts   Client-safe password rules
    └── modules/                       Domain modules — schemas · repository · service · actions
        ├── ● members/pii.ts           Encrypted column mapping (only place that knows it)
        ├── ● audit/service.ts         recordAudit · role-scoped listAuditLogs · PII-key guard
        ├── ● auth/                    login service (lockout), schemas, server actions
        ├── ● users/ · dashboard/      staff accounts (temp passwords, role/deactivate), KPI queries
        ├── ● news/ · events/ · content/   public queries, accent-insensitive search, capacity-safe registration
        ├── ● */admin-*.ts             CMS schemas, queries and audited actions per module
        ├── ● members/                 per-step + server schemas, registration/status service, encrypted photo storage
        └── ○ archive/                 ◄ Phase-2 Digital Archive plugs in here, plus
                                         app/[locale]/arkivu and app/admin/arkivu — no core refactor
```

## 2. Layering

```text
app/ (routes, RSC pages, route handlers)
  └─► modules/<domain>/actions.ts   Server Actions: auth → requirePermission → Zod parse
        └─► modules/<domain>/service.ts   Business rules, audit logging, encryption
              └─► modules/<domain>/repository.ts   Prisma queries only
                    └─► lib/db.ts
```

* Pages never import Prisma directly; they call module services.
* Client components import only `config/*`, `components/*` and Zod schemas.
* `lib/security/*` is server-only by convention (Node `crypto`, native argon2).

## 3. Data model summary

| Area | Tables | Notes |
| --- | --- | --- |
| Staff | `users` | `role` (SUPER_ADMIN · VERIFIER · EDITOR · VIEWER), `isActive`, `sessionVersion` for session revocation, lockout counters |
| Members | `member_registrations`, `member_status_changes`, `code_sequences` | PII = 3 × (ciphertext, 12-byte IV, 16-byte tag) + `piiKeyVersion`; `nationalIdHash` HMAC blind index; full verification history |
| News | `news_articles`, `news_article_translations` | slug, category, DRAFT/PUBLISHED/ARCHIVED, `publishedAt` (future = scheduled), município, byline, tags, PDF attachment, author; body = sanitised HTML |
| Documents | `documents`, `document_translations` | slug, DRAFT/PUBLISHED, PDF under `DOCUMENT_DIR` (magic-byte checked, SHA-256), public download `/documents/<slug>.pdf` when published |
| Events | `events`, `event_translations`, `event_registrations` | timestamptz + explicit `timezone`, capacity, online flag, unique ticket codes, one registration per email per event |
| History | `timeline_milestones`, `…_translations` | year + optional month/day with `datePrecision`; `isHighlighted` drives Home teaser |
| Leadership | `leadership_members`, `…_translations` | NATIONAL / MUNICIPAL, term years |
| About | `profile_sections`, `…_translations` | PROFILE · VISION · MISSION · VALUES · HISTORY_INTRO |
| Audit | `audit_logs` | append-only (trigger rejects UPDATE/DELETE/TRUNCATE); `category` lets VERIFIER see verification logs only |

Database-level guarantees (migration `…_integrity_and_append_only_audit`): tracking- and
ticket-code formats, consent must be true, IV/tag byte lengths, event `endAt > startAt`,
positive capacity, online events need a URL, municipal leaders need a municipality.

## 4. Security model (Phase 1 foundations → Phase 2 enforcement)

* **PII**: AES-256-GCM, random 96-bit IV per value, AAD = `ojetil:pii:v{key}:{field}` so
  ciphertexts cannot be swapped between columns; keyring supports rotation.
* **Duplicates**: HMAC-SHA256 blind index over the normalised national ID (separate key).
* **Passwords**: argon2id (19 MiB, t=2, p=1); dummy-hash comparison against user enumeration.
* **RBAC (P2)**: enforced at middleware, server action/route handler, and UI levels.
* **Audit**: every PII view, status change, export, publish and role change is appended.

## 5. Phase plan

1. **Blueprint & Foundation** ✔ — this commit.
2. **Security, Auth & RBAC core** ✔ — Auth.js, `requirePermission`, audit service, staff login.
3. **Public website & 4-locale system** ✔ — layouts, Home, About, History, News, Events + self-registration.
4. **Member registration portal & status tracker** ✔ — 3-step wizard, encrypted API, photo pipeline, status lookup.
5. **Backoffice / admin dashboard** ✔ — KPIs, verification queue + CSV, 4-locale CMS, attendees, users, audit log.
