# AGENTS.md

Repository guidance for AI coding agents working on Kinder Care Hub / DevForge Solutions.

## Project Snapshot

This is a Node 20, Express, mssql, EJS, HTMX, Alpine.js, and Tailwind multi-tenant SaaS for South African pre-schools and day-care centres. The app has three portals:

- `/sms/*` for school users scoped to one school.
- `/parent/*` for parents scoped through `ParentLinks`.
- `/devforge/*` for platform admins with audited cross-school access.

Read `CLAUDE.md` before substantial work. For tenancy-sensitive work, also read `docs/TENANCY.md`.

## Non-Negotiable Rules

- No tenant-table query may run without a `SchoolID` filter unless an admin bypass is explicit and audited.
- School-scoped reads and writes go through `req.schoolDb` / `ScopedDb`.
- Routes stay thin: parse, validate, authorize, delegate. They do not import repositories directly.
- Business services do not make direct global `sql` calls. Use the data layer and scoped DB helpers.
- Every protected state change needs authorization, CSRF where applicable, and awaited `recordWrite`.
- Parent access is cross-school by design and must be enforced through `ParentLinks` joins in the service layer.
- Do not log PII, child names, parent contact details, invoice amounts, tokens, or secrets.
- Keep route ID regexes strict with positive integer patterns like `[1-9]\d*`.
- Preserve accessibility basics: skip link, main landmark, `aria-current`, sensible empty states, and no broken keyboard flows.

## Common Commands

```bash
npm ci
npm run build:css
node tests/run.js
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/scope.test.js
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/architecture/tenant-isolation-on-reads.test.js
```

For local server work:

```bash
DATABASE_URL='sqlserver://user:pass@localhost:1433/db' \
DISABLE_AUTH=true \
JWT_SECRET=test-secret \
SKIP_DB=true \
PORT=3000 \
node src/app.js
```

## Recommended Agent Roles

Use these roles as focused lenses when delegating or reviewing work. Canonical role prompts live in `.agents/`.

- `tenancy-security-reviewer`: reviews tenant isolation, admin bypasses, audit logging, CSRF, and sensitive-data handling.
- `portal-feature-builder`: implements EJS/HTMX/Alpine/Tailwind portal UI changes while preserving SSR and accessibility conventions.
- `data-service-implementer`: works in `src/business/` and `src/data/`, keeping SQL parameterized and tenancy-safe.
- `test-architecture-runner`: adds or updates focused tests and runs the smallest meaningful verification set.

## Verification Expectations

Run the smallest test set that can catch the change:

- Tenancy/data changes: `node tests/scope.test.js` plus relevant `tests/architecture/*.test.js` and feature tests.
- Route or SSR form changes: relevant integration tests plus CSRF and access-matrix architecture tests when applicable.
- Styling-only changes: `npm run build:css` and inspect responsive markup paths.
- Broad changes: `node tests/run.js`.

If a test cannot be run locally, report exactly why.

