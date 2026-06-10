# Changelog

All notable changes to Kinder Care Hub / DevForge Solutions are documented here. Versions follow semver. The current line is **1.0.0** — a complete SSR multi-tenant SaaS shell.

## [1.0.0] — 2026-06-09

### Added — multi-tenant data layer
- `ScopedDb` with `guardTableScope` regex guard. Throws if a query against a registered scoped table doesn't include `WHERE SchoolID = @schoolId`.
- `bypass('reason')` for admin cross-school reads, paired with `recordReadAsync` (fire-and-forget audit).
- `recordWrite` (awaited) for state-changing admin actions; hard-fails if the audit row can't be written.
- `SCOPED_TABLES` registry covering 25 tenant tables.
- `PlatformSettings` key-value table for DevForge platform toggles (maintenance mode, signups, parent pay, school cap), seeded with 4 defaults.
- `AuditLog` self-audits: every view of the audit log writes its own row, creating a chain of custody.

### Added — School Management Dashboard (10 screens)
- Students (list/detail/edit/new) — search, filter by class, soft delete, OUTSTANDING balance.
- Families (list/detail/edit/new) — search, child count, balance.
- Classes (list/detail/edit/new) — grade, room, capacity, teacher, student count.
- Attendance (sheet per class) — bulk save, history view.
- Invoices (list/detail/new) — outstanding filter, bulk generate per class/month, status badges.
- Payments (list/new) — allocation modal, receipt numbers, method filters.
- Bank statements (list/detail/new) — CSV upload, line-by-line reconciliation against transactions.
- Staff (list/detail) — leave requests, payslips, departments.
- Reports — by-month, by-class, outstanding, exports.
- Settings — school details, billing categories, business rules.

### Added — DevForge admin (5 screens)
- Dashboard — platform KPIs (school count, active users, revenue 30d, audit events).
- Schools — list with search + status filter, detail with audit, suspend/activate action (audited).
- Users — global search across roles, enable/disable (audited), impersonation notice pointing to API.
- Payments — cross-school ledger with 4 KPIs (collected 30d, unallocated total, pending parent total, unallocated count) + 6 filter dimensions + load-more pagination.
- Audit log — 6 filters (actor email, school, action, resource type, date), self-audits, expandable JSON payload rows.
- Settings + observability — health badge (live), platform info card (version, node, env, uptime, PID, deps, started), 4 platform toggles with inline save, env table with secret redaction, recent events feed.

### Added — Parent portal
- Dashboard — children cards, recent messages, unread count, KPIs (outstanding, pending payments).
- Child detail — invoices, attendance, consents tabs.
- Invoices — list, filter by status/school, mark as paid (idempotent → PendingPayment).
- Messages — split-pane chat, list + detail + reply with CSRF, role-aware permission (read-only for notification threads).
- Consent — read-only display with badge status.

### Added — UX layer
- Empty states — 4 reusable partials (default, skeleton-table, skeleton-kpis, skeleton-detail) with contextual icon + title + desc + CTA.
- Skeletons — `htmx-indicator` rows on DevForge list views, `inline` mode for table cells.
- Command palette (Ctrl+K / Cmd+K, or `/`) — Alpine component with typeahead, arrow keys, enter, esc, portal-aware registry (parent/sms/devforge).
- Keyboard shortcuts — Gmail-style `g+key` for 23 portal-aware destinations, `?` for help, mounted in footer with "Press ? for shortcuts" link.
- Mobile nav drawer — slide-in panel triggered by `md:hidden` header button, includes full sidebar nav, backdrop click + Esc to close, hamburger↔X icon swap.
- Accessibility — skip-to-main-content link, `lang="en-ZA"`, `<main role="main" tabindex="-1">`, `aria-current="page"` on active nav, `aria-label` on sidebars and icon buttons, `aria-hidden="true"` on decorative SVGs, `role="dialog" aria-modal="true"` on modals, `.sr-only` + `.focus:not-sr-only` CSS.

### Added — Performance + reliability
- Cache headers — public assets `max-age=3600` + SWR=86400, SSR/API/auth `no-store` + `no-cache` + `must-revalidate`. `express.static` keeps ETag + Last-Modified defaults.
- 13 new covering indexes (Students 2, Invoices 2, Transactions 2, AuditLog 1, Users 1, ParentLinks 1, BankStatements 1, BankStatementTransactions 1, Employees 1, Conversations 1) with INCLUDE columns for covering scan.
- 1 filtered partial index `IX_Transactions_Allocation_School` for the DevForge unallocated KPI.
- Database connection pool + query timeouts (`pool.max=10`, `idleTimeoutMillis=30000`, `connectionTimeout=15000`, `requestTimeout=60000`) with env overrides.

### Added — Documentation
- `docs/API.md` — auth, tenancy model, portal + JSON API, errors, idempotency, versioning.
- `docs/TENANCY.md` — three rules, ScopedDb guard, bypass patterns, parent tenancy, common mistakes, why-not-RLS.
- `README.md` — quick start, conventions, project layout.
- `CHANGELOG.md` — this file.

### Tests
- 21 test files, ~480 assertions, 0 failures.
- 28 SQL-level test suites skip cleanly without a DB.
- Coverage: scope guard (11 unit), parent tenancy (10 route + 10 SQL), DevForge admin (73 route + 59 SQL), shared empty states (16), command palette (14), keyboard shortcuts (9), accessibility (16), mobile responsive (12), cache headers (13), covering indexes (7), database pool (7), docs (10).
