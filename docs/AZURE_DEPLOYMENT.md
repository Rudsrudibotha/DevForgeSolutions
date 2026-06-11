# Azure Deployment Guide

## Target

Azure App Service for Linux, backed by Azure SQL. The current KinderHub baseline
is intentionally small, affordable, and easy to scale when usage proves it is
needed:

- Subscription: `KinderHub`
- Resource group: `rg-kinderhub-prod`
- Region for services: `southafricanorth`
- App Service plan: `asp-kinderhub-prod-b1` (`B1`)
- Web app: `kinderhub-saas-app`
- Azure SQL database: `kinderhubdb` (`Basic`, 5 DTU, 2 GB)
- Storage account: `kinderhubstza115707` (`Standard_LRS`, hot tier)

## One-Time App Service Setup

1. Create the App Service plan and web app:
   ```bash
   az appservice plan create \
       --name asp-kinderhub-prod-b1 \
       --resource-group rg-kinderhub-prod \
       --location southafricanorth \
       --sku B1 \
       --is-linux

   az webapp create \
       --name kinderhub-saas-app \
       --plan asp-kinderhub-prod-b1 \
       --resource-group rg-kinderhub-prod \
       --runtime "NODE:22-lts"
   ```

2. Create the Azure SQL server and start with a Basic database. Basic is the
   lowest-cost production Azure SQL tier and can be scaled up without changing
   application code:
   ```bash
   az sql db create \
       --resource-group rg-kinderhub-prod \
       --server kinderhub-sql-za-66665 \
       --name kinderhubdb \
       --service-objective Basic \
       --backup-storage-redundancy Local
   ```

3. Store secrets in Key Vault or App Service application settings. Do not commit
   connection strings, storage keys, JWT secrets, OAuth secrets, or SQL admin
   credentials.

4. Set the Application Settings (Configuration -> Application settings):

   | Setting | Value |
   | --- | --- |
   | `DATABASE_URL` | SQL connection string (Key Vault reference preferred) |
   | `JWT_SECRET` | 64-byte random secret (Key Vault reference preferred) |
   | `NODE_ENV` | `production` |
   | `ENABLE_SCHEDULERS` | `true` |
   | `TRUST_PROXY` | `1` |
   | `ALLOWED_ORIGINS` | `https://kinderhub-saas-app.azurewebsites.net` |
   | `BASE_URL` | `https://kinderhub-saas-app.azurewebsites.net` |
   | `AZURE_AD_TENANT_ID` | Entra ID tenant |
   | `AZURE_AD_CLIENT_ID` | Admin app registration |
   | `AZURE_AD_CLIENT_SECRET` | Key Vault reference preferred |
   | `MICROSOFT_CLIENT_ID` | School/parent app registration |
   | `MICROSOFT_CLIENT_SECRET` | Key Vault reference preferred |
   | `GOOGLE_CLIENT_ID` | OAuth client |
   | `GOOGLE_CLIENT_SECRET` | Key Vault reference preferred |
   | `GOOGLE_REDIRECT_URI` | `https://kinderhub-saas-app.azurewebsites.net/auth/google/callback` |
   | `AZURE_COMMUNICATION_CONNECTION_STRING` | Email provider connection string |
   | `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string |
   | `APPINSIGHTS_CLOUD_ROLE` | `kinderhub-saas-app` |
   | `WEBSITE_NODE_DEFAULT_VERSION` | `~22` |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
   | `POST_DEPLOYMENT_SCRIPT_PATH` | `scripts/postdeploy.sh` |

5. Configure health checks:
   ```bash
   az rest --method PATCH \
       --uri "https://management.azure.com/subscriptions/<subscription-id>/resourceGroups/rg-kinderhub-prod/providers/Microsoft.Web/sites/kinderhub-saas-app/config/web?api-version=2023-12-01" \
       --headers "Content-Type=application/json" \
       --body @healthcheck.json
   ```

   `healthcheck.json`:
   ```json
   { "properties": { "healthCheckPath": "/health" } }
   ```

6. Add a deployment slot only after moving to Standard or Premium. Basic keeps
   monthly cost lower but does not provide deployment slots or the same autoscale
   options.

7. Add a deployment center connection (GitHub Actions or Azure DevOps).

## Deployment

The repo includes a `.deployment` file and `scripts/postdeploy.sh`. Azure App
Service for Linux runs `npm install` automatically, then the post-deploy script
builds Tailwind CSS and copies vendor assets.

```bash
# Manual deploy
az webapp deploy \
    --resource-group rg-kinderhub-prod \
    --name kinderhub-saas-app \
    --src-path ./release.zip \
    --type zip
```

## Health Checks

`GET /health` returns 200 when the service and database are reachable. Configure
Azure App Service Health check path to `/health`.

## Scaling

- Keep `B1` while traffic is low. It is the cheapest dedicated App Service
  baseline that is suitable for a small production Node app.
- Scale vertically first when CPU or memory is consistently constrained: `B2`,
  then `B3`.
- Move to Standard (`S1` or higher) when the app needs deployment slots,
  autoscale rules, or multiple always-on instances.
- Move to Premium v3 when sustained load, stronger scale-out, or production
  isolation justifies the higher monthly cost.
- Keep Azure SQL on `Basic` until DTU pressure, storage, or query latency shows
  it is no longer enough. The next low-cost step is Standard DTU (`S0`/`S1`).
- The app is stateless: sessions live in the JWT. No sticky sessions required.
- The monthly invoice scheduler is safe to run on multiple instances because it
  uses SQL `OUTPUT INSERTED` to prevent double-billing. The first instance to
  acquire the scheduler lock wins.

## Cost Controls

- Use `Standard_LRS` storage unless continuity requirements justify zone or
  geo-redundant storage.
- Use the hot blob tier for frequently accessed attachments. Add lifecycle rules
  later for old, rarely accessed files after real access patterns are known.
- Use local backup redundancy for the Basic SQL database to minimize cost.
  Upgrade backup redundancy only when the recovery policy requires regional
  resilience.
- Keep Application Insights sampling enabled once traffic grows to avoid
  telemetry cost spikes.
- Review Azure Cost Management monthly and set a budget alert for the
  subscription before onboarding paying schools.

## Observability

- Application Insights auto-collects requests, dependencies, and exceptions when
  configured.
- Custom role tag should be set to `kinderhub-saas-app` for filtering in App
  Insights.
- Tail-based sampling at 100% is acceptable during first production validation;
  reduce it once traffic grows.

## Backups

- Database: point-in-time restore is enabled by Azure SQL. Basic currently uses
  local backup redundancy to keep costs low.
- App Service: enable daily configuration backup when the app moves beyond the
  initial low-cost production baseline.

## Security Baseline

- `x-powered-by` is disabled.
- `helmet` is on with strict CSP (`frame-ancestors 'none'`, `object-src 'none'`,
  `default-src 'self'`).
- Rate limit: 1500 req/15min per IP on `/api`, 20 req/15min on login.
- CSRF: double-submit cookie on every non-GET request, header auto-set by htmx.
- `trust proxy` is set so client IPs come from `X-Forwarded-For`.
