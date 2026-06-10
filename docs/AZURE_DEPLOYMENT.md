# Azure Deployment Guide

## Target

Azure App Service for Linux (Node 20 LTS), backed by Azure SQL.

## One-time App Service setup

1. Create the App Service:
   ```bash
   az appservice plan create --name kch-plan --resource-group kch-rg --sku P1v3 --is-linux
   az webapp create --name kinder-care-hub --plan kch-plan --resource-group kch-rg \
       --runtime "NODE:20-lts"
   ```
2. Create the Azure SQL server and database, then store the connection string in Key Vault.

3. Set the Application Settings (Configuration → Application settings):

   | Setting | Value |
   | --- | --- |
   | `DATABASE_URL` | SQL connection string (Key Vault reference) |
   | `JWT_SECRET` | 64-byte random secret (Key Vault reference) |
   | `NODE_ENV` | `production` |
   | `ENABLE_SCHEDULERS` | `true` |
   | `TRUST_PROXY` | `1` (Azure sets X-Forwarded-For) |
   | `ALLOWED_ORIGINS` | `https://kinder-care-hub.azurewebsites.net` |
   | `BASE_URL` | `https://kinder-care-hub.azurewebsites.net` |
   | `AZURE_AD_TENANT_ID` | your Entra ID tenant |
   | `AZURE_AD_CLIENT_ID` | admin app registration |
   | `AZURE_AD_CLIENT_SECRET` | Key Vault reference |
   | `MICROSOFT_CLIENT_ID` | school/parent app registration |
   | `MICROSOFT_CLIENT_SECRET` | Key Vault reference |
   | `GOOGLE_CLIENT_ID` | OAuth client |
   | `GOOGLE_CLIENT_SECRET` | Key Vault reference |
   | `AZURE_COMMUNICATION_CONNECTION_STRING` | for email (Key Vault reference) |
   | `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string |
   | `APPINSIGHTS_CLOUD_ROLE` | `kinder-care-hub` |
   | `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
   | `POST_DEPLOYMENT_SCRIPT_PATH` | `scripts/postdeploy.sh` |

4. Add a deployment slot (`staging`) for blue/green.

5. Add a deployment center connection (GitHub Actions or Azure DevOps).

## Deployment

The repo includes a `.deployment` file and `scripts/postdeploy.sh`. Azure
App Service for Linux runs `npm install` automatically, then the
post-deploy script (which builds Tailwind CSS and copies vendor assets).

```bash
# Manual deploy
az webapp deploy --resource-group kch-rg --name kinder-care-hub \
    --src-path ./release.zip --type zip
```

## Health checks

`GET /health` returns 200 when the service and database are reachable.
Configure Azure App Service Health check path to `/health`.

## Scaling

- Use the P1v3 plan for production. Scale out to 3+ instances.
- The app is stateless — sessions live in the JWT. No sticky sessions required.
- The monthly invoice scheduler is safe to run on multiple instances because
  it uses a per-process `setTimeout` and SQL `OUTPUT INSERTED` to prevent
  double-billing. The first instance to acquire the scheduler lock wins.

## Observability

- Application Insights auto-collects requests, dependencies, exceptions.
- Custom role tag is set to `kinder-care-hub` for filtering in App Insights.
- Tail-based sampling at 100% for the first 7 days, then 50% thereafter.

## Backups

- Database: PITR enabled, 7-day retention.
- App Service: daily configuration backup to a storage account.

## Security baseline

- `x-powered-by` is disabled.
- `helmet` is on with strict CSP (`frame-ancestors 'none'`, `object-src 'none'`,
  `default-src 'self'`).
- Rate limit: 1500 req/15min per IP on `/api`, 20 req/15min on login.
- CSRF: double-submit cookie on every non-GET request, header auto-set by htmx.
- `trust proxy` is set so client IPs come from X-Forwarded-For.
