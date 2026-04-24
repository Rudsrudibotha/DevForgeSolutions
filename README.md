# DevForegeSolutions

School Finance and Management System built with Node.js, Express, and Azure SQL Database.

The project follows a clear layered structure so each folder has a single responsibility:

- `src/application`: API routes and HTTP request/response handling.
- `src/business`: business rules, validation, workflows, and authorization decisions.
- `src/data`: database connection and repository classes.
- `src/middleware`: reusable Express middleware such as authentication and role checks.
- `db`: database schema and future migration files.
- `docs`: technical design and project documentation.

## System Design

The completed technical design is available in [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md).

This design is Azure-focused and covers:

- Azure App Service or Azure Container Apps hosting.
- Azure SQL Database as the primary data store.
- Azure Key Vault for secrets.
- Application Insights and Azure Monitor for observability.
- Layered API architecture.
- Multi-tenant school data model.
- Authentication, role-based access, audit logging, and change management.

## Local Development

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run dev
```

Run the database setup script:

```bash
npm run setup-db
```

## API Modules

- Users and authentication: `/api/users`
- Schools: `/api/schools`
- Invoices: `/api/invoices`
- Health check: `/health`

## Application UI

The Express server also serves the browser application from `public/`.

Once the API is running, open:

```text
http://localhost:3000
```

The first vertical slice includes:

- Account registration and login.
- Admin dashboard metrics.
- School tenant listing and creation.
- School activation and suspension.
- Invoice creation, listing, payment marking, and deletion.
- School-user views scoped to the signed-in school.

## Azure Deployment

Azure App Service deployment instructions are in [docs/AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md).

If Azure shows the default "Your web app is running and waiting for your content" page, the App Service exists but this repository has not been deployed to the web app content folder yet, or the startup command/runtime settings are missing.

## Engineering Notes

- Keep route files thin and place business decisions in `src/business`.
- Keep SQL access inside `src/data`.
- Add clear comments where logic may be difficult to maintain later.
- Do not hard-code production secrets in source files. Azure deployments should use Azure Key Vault and managed identity.
