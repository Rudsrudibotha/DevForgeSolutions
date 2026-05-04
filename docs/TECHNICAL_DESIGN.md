# School Finance and Management System Technical Design

## 1. Executive Summary

DevForge Solutions is building a cloud-hosted School Finance and Management System for schools that need controlled administration, finance operations, subscription management, invoicing, and reporting. The current implementation is an Express.js API with a layered structure:

- Application Layer: HTTP routing, request validation, response handling.
- Business Layer: business rules, validation, authorization decisions, workflow logic.
- Data Layer: repositories and database access.

The platform is designed for Azure, with Azure SQL Database as the primary relational store and Azure App Service or Azure Container Apps as the first production hosting target. The design keeps the codebase simple for the current stage while leaving room for later expansion into admissions, learners, staff, attendance, academics, payment integrations, reporting, notifications, and support operations.

## 2. Goals

- Provide a secure finance and management API for school administration.
- Keep clear separation between routes, business logic, and data access.
- Support multiple schools as logical tenants.
- Protect school data with role-based access, strong authentication, audit logging, and Azure-managed secrets.
- Use Azure-native infrastructure for hosting, data, security, monitoring, backup, and release management.
- Maintain code that is easy to troubleshoot through clear comments and consistent folder ownership.

## 3. Non-Goals

- The first release does not require a full microservice split.
- The first release does not require a frontend application, although the API is designed to support one.
- Payment card data must not be stored directly in this system. Payments should be delegated to PCI-compliant providers.
- Analytics warehousing is not part of the first release, but the design allows later integration with Azure Synapse, Microsoft Fabric, or Power BI.

## 4. Azure Target Architecture

### 4.1 Runtime

The initial deployment should use one of these Azure hosting models:

- Azure App Service for the fastest managed Node.js deployment.
- Azure Container Apps if the project moves toward containers, background workers, or event-driven scaling.

Recommended first production target: Azure App Service with deployment slots.

### 4.2 Platform Services

- Azure SQL Database: primary transactional database.
- Azure Key Vault: stores database credentials, JWT secret, payment provider secrets, and email/SMS provider secrets.
- Azure App Configuration: manages feature flags and environment-specific settings.
- Application Insights: request tracing, dependency tracing, exception logging, and performance monitoring.
- Azure Monitor: alert rules, dashboards, availability checks, and operational metrics.
- Azure Storage Account: future document storage for invoices, reports, exports, and school assets.
- Azure Front Door or Application Gateway: optional edge routing, TLS termination, WAF, and global routing.
- Microsoft Entra ID or Entra External ID: future enterprise identity option.
- Azure DevOps or GitHub Actions: CI/CD pipeline.

## 5. Logical Architecture

```text
Client Apps
  |
  | HTTPS
  v
Azure Front Door / App Service Endpoint
  |
  v
Express API
  |
  +-- Application Layer: src/application
  |     Routes, request parsing, HTTP status mapping
  |
  +-- Business Layer: src/business
  |     Validation, workflows, tenant rules, authorization rules
  |
  +-- Data Layer: src/data
        Repository classes, SQL Server access, query parameterization
  |
  v
Azure SQL Database
```

The current repository already follows this shape:

- `src/app.js`: Express setup, middleware, database connection, route registration.
- `src/application`: user, school, and invoice routes.
- `src/business`: user, school, and invoice services.
- `src/data`: database connection and repositories.
- `src/middleware`: authentication and role middleware.
- `db/schema.sql`: SQL schema.

## 6. Module Design

### 6.1 User and Authentication Module

Responsibilities:

- Register users.
- Login users.
- Hash passwords with bcrypt.
- Issue JWT access tokens.
- Associate school users with a school tenant.
- Return user profile information without password hashes.

Current endpoints:

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users`
- `GET /api/users/:id`

Required hardening:

- Protect user listing with admin authorization.
- Move JWT secret to Azure Key Vault.
- Enforce allowed roles: `admin`, `school`.
- Add password policy checks.
- Add refresh token or session strategy before production.
- Add account lockout or rate limiting for login.

### 6.2 School Module

Responsibilities:

- Create school tenant records.
- Maintain school contact and subscription status.
- Suspend or activate a school.
- Provide school data for admin workflows.

Current endpoints:

- `GET /api/schools`
- `GET /api/schools/:id`
- `POST /api/schools`
- `PUT /api/schools/:id`
- `DELETE /api/schools/:id`
- `PUT /api/schools/:id/suspend`
- `PUT /api/schools/:id/activate`

Required hardening:

- Protect create, update, delete, suspend, and activate operations.
- Prevent deletion when users or invoices exist.
- Add tenant-aware filtering for school users.
- Add audit logs for status changes.

### 6.3 Invoice and Finance Module

Responsibilities:

- Create invoices for schools.
- Retrieve invoices globally or per school.
- Update invoice details.
- Mark invoices as paid.
- Track status, due date, paid date, and amount.

Current endpoints:

- `GET /api/invoices`
- `GET /api/invoices/:id`
- `GET /api/invoices/school/:schoolId`
- `POST /api/invoices`
- `PUT /api/invoices/:id`
- `DELETE /api/invoices/:id`
- `PUT /api/invoices/:id/pay`

Required hardening:

- Register `/api/invoices/school/:schoolId` before `/api/invoices/:id` so school invoice lookups are routed correctly.
- Protect finance operations with authentication and role checks.
- Prevent paid invoices from being deleted.
- Validate positive amounts and valid statuses.
- Generate stable invoice numbers using a sequence or dedicated numbering table instead of timestamps.
- Add payment gateway references for externally processed payments.

### 6.4 Future Modules

The design supports these future modules without changing the layered pattern:

- Admissions: applications, documents, review states, enrolment conversion.
- Students: learner profiles, guardians, grades, classes, enrolment history.
- Staff: staff profiles, roles, employment status, access assignments.
- Attendance: daily attendance, late arrivals, absence reasons, reporting.
- Academics: subjects, terms, assessments, marks, report cards.
- Payments: payment provider integration, webhooks, reconciliation.
- Notifications: email, SMS, in-app notices, templates.
- Reporting: finance reports, school activity, overdue invoices, exports.
- Administration: system settings, feature flags, release notes, audit trails.

## 7. Data Design

### 7.1 Current Tables

The current schema contains:

- `Schools`
- `Users`
- `Invoices`

Core relationships:

- A school can have many users.
- A school can have many invoices.
- A user may be global admin or linked to a school.

### 7.2 Required Schema Improvements

- Create `Schools` before `Users` because `Users.SchoolID` references `Schools.SchoolID`.
- Remove the duplicate `CREATE TABLE Schools` statement.
- Add indexes:
  - `Users.Email`
  - `Users.SchoolID`
  - `Invoices.SchoolID`
  - `Invoices.Status`
  - `Invoices.DueDate`
- Add check constraints for known status values.
- Add `AuditLogs` table.
- Add `Payments` table before payment gateway integration.
- Add `RowVersion` columns where concurrency control matters.

### 7.3 Proposed AuditLogs Table

```sql
CREATE TABLE AuditLogs (
    AuditLogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL,
    SchoolID INT NULL,
    EntityName NVARCHAR(100) NOT NULL,
    EntityID NVARCHAR(100) NOT NULL,
    Action NVARCHAR(100) NOT NULL,
    BeforeValue NVARCHAR(MAX) NULL,
    AfterValue NVARCHAR(MAX) NULL,
    IpAddress NVARCHAR(100) NULL,
    CreatedDate DATETIME DEFAULT GETDATE()
);
```

## 8. Multi-Tenancy Model

The first implementation uses logical tenancy through `SchoolID` columns. Every school-owned entity must include `SchoolID`. Admin users may access cross-school data. School users may only access records that match their assigned `SchoolID`.

Business services must enforce tenant boundaries before repositories perform updates or deletes. Repositories should receive validated tenant scope instead of deciding authorization alone.

Future options:

- Row-level security in Azure SQL Database.
- Separate databases per enterprise school.
- Separate schemas per school if strict isolation becomes a contract requirement.

Recommended current path: shared Azure SQL database with strict `SchoolID` filtering, service-level authorization, audit logging, and database indexes.

## 9. Security Design

### 9.1 Authentication

- Use JWT access tokens for API authentication.
- Store JWT signing secret in Azure Key Vault.
- Use HTTPS only.
- Add token expiry and refresh strategy before production.
- Consider Microsoft Entra ID integration for staff/admin SSO later.

### 9.2 Authorization

Roles:

- `admin`: can manage schools, users, invoices, subscription states, and system settings.
- `school`: can access only its own school data and finance records.

Rules:

- All mutating endpoints must require authentication.
- Admin-only operations include school suspension, activation, deletion, cross-school invoice listing, and user listing.
- School users must not pass arbitrary `schoolId` values to access another tenant.

### 9.3 Secrets

No secrets should be hard-coded in source files. Store these in Azure Key Vault:

- SQL connection string.
- JWT secret.
- Payment provider keys.
- Email/SMS provider keys.
- Storage account keys, if managed identity is not used.

Preferred production approach: App Service managed identity reads secrets from Key Vault.

### 9.4 Data Protection

- Azure SQL encryption at rest.
- TLS encryption in transit.
- Database firewall rules limited to Azure services and required developer IPs.
- Regular backups and point-in-time restore.
- Audit logging for administrative actions.
- POPIA/GDPR-aware retention and deletion procedures.

## 10. Freshservice-Aligned Application Management

The system should be treated as a managed business service with clear ownership and auditable changes.

### 10.1 Service Ownership

Configuration items:

- Web/API runtime.
- Azure SQL Database.
- Authentication and authorization.
- Finance module.
- Reporting/export module.
- Storage.
- Monitoring and alerting.

Each component should have an owner, environment, version, dependency list, and support contact.

### 10.2 Change Management

Change types:

- Standard: low-risk, pre-approved, repeatable tasks such as dependency patching in staging.
- Normal: planned releases, schema changes, new features, permission changes.
- Emergency: urgent fixes for outages, security incidents, or severe data defects.

Normal changes must include:

- Description.
- Risk and impact.
- Rollback plan.
- Test evidence.
- Deployment window.
- Communication plan.

### 10.3 Release Management

- Use semantic versioning.
- Publish release notes in the admin dashboard later.
- Use Azure App Service deployment slots for staging and production.
- Run database migrations before or during deployment with rollback planning.
- Prefer additive schema changes where possible.

### 10.4 Incident Management

Incident severity:

- Sev 1: production outage, data exposure, payment failure across all schools.
- Sev 2: major feature unavailable for many schools.
- Sev 3: degraded feature or single-school issue.
- Sev 4: minor defect or support request.

All incidents should produce:

- Timeline.
- Root cause.
- Impacted schools.
- Resolution.
- Preventive action.

## 11. API Design Standards

- Use JSON request and response bodies.
- Use consistent error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "School ID and amount are required"
  }
}
```

- Return appropriate status codes:
  - `200` for successful reads and updates.
  - `201` for created resources.
  - `400` for validation errors.
  - `401` for missing authentication.
  - `403` for forbidden access.
  - `404` for missing resources.
  - `409` for conflicts.
  - `500` for unexpected server errors.

## 12. Observability

Azure Application Insights should collect:

- Request duration.
- Failed requests.
- Dependency calls to Azure SQL.
- Exceptions.
- Authentication failures.
- Slow queries.

Azure Monitor alerts should cover:

- API availability.
- High 5xx rate.
- High response time.
- Database connection failures.
- SQL DTU/vCore pressure.
- Storage failures.

Logs must avoid storing passwords, tokens, or sensitive payment data.

## 13. CI/CD Design

Recommended GitHub Actions or Azure DevOps pipeline:

1. Install Node dependencies.
2. Run linting.
3. Run unit tests.
4. Run integration tests against a test database.
5. Build deployment artifact or container image.
6. Deploy to Azure staging slot.
7. Run smoke tests.
8. Swap staging to production.
9. Publish release notes.

Database changes should be handled through migration files rather than re-running a full schema script in production.

## 14. Environments

- Local: developer machine, local `.env`, optional Azure SQL dev database.
- Development: shared Azure environment for integration.
- Staging: production-like environment for release validation.
- Production: live school data.

Environment-specific configuration belongs in Azure App Configuration, Key Vault, or App Service settings.

## 15. Implementation Roadmap

### Phase 1: Stabilize Current API

- Fix schema creation order and duplicate school table declaration.
- Move SQL credentials and JWT secret out of source code.
- Apply authentication and authorization to protected endpoints.
- Fix invoice route ordering.
- Add validation for roles, invoice amounts, statuses, and required fields.
- Add basic API smoke tests.

### Phase 2: Production Readiness on Azure

- Deploy to Azure App Service with staging slot.
- Connect to Azure SQL through managed configuration.
- Add Application Insights and Azure Monitor alerts.
- Add Key Vault integration.
- Add backup and restore documentation.
- Add release pipeline.

### Phase 3: Finance Expansion

- Add payments table.
- Add payment gateway integration through provider-hosted checkout.
- Add webhook handling.
- Add reconciliation reports.
- Add overdue invoice notifications.

### Phase 4: School Management Expansion

- Add students, guardians, staff, classes, subjects, and attendance.
- Add school-specific settings.
- Add reporting and exports.
- Add notification templates.

## 16. Key Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Hard-coded secrets | Data breach | Use Azure Key Vault and managed identity |
| Missing tenant checks | Cross-school data exposure | Enforce `SchoolID` in business services and tests |
| Re-running schema in production | Data loss or failed release | Use migrations and release approvals |
| Incomplete auth coverage | Unauthorized access | Protect all non-public endpoints |
| Weak invoice numbering | Duplicate or confusing invoice IDs | Use SQL sequence or dedicated numbering table |
| Limited monitoring | Slow incident response | Use Application Insights, Azure Monitor, and alerts |

## 17. Definition of Done

The system design is complete for the current stage when:

- README explains the project, architecture, setup, and Azure direction.
- The technical design identifies modules, data model, security, Azure services, and roadmap.
- The code follows the Application, Business, and Data layer separation.
- Production secrets are removed from source code.
- Protected routes require authentication and role checks.
- Database schema runs successfully in a clean Azure SQL database.
- Basic smoke tests confirm registration, login, school management, and invoice flows.
