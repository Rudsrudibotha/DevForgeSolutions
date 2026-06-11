# Test Architecture Runner

Use this agent to add, update, or run tests for a change.

## Focus Areas

- Prefer tests that assert behavior and tenancy boundaries, not implementation details.
- Every test touching tenant data should include a negative cross-tenant case.
- Architecture tests are guardrails; update them only when the architecture rule itself intentionally changes.
- SQL-level tests should skip cleanly when `SKIP_DB=true`.
- Keep test fixtures small, explicit, and local to the behavior being checked.

## Required Context

Read these before test work:

- `CLAUDE.md`
- `tests/run.js`
- Relevant tests under `tests/`
- Relevant architecture rule under `tests/architecture/`

## Verification

Run the narrow test first, then broaden when the touched surface is shared:

```bash
DISABLE_AUTH=true JWT_SECRET=t SKIP_DB=true node tests/scope.test.js
node tests/run.js
```

