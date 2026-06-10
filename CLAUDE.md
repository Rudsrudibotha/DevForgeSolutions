# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kinder Care Hub / DevForge Solutions — a multi-tenant SaaS for South African pre-schools / day-care centres (parent invoicing, attendance, registrations, messaging, staff leave, payslips, bank-statement reconciliation). Three portals share one EJS-rendered UI over a strict multi-tenant data layer.

Node 20 / Express / mssql (Azure SQL) / EJS + HTMX 2.x + Alpine.js / Tailwind / Application Insights. Deployed to Azure App Service Linux.

## Daily commands

```bash
# Install (also runs scripts/copy-vendor.js)
npm ci

# Build Tailwind CSS to public/styles/app.css
npm run build:css

# Watch CSS during frontend work
npm run watch:css

# Local server (no DB, auth bypassed for testing)
DATABASE_URL='sqlserver://user:pass@localhost:1433/db' \
  DISABLE_AUTH=true \
  JWT_SECRET=test-secret \
  SKIP_DB=true \
  PORT=3000 \
  node src/app.js
# or: npm run dev   (nodemon, with the env above)

# Three independent login shells (each is configured by public/login.js):
#   http://localhost:3000/devforge-login
#   http://localhost:3000/school-login
#   http://localhost:3000/parent-login
# With DISABLE_AUTH=true the X-Test-Role: parent|school|admin header also works.

# Full test suite (~480 assertions, 21 test files, auto-skips SQL tests when SKIP_DB=true)
node tests/run.js

# Single test file (e.g. one tenancy test)
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/scope.test.js

# Run a single architecture rule test (CI-style guardrails live in tests/architecture/)
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/architecture/tenant-isolation-on-reads.test.js
```

There are no separate `lint` or `format` scripts — the only build step is Tailwind. CI is `.github/workflows/main_devforgesolutions-saas-app-24.yml`.

## Architecture in one screen

Strict three-layer separation, plus orthogonal middleware/security/observability:

```
HTTP  →  src/application/   (route modules — thin: parse, validate, delegate)
       →  src/business/      (services — only place that talks to repos)
       →  src/data/          (repositories — parameterised SQL; ScopedDb enforces tenancy)
       →  src/middleware/    (auth, CSRF, audit, scope, rate limit)
       →  src/security/      (OAuth, JWT, AAD, school permissions, test-auth shim)
       →  src/observability/ (Application Insights)
       →  src/views/         (EJS templates under src/views/{sms,devforge,parent,partials,errors,layouts})
```

**Two parallel routings**:
- The **legacy JSON API** under `/api/*` still powers `public/*.html` (the original SPA). The original un-prefixed filenames are kept for back-compat; the canonical copy is the prefixed one (e.g. `sms-messaging-routes.js` vs `messagingRoutes.js`).
- The **new SSR portal** at `/` (mounted in `src/app.js` via `src/application/portal/`) renders the three dashboards: `/auth/*`, `/sms/*`, `/parent/*`, `/devforge/*` through EJS. `src/application/portal/render.js` registers view engine and locals.

Route file naming convention (used in `src/app.js` and `src/application/portal/`):
- `devforge-*.js` → DevForge admin only
- `sms-*.js` → School Management only
- `parent-*.js` → Parent only
- `all-dashboards-*.js` → shared across all three

## The non-negotiable invariant: tenancy

**No query against a tenant table runs without a `SchoolID` filter**, unless explicitly bypassed by an admin (which writes an audit row). The full model is `docs/TENANCY.md` and the `SCOPED_TABLES` set is in `src/data/scopedDb.js`.

Every school-scoped read goes through `req.schoolDb` (a `ScopedDb` instance attached by `src/middleware/scopeToSchool.js`). `req.schoolDb.guardTableScope(sqlText)` throws if a query references a registered scoped table without `WHERE SchoolID = @schoolId`. The guard fires unless `NODE_ENV === 'production'` and `SCOPE_GUARD !== 'true'` (production runs the guard only on explicit opt-in to avoid hot-path overhead; dev always runs it).

Admin cross-school reads: `req.schoolDb.bypass('reason')` + `recordReadAsync` (fire-and-forget).
Admin cross-school **writes**: `bypass` + `recordWrite` (awaited, hard-fail if the audit row can't be written — intentional).

Parents are cross-school by design (a parent can have children at multiple schools), so parent tenancy is enforced in the **service layer** via `ParentLinks` joins — not via `SchoolID` filtering. See `docs/TENANCY.md` § "Parent tenancy".

The 9-step access check that every protected action runs in order: `authenticateToken` → `sessionContext.IsSchoolUser` → `canTenantUseFeature` (subscription) → `canTenantUseFeature` (entitlement) → `canTenantUseFeatureWithinLimit` → `requireSchoolPermission` → service-layer tenant filter → `canUserAccessConversation` (KCH only) → action + `recordWrite`. The order is documented in `architecture.txt` § 18e.

## Auth model

JWT carried in either `Authorization: Bearer` or the `kch_token` HTTP-only cookie (set via `sendAuthCompletion`). Three roles: `admin` (DevForge), `school` (SMS), `parent`. Each role has its own login URL and per-dashboard tenant resolution:

- School: `req.user.schoolId` (single-tenant).
- Admin: cross-tenant via `bypass()` + audit; AAD (`/auth/azure`) is the only admin OAuth.
- Parent: `req.user.activeSchoolId` resolved from the most recently active `ParentLinks` row; can switch via the parent dashboard. The verification flow (`src/business/parentVerificationService.js`) issues email + SMS challenge codes and 24h magic links before granting access.

OAuth providers: AAD (admin only, gated by `isAadAdminEmailAllowed` / `isAadAdminObjectIdAllowed`), Microsoft, Google. State is signed; callbacks verify the ID token's signature + claims + audience.

CSRF: double-submit cookie (`kch_csrf` set by `issueCsrf`, validated by `verifyCsrf` on every non-GET). Htmx auto-includes the header.

## Testing approach

`tests/run.js` boots the server (`SKIP_DB=true`, `DISABLE_AUTH=true`, `PORT=3001`) and runs three groups:

1. **Unit** — `scope.test.js` (ScopedDb guard), no server needed.
2. **Architecture** — `tests/architecture/*.test.js` are static-analysis rules that grep the tree: `no-repos-in-routes.test.js` (route files must not import repositories), `no-express-in-data.test.js` (data layer must not import express), `tenant-isolation-on-reads.test.js`, `csrf-on-portal-writes.test.js`, `audit-on-state-changes.test.js`, `parent-gate.test.js`, `finance-wiring.test.js`, `access-matrix.test.js`. These are the project's most important guardrails.
3. **Integration** — feature files (`tenancy`, `invoices`, `students`, `families`, `attendance`, `payments`, `bankStatements`, `staff`, `reports`, `settings`, `devforgeSchools`, `devforgeUsers`, `devforgePayments`, `devforgeAudit`, `devforgeSettings`, `parentMessages`, `commandPalette`, `keyboardShortcuts`, `accessibility`, `mobileResponsive`, `cacheHeaders`, `coveringIndexes`, `databasePool`, `docs`, `healthEndpoint`, `notFound`, `emptyStates`).
4. **SQL-level** — `*Db.test.js` files, all auto-skip when `SKIP_DB=true`. CI runs these against a real DB.

Every test that touches tenant data must also assert a **negative case** (cross-tenant request is denied, not silently allowed) — the project enforces this convention.

## Things that always apply

- **Follow existing code style.** Match the surrounding comment density, naming, and idioms.
- **Keep changes scoped.** Don't reformat adjacent code.
- **Verify server-side authorization and tenant isolation** on every new/modified route. The architecture tests will fail the build if you don't.
- **Avoid N+1 request/query patterns.** Prefer paginated list APIs with safe summary includes.
- **Treat Kinder Care Hubs data as sensitive childcare information** (POPIA in ZA). Do not log child names, parent contact info, invoice amounts, or PII to Application Insights.
- **No direct `sql` calls in business services** — use `ScopedDb` so the tenancy guard runs. Routes never import repositories directly (`tests/architecture/no-repos-in-routes.test.js` enforces this).
- **Strict route regexes** (`[1-9]\d*`) for positive-int IDs.
- **CSRF** on every non-GET; htmx ships the header automatically.
- **Cache-Control**: public assets 1h + SWR 24h, SSR/API/auth no-store.
- **Audit on writes** — `recordWrite` is awaited; reads use `recordReadAsync`.
- **Skip link + main landmark + aria-current + aria-hidden** on every page.
- **Idempotent POSTs** where reasonable (e.g. parent pay re-clicks return `alreadyPending`).

## Where to look

- `docs/TENANCY.md` — tenancy model, `ScopedDb`, parent cross-school rules, common mistakes.
- `docs/API.md` — JSON API reference.
- `docs/AZURE_DEPLOYMENT.md` — App Service, Key Vault, Application Settings, schedulers, health check.
- `docs/ANDROID_PLAN.md` / `IOS_PLAN.md` — mobile app plans.
- `architecture.txt` — full file-by-file map and key data flows (parent verification, bank reconciliation, AI chat, auto-invoicing, permission check).
- `db/schema.sql` — idempotent DDL; the canonical list of tables and SaaS features.
- `CHANGELOG.md` — release notes (1.0.0 is the current line).
- `.claude/`, `AGENTS.md`, `ClaireKnowledge/` — project-level guidance (check for updates).

The shared GitHub folder's `CLAUDE.md` adds: use `AGENTS.md` and `ClaireKnowledge/` for project guidance, and for Kinder Care Hubs work read `kinder_care_hubs_rules.md`, `database_security.md`, `server_requests_api_design.md`, `review_checklists.md`. Those files are not in this repo — they're referenced from the parent GitHub folder.
