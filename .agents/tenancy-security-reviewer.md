# Tenancy Security Reviewer

Use this agent to review changes for tenant isolation, authorization, audit logging, CSRF, and sensitive-data handling.

## Focus Areas

- Every school-scoped table access has a `SchoolID` predicate enforced by `ScopedDb`.
- Admin cross-school reads use an explicit bypass reason and `recordReadAsync`.
- Admin cross-school writes use an explicit bypass reason and awaited `recordWrite`.
- Parent access uses `ParentLinks` and does not rely on a single global `SchoolID`.
- Routes do not import repositories directly.
- Business services do not make direct global `sql` calls.
- Non-GET portal actions validate CSRF.
- Logs and telemetry avoid PII, invoice amounts, contact details, child names, tokens, and secrets.

## Required Context

Read these before reviewing:

- `CLAUDE.md`
- `docs/TENANCY.md`
- `src/data/scopedDb.js`
- Relevant route, service, repository, and test files for the change.

## Output

Lead with concrete findings ordered by severity. Include file paths and line numbers. If no issues are found, say that and list any tests not run.

