# src/modules/consents

The reference implementation of the **module folder convention** described
in `architecture.txt` section 22.6.

## Layout

```
src/modules/consents/
  consents.repository.js   parameterised SQL (the only file that touches the DB)
  consents.service.js      business rules; calls the repository
  consents.routes.js       HTTP router; calls the service
  consents.permissions.js  permission aliases and guards
  consents.test.js         unit tests for the service + permissions
  README.md                this file
```

## How a new feature should adopt the convention

1. Copy this folder and rename.
2. Replace the SQL with the new entity's queries.
3. Replace the business rules in the service.
4. Replace the routes.
5. Update the permission aliases.
6. Update the test file.
7. Mount the router in `src/app.js`:
   `app.use('/api/<feature>', require('./modules/<feature>/<feature>.routes'));`
8. Add a sidebar entry in the relevant EJS sidebar partial.
9. Run `node tests/run.js` to confirm architecture rules still pass.

## Backwards compatibility

For the duration of the migration, the legacy code paths continue to
work. This module's router is NOT yet mounted in `src/app.js`; the
existing `src/application/admissionsFinanceRoutes.js` is still the
production entry point. When the migration is complete, delete that
legacy file (or convert it to `module.exports = require('./modules/consents/consents.routes')`).

## Architecture rules this folder enforces

- `consents.routes.js` never imports a repository directly.
- `consents.repository.js` never imports express.
- All read functions in `consents.repository.js` filter on `TenantId`.
- All state-changing routes use the `audit` middleware.
- The service layer validates inputs and throws on invalid state.

These rules are checked by `tests/architecture/*.test.js`.
