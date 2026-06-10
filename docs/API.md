# API Reference

The Kinder Care Hub / DevForge SaaS exposes a server-rendered portal (HTMX + EJS) plus a JSON API for the legacy JS frontend and the mobile apps.

## Authentication

Every request to an authenticated endpoint must include either:

- A session cookie set by `/auth/login` (HTML portal) or
- An `Authorization: Bearer <jwt>` header (JSON API, mobile)

JWTs are issued by:
- `/auth/login` (form post, sets cookie + returns token)
- `/auth/microsoft/callback` (OAuth, parent + school)
- `/auth/google/callback` (OAuth, parent + school)
- `/auth/azure/callback` (AAD, admin only)

JWTs are signed with `JWT_SECRET` (env). Tokens are short-lived (8h) and refresh is not implemented — re-login after expiry.

## Tenancy model

The system has three roles:

| Role | Source | Can access |
|---|---|---|
| `admin` | `Users.Role = 'admin'` | All schools. Every read/write of a foreign school is recorded in `AuditLog` |
| `school` | `Users.Role = 'school'` | One school (their `activeSchoolId`). All DB calls scoped to that school |
| `parent` | `Users.Role = 'parent'` | Their own family, plus any school where they have a `ParentLinks` row. Cross-school tenancy enforced by `ParentLinks` |

Every authenticated DB call goes through `ScopedDb` which:

1. Validates the SQL text references a table in `SCOPED_TABLES`
2. Asserts the SQL has a `WHERE SchoolID = @schoolId` filter
3. Rejects admin cross-school reads unless `bypass('reason')` is called
4. Records the read in `AuditLog` (fire-and-forget) for cross-school admin access
5. Records the write in `AuditLog` (awaited, hard-fail) for state-changing actions

To add a new table to the tenancy system, register it in `src/data/scopedDb.js` `SCOPED_TABLES`.

## Portal routes (HTML, EJS-rendered)

All portal routes are SSR. HTMX partials are used for in-place updates.

### Common middleware
- `requireAuth` — loads `req.user` from JWT or test header
- `requireRole` — enforces role
- `scopeToSchool` — attaches `req.schoolDb` for school-scoped routes
- `verifyCsrf` — checks `X-CSRF-Token` header on POSTs

### Parent (`/parent/*`)
- `GET /parent` — dashboard
- `GET /parent/child/:id` — child detail
- `GET /parent/invoices` — invoice list
- `POST /parent/invoices/:id/pay` — mark invoice as paid (idempotent, sets `PendingPayment`)
- `GET /parent/messages` — conversation list
- `GET /parent/messages/:id` — single conversation
- `POST /parent/messages/:id/reply` — send reply

### School (`/sms/*`)
All scoped to `req.schoolDb.SchoolID`.
- `GET /sms` — dashboard with KPIs
- `GET /sms/students` `/new` `/:id` `/:id/edit` — students CRUD
- `GET /sms/families` `/new` `/:id` `/:id/edit` — families CRUD
- `GET /sms/classes` `/new` `/:id` — classes CRUD
- `GET /sms/attendance` `?classId=&date=` — attendance sheet
- `POST /sms/attendance` — bulk save
- `GET /sms/invoices` `/new` `/:id` — invoices
- `GET /sms/payments` `/new` `/partials/table` — payments
- `GET /sms/bank-statements` `/new` `/:id` — bank reconciliation
- `GET /sms/staff` `/new` `/:id` — staff CRUD
- `GET /sms/reports` — reports
- `GET /sms/settings` — school settings

### DevForge admin (`/devforge/*`)
- `GET /devforge` — platform dashboard
- `GET /devforge/schools` `/new` `/:id` — schools CRUD
- `POST /devforge/schools/:id/status` — suspend/activate
- `GET /devforge/users` `/partials/list` `/:id` — global user search
- `POST /devforge/users/:id/active` — enable/disable
- `GET /devforge/payments` `/partials/table` — cross-school ledger
- `GET /devforge/audit` `/partials/table` — audit log
- `GET /devforge/settings` — platform observability
- `POST /devforge/settings/:key` — update platform setting (CSRF + regex-restricted key)

## JSON API (`/api/*`)

The legacy API uses Express + JWT + jsonwebtoken. Each module owns its own routes.

### Auth
- `POST /api/auth/login` — exchange credentials for JWT
- `POST /api/auth/refresh` — re-issue (not implemented, re-login required)

### Schools (admin)
- `GET /api/schools` — list all schools
- `POST /api/schools` — create school
- `GET /api/schools/:id` — get school
- `PUT /api/schools/:id` — update school
- `DELETE /api/schools/:id` — delete school (soft delete)

### Families (school)
- `GET /api/families` — list families (scoped)
- `POST /api/families` — create
- `GET /api/families/:id`
- `PUT /api/families/:id`
- `DELETE /api/families/:id` (soft delete)

### Students (school)
- `GET /api/students` — list (scoped)
- `POST /api/students` — create
- `GET /api/students/:id`
- `PUT /api/students/:id`
- `DELETE /api/students/:id` (soft delete)

### Invoices (school)
- `GET /api/invoices`
- `POST /api/invoices` — create single
- `POST /api/invoices/generate` — bulk generate for class/month
- `GET /api/invoices/:id`
- `PUT /api/invoices/:id`
- `DELETE /api/invoices/:id`

### Transactions (school)
- `GET /api/transactions` — payment list
- `POST /api/transactions` — record payment
- `GET /api/transactions/:id`
- `PUT /api/transactions/:id/allocate` — allocate to invoice
- `DELETE /api/transactions/:id` (soft delete)

### Bank statements (school)
- `GET /api/bank-statements`
- `POST /api/bank-statements` — upload CSV
- `GET /api/bank-statements/:id`
- `POST /api/bank-statements/:id/reconcile` — match bank lines to transactions

### Staff / HR (school)
- `GET /api/employees` `POST /api/employees` `GET /api/employees/:id` `PUT /api/employees/:id` `DELETE /api/employees/:id`
- `GET /api/leaves` `POST /api/leaves` `GET /api/leaves/:id` `PUT /api/leaves/:id/approve` `PUT /api/leaves/:id/reject`
- `GET /api/payslips` `POST /api/payslips` `GET /api/payslips/:id`

### Reports (school)
- `GET /api/reports/run?type=...&from=...&to=...` — run report
- `GET /api/export/invoices?from=&to=` — CSV export

### Attendance (school)
- `GET /api/attendance?classId=&date=`
- `POST /api/attendance` — bulk save

### Classes (school)
- `GET /api/classes`
- `POST /api/classes`
- `GET /api/classes/:id`
- `PUT /api/classes/:id`

### Billing categories (school)
- `GET /api/billing-categories`
- `POST /api/billing-categories`
- `PUT /api/billing-categories/:id/toggle` — enable/disable

### Features + Admissions + HR + Platform
- `GET /api/features` — feature flags
- `GET /api/school-features?schoolId=` — school's enabled features
- `PUT /api/school-features/:id/toggle`
- `GET /api/platform/templates` — rollover templates
- `POST /api/hr/leave-year-end` — year-end rollover
- `GET /api/registrations` `POST /api/registrations` — registration requests
- `GET /api/faults` `POST /api/faults` — fault reports
- `POST /api/email/send` — transactional email
- `POST /api/messaging/parent/send` — parent sends message
- `GET /api/messaging/parent/conversations`
- `GET /api/messaging/parent/conversations/:id/messages`
- `POST /api/messaging/parent/conversations/:id/messages`
- `GET /api/messaging/school/targets` `GET /api/messaging/school/contacts`
- `POST /api/messaging/school/send` `POST /api/messaging/school/direct`
- `GET /api/messaging/school/conversations` `GET /api/messaging/school/conversations/:id/messages`
- `POST /api/messaging/school/conversations/:id/messages`
- `GET /api/messaging/devforge/conversations`
- `POST /api/messaging/devforge/send`
- `GET /api/messaging/devforge/conversations/:id/messages`
- `POST /api/messaging/devforge/conversations/:id/messages`

### Audit
- `GET /api/audit?schoolId=&actorUserId=&action=&resourceType=&from=&to=&page=&pageSize=` — query audit log
- `GET /api/audit/:id` — get single audit event (returns full payload)

## Errors

All API errors return JSON `{ error: "message" }`. HTTP status follows REST conventions:
- 400 — bad request (validation)
- 401 — no auth
- 403 — auth but wrong role / CSRF
- 404 — not found
- 409 — conflict (unique constraint)
- 500 — server error

## Idempotency

- `POST /parent/invoices/:id/pay` — idempotent. Re-clicking returns `alreadyPending` instead of creating a new pending payment.
- `POST /api/transactions` — caller-supplied `idempotencyKey` (request header) dedupes.

## Rate limiting

Not implemented. Production deployments should put Azure API Management in front to enforce quotas.

## Versioning

No API version prefix. Breaking changes are tracked in `CHANGELOG.md` (TBD). New endpoints may be added freely; existing endpoints' contracts are stable.
