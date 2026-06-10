# Tenancy Rules

Kinder Care Hub / DevForge is a multi-tenant SaaS. Every school is a tenant. Tenancy is enforced at the **data access layer** (not just at the route layer) so that a missed route guard cannot leak data.

## The three rules

1. **Every school-scoped table has a `SchoolID` column.**
2. **Every query against a school-scoped table is wrapped in `WHERE SchoolID = @schoolId`.**
3. **Every cross-school read/write by an admin is recorded in `AuditLog`.**

## Scoped tables

The list of tables that participate in tenancy is registered in `src/data/scopedDb.js` `SCOPED_TABLES`. As of this writing:

- `Students`
- `Families`
- `Classes`
- `Invoices`
- `Transactions`
- `BankStatements`
- `BankStatementTransactions`
- `Employees` (staff)
- `Leaves`
- `Payslips`
- `BillingCategories`
- `Attendance`
- `Conversations` (messaging)
- `Messages` (messaging)
- `ConsentRequests`
- `StudentConsents`
- `ReenrolmentRequests`
- `BehaviourLogs`
- `AcademicNotes`
- `Documents`
- `CreditNotes`
- `Discounts`
- `PromiseToPay`
- `InvoiceTemplates` (school-owned)
- `SchoolRegistrationRequests` (admin-only)
- `AuditLog` (admin-only)
- `PlatformSettings` (admin-only)

**To add a new table to tenancy:** edit `SCOPED_TABLES` in `src/data/scopedDb.js`. The scope guard will then reject any query against that table that doesn't include a `SchoolID` filter.

## How the guard works

`ScopedDb.request()` returns a `sql.Request` from the mssql pool. Before any query, call `sdb.guardTableScope(sqlText)`. The guard:

1. Tokenizes the SQL and finds every table reference
2. For each table in `SCOPED_TABLES`:
   - If the table is in the FROM clause but NOT in a `WHERE SchoolID = @schoolId` filter, **throw**
   - This catches: missing WHERE, WHERE with wrong column, WHERE on alias without alias resolution
3. For admin: the same check applies unless `sdb.bypass('reason')` was called. The reason is recorded.

Example:

```js
const sdb = new ScopedDb(req.user);
const request = await sdb.request();
request.input('schoolId', sql.Int, req.user.schoolId);
sdb.guardTableScope(`
  SELECT s.StudentID, s.FirstName, s.LastName
  FROM Students s
  WHERE s.SchoolID = @schoolId AND s.IsActive = 1
`);  // OK
sdb.guardTableScope(`SELECT * FROM Students`);  // THROWS: missing SchoolID
```

## Bypass for cross-school access

Admin cross-school reads use `bypass('reason')` + `recordReadAsync` (fire-and-forget):

```js
const sdb = new ScopedDb(adminUser);
sdb.bypass('admin school search across all schools');
// ...build query without SchoolID filter...
await sdb.audit.recordReadAsync(adminUser, schoolId, 'School', schoolId, { reason: 'search' });
```

Admin cross-school **writes** use `bypass` + `recordWrite` (awaited, hard-fail):

```js
await sdb.audit.recordWrite(adminUser, schoolId, 'School', schoolId, 'SUSPEND',
  { SubscriptionStatus: 'Active' },
  { SubscriptionStatus: 'Suspended' },
  { reason: 'non-payment' });
```

The write is awaited so the request fails if the audit row cannot be written — that is intentional, we want a hard failure when we cannot prove who did what.

## Parent tenancy

Parents can be linked to children in **multiple schools** (e.g. a parent with a child at School A and a child at School B). The `ParentLinks` table is the source of truth:

```
ParentLinks: UserID, SchoolID, FamilyID, StudentID, IsActive
```

When a parent logs in, `loadUser` resolves their `activeSchoolId` from the most recently active ParentLink. The parent portal can only see:

- Children they are linked to (via `ParentLinks`)
- Invoices/payments for those children (via `FamilyID` from `ParentLinks` → `Invoices.FamilyID`)
- In the school their `activeSchoolId` is set to (switchable via the parent dashboard)

**Parent tenancy check is enforced in the service layer, not the data layer** — parents legitimately cross schools, so a `SchoolID` filter would break them. The check is: "is this parent linked to this student/family?" with a SQL JOIN.

## Adding a new service

1. Inject `req.user` (from middleware) into your service method
2. For school-only data: use `ScopedDb` with the user's `schoolId`
3. For parent data: use `ParentRepository` to check the link, then issue the query
4. For admin: use `bypass` + `recordRead`/`recordWrite` for the audit trail

If you forget the scope guard, the guard will throw on the first query. If you forget the audit log on a write, the test suite will fail because the test asserts that a write was audited.

## Testing tenancy

- `tests/scope.test.js` — unit tests for `ScopedDb` (11 cases)
- `tests/parentTenancy.test.js` + `parentTenancyDb.test.js` — parent cross-school
- `tests/admin*Db.test.js` — DevForge cross-school writes
- `tests/devforge*Route.test.js` — DevForge route-level enforcement
- `tests/devforgeAudit.test.js` — audit log self-audits views

Every test that touches tenant data must verify **negative cases** (cross-tenant request is denied, not silently allowed) in addition to the happy path.

## Common mistakes

1. **Using the global `sql` directly** without `ScopedDb`. The scope guard won't run.
2. **Adding a new table without registering it in `SCOPED_TABLES`.** Queries will succeed without any tenancy check.
3. **Forgetting `recordWrite` for state changes.** The test suite catches this; the production system silently leaks.
4. **Using `UserID` in queries where `SchoolID` is required.** A user can be linked to multiple schools (parent) so `UserID` ≠ tenant.
5. **Building SQL by string concatenation.** Always use `request.input('param', sql.Type, value)`. Concatenated values bypass parameterization and can introduce SQL injection.

## Why we don't use row-level security

SQL Server RLS is a valid alternative but:

- It requires per-connection context (`SET CONTEXT_INFO`), which mssql doesn't surface cleanly
- It makes schema changes harder (you can't add a constraint without dropping the policy)
- It hides the tenancy from the application — `ScopedDb` makes tenancy visible and reviewable
- It doesn't cover cross-school admin reads with audit (RLS would deny them; we need to *allow and audit* them)

The data-layer guard is more verbose but more auditable.
