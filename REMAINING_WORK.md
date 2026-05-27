# Remaining Work and Test Coverage

## Completed validation
- Verified admin and school login via `POST /api/users/login`.
- Confirmed health endpoint and database connectivity.
- Validated major `GET` resource endpoints for schools, families, students, employees, invoices, transactions, bank statements, attendance, classes, features, dashboard, audit, reports, exports, leaves, and school-feature endpoints.
- Verified admin-only and school-only authorization behavior for several endpoints.
- Confirmed `POST /api/features/invoice-templates` success and valid business-level validation for `POST /api/features/credit-notes`.
- Confirmed payment initiation returns an expected configuration error when payment provider is unset.

## Still needs testing

### 1. Parent login and parent routes
- `POST /api/users/login` with `loginType: parent` after auth rate-limit resets.
- `GET /api/parent/students`
- `GET /api/parent/invoices`
- `GET /api/parent/balance`

### 2. Create / update / delete workflows
- Families: create, update
- Students: create, update, inactivate
- Employees: create, update
- Classes: create, update
- Billing categories: create, update, delete
- Bank statements: upload, reconciliation, allocation, reallocation
- Attendance: create records, bulk records
- Invoices: create, update, delete, flag overdue, generate monthly
- Payslips: create, update, finalize
- Finance period locks: create, reopen
- Admissions: create, update status
- Consent: create, respond
- Adjustments: create
- Refunds: create, approve, complete
- Registration fees: create, pay
- Leave: create, review
- Feature flows: behaviour, academic notes, student/staff documents, discounts, promise-to-pay, credit notes
- School management: create, update, suspend, activate
- Platform templates: create, update, apply
- Rollover enrollments: bulk process
- HR roles: create, update, assign, remove
- Leave balance: initialize, adjust
- Year-end: close, reopen, carry-forward

### 3. Admin workflows
- `POST /api/platform/templates`
- `PUT /api/platform/templates/:id`
- `POST /api/platform/templates/:id/apply/:schoolId`
- `POST /api/hr/roles`
- `PUT /api/hr/roles/:id`
- `POST /api/hr/roles/assign`
- `DELETE /api/hr/roles/assign/:userId/:staffRoleId`
- `POST /api/hr/year-end`
- `PUT /api/hr/year-end/:id/status`
- `POST /api/hr/year-end/carry-forward`
- `POST /api/schools`
- `PUT /api/schools/:id`
- `DELETE /api/schools/:id`
- `POST /api/users/devforge-users`
- `PUT /api/users/devforge-users/:id/activate`
- `PUT /api/users/devforge-users/:id/deactivate`

### 4. Payment gateway and webhook
- Configure payment provider and execute `POST /api/payments/initiate` end-to-end.
- Test `POST /api/payments/webhook`.

### 5. Business validation and workflow scenarios
- Ensure credit note creation only works for same-school invoices.
- Verify promise-to-pay creation and status update.
- Verify registration fee payment and recording.
- Verify refund approval and completion.
- Verify parent consent response flow.
- Verify leave request submission and review.
- Verify year-end balances and carry-forward results.

## Deployment notes
- Azure deployment instructions are available in `docs/AZURE_DEPLOYMENT.md`.
- After deployment, verify `https://<your-app-name>.azurewebsites.net/health` returns status `OK`.
