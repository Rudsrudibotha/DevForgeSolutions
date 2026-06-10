# Kinder Care Hub / DevForge Solutions

A multi-tenant SaaS for South African pre-schools / day-care centres: parent invoicing, attendance, registrations, messaging, staff leave, payslips, and bank-statement reconciliation. Three portals share one EJS-rendered UI with a strict multi-tenant data layer.

## Stack

- **Backend**: Node.js 20 (LTS), Express, mssql (Azure SQL)
- **Frontend**: EJS server-side rendering, HTMX 2.x, Alpine.js, Tailwind CSS
- **Observability**: Application Insights
- **Deployment**: Azure App Service Linux, Application Settings, Key Vault for secrets
- **Auth**: JWT (cookie + bearer), Microsoft + Google OAuth, AAD for DevForge admins
- **Tests**: ~480 assertions, 21 test suites, runs without a DB (skips SQL)

## The three portals

| Portal | Path | Who | Scoping |
|---|---|---|---|
| Parent | `/parent/*` | Family members of children | Cross-school via `ParentLinks`; each child only visible in the school the parent is linked to |
| School | `/sms/*` | School admins | `SchoolID` from `req.schoolDb`; every query has `WHERE SchoolID = @schoolId` enforced by `ScopedDb` |
| DevForge admin | `/devforge/*` | Platform staff | Cross-school; every read/write to a foreign school is recorded in `AuditLog` |

## Multi-tenant security

The core invariant: **no query against a tenant table runs without a `SchoolID` filter**, unless explicitly bypassed by an admin (which writes an audit row).

Read `docs/TENANCY.md` for the full model. The `ScopedDb.guardTableScope(sqlText)` function throws if a query references a registered scoped table without the required filter. Tests in `tests/scope.test.js` cover the guard.

## Quick start

```bash
# Install
npm ci

# Build CSS
npm run build:css

# Run with the test DB-less config (still requires SQL for some routes)
DATABASE_URL='sqlserver://user:pass@localhost:1433/db' \
  DISABLE_AUTH=true \
  JWT_SECRET=test-secret \
  SKIP_DB=true \
  PORT=3000 \
  node src/app.js
```

Open `http://localhost:3000`. With `DISABLE_AUTH=true` and `X-Test-Role: parent|school|admin` you can test any role without a JWT.

## Azure deployment

See `docs/AZURE_DEPLOYMENT.md`. Required env vars: `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, OAuth client IDs/secrets, `APPINSIGHTS_INSTRUMENTATIONKEY`, `BASE_URL`. App Service Health Check path: `/health`.

## Tests

```bash
node tests/run.js
```

The runner spawns the server, then runs 21 test files in order. SQL-level tests skip automatically when `SKIP_DB=true`. CI should run with a real DB.

## Project layout

```
src/
  app.js                # Express bootstrap, helmet, CSP, CORS, routes
  application/          # Route modules (one per feature area)
    portal/             # New SSR portal routes (parent/sms/devforge)
    api/                # Legacy JSON API
  business/             # Service layer (per feature + admin*)
  data/                 # Repositories + ScopedDb + db pool
  middleware/           # auth, CSRF, scope, audit
  observability/        # Application Insights setup
  security/             # OAuth + AAD helpers
  views/                # EJS templates
    layouts/            # Master layout
    partials/           # header, footer, sidebar, palette, empty states, skeleton
public/                 # Static assets (css, js, palette-registry, vendor)
db/
  schema.sql            # Idempotent table + index + seed
docs/                   # AZURE_DEPLOYMENT, API, TENANCY
tests/                  # 21 test files
```

## API

See `docs/API.md`. JSON API lives under `/api/*` and is used by the legacy JS frontend and the mobile apps.

## Tenancy

See `docs/TENANCY.md`. The short version: every school-scoped table has a `SchoolID` column and every query has `WHERE SchoolID = @schoolId`. Admin cross-school access goes through `bypass('reason')` + `recordRead`/`recordWrite`.

## Conventions

- **No global `sql` direct calls** in business services. Use `ScopedDb` so the tenancy guard runs.
- **Server-rendered HTMX**, not SPA. SSR keeps tenancy auditable and pages work without JS.
- **Idempotent POSTs** where possible. The parent pay flow re-clicks return `alreadyPending` instead of creating a new pending payment.
- **Strict route regexes** (`[1-9]\d*`) for positive-int IDs.
- **CSRF** via double-submit cookie. Every POST needs `X-CSRF-Token` matching the `csrf-token` cookie.
- **Cache-Control**: public assets 1h + SWR 24h, SSR/API/auth no-store.
- **Audit on writes**: state changes await `recordWrite` (hard-fail if it can't audit). Reads use `recordReadAsync` (fire-and-forget).
- **Skip link + main landmark + aria-current + aria-hidden** on every page.

## Changelog

See `CHANGELOG.md`.

## License

Proprietary. All rights reserved.
