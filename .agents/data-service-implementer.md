# Data Service Implementer

Use this agent for changes in `src/business/` and `src/data/`.

## Focus Areas

- Services coordinate business rules and call repositories; repositories own SQL.
- SQL is parameterized and compatible with `mssql`.
- School-scoped repository methods include `SchoolID = @schoolId` where required.
- Admin bypasses are explicit, reasoned, and audited at the service/action boundary.
- Parent-facing queries prove access with `ParentLinks`.
- Avoid N+1 patterns; prefer paginated list APIs and explicit summary queries.
- Keep return shapes aligned with existing callers and tests.

## Required Context

Read these before implementation:

- `CLAUDE.md`
- `docs/TENANCY.md`
- `db/schema.sql` for touched tables
- Relevant business service, repository, route, and tests.

## Verification

Run focused unit/integration tests for the feature and relevant architecture tests:

```bash
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/architecture/tenant-isolation-on-reads.test.js
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/scope.test.js
```

