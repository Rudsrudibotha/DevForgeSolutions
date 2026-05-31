# Azure App Service Deployment

The Azure placeholder page means the App Service is running, but this repository has not been deployed to the app's `wwwroot` content directory yet, or Azure is not starting the Node app.

## Required App Settings

Set these in Azure Portal under App Service > Settings > Environment variables:

- `DATABASE_URL`: Azure SQL connection string.
- `JWT_SECRET`: long random signing secret.
- `PORT`: leave unset unless Azure requires a custom port. The app already uses `process.env.PORT`.
- `WEBSITE_NODE_DEFAULT_VERSION`: `~20`
- `SCM_DO_BUILD_DURING_DEPLOYMENT`: `true`

## Custom Domain: devforgesolutions.com

The public website is served from `/`. The dashboards stay on their dedicated paths:

- Website: `https://devforgesolutions.com/`
- School login: `https://devforgesolutions.com/school-login`
- Parent login: `https://devforgesolutions.com/parent-login`
- Admin login: `https://devforgesolutions.com/devforge-login`

Recommended production app settings:

```text
BASE_URL=https://devforgesolutions.com
ALLOWED_ORIGINS=https://devforgesolutions.com,https://www.devforgesolutions.com
GOOGLE_REDIRECT_URI=https://devforgesolutions.com/auth/google/callback
MICROSOFT_REDIRECT_URI=https://devforgesolutions.com/auth/microsoft/callback
AZURE_AD_REDIRECT_URI=https://devforgesolutions.com/auth/azure/callback
```

In Google, Microsoft consumer auth, and Microsoft Entra ID, register the matching production redirect URIs above.

### Squarespace DNS changes

The current Squarespace defaults point the domain to Squarespace hosting. When the Azure App Service is ready, replace the website records with Azure records. Keep the Google/email records unless you are changing email hosting.

Remove or replace these Squarespace website records:

```text
A      @      198.185.159.144
A      @      198.185.159.145
A      @      198.49.23.144
A      @      198.49.23.145
CNAME  www    ext-sq.squarespace.com
HTTPS  @      <Squarespace HTTPS/SVCB value>
```

Keep records like these if they are used for email:

```text
TXT    google._domainkey    <Google DKIM value>
TXT    @                    v=spf1 include:_spf.google.com ~all
MX     @                    <Google Workspace mail value>
CNAME  _domainconnect       _domainconnect.domains.squarespace.com
```

In Azure Portal, open App Service > Custom domains, then add both hostnames:

```text
devforgesolutions.com
www.devforgesolutions.com
```

Azure will show the exact verification values. Add the values it gives you in Squarespace DNS:

```text
A      @          <Azure App Service IP address>
TXT    asuid      <Azure domain verification ID for devforgesolutions.com>
CNAME  www        <your-app-name>.azurewebsites.net
TXT    asuid.www  <Azure domain verification ID for www.devforgesolutions.com>
```

After DNS saves, return to Azure, validate the custom domains, add them, and enable an App Service Managed Certificate for HTTPS.

## Startup Command

For Linux App Service, set Startup Command to:

```text
npm start
```

For Windows App Service, the included `web.config` can route requests to `src/app.js`. If Azure still does not start the app, set the startup command to:

```text
npm start
```

## OAuth provider setup (AAD, Google, and Microsoft)

This repository supports AAD / Microsoft Entra ID sign-in for the Admin dashboard only, and Google or Microsoft consumer sign-in for the School Management and Parent dashboards.

Required environment variables (add these to the App Service Configuration / Environment variables):

- `JWT_SECRET` — long random signing secret used by the app for JWTs.
- `BASE_URL` — the public base URL for your app (e.g. `https://devforgesolutions-saas-app-24.azurewebsites.net`).

Google (for School Management and Parent logins):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (optional; defaults to `${BASE_URL}/auth/google/callback`)

Microsoft consumer accounts (for School Management and Parent logins):

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI` (optional; defaults to `${BASE_URL}/auth/microsoft/callback`)

AAD / Microsoft Entra ID (Admin dashboard sign-in):

- `AZURE_AD_TENANT_ID`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_REDIRECT_URI` (optional; defaults to `${BASE_URL}/auth/azure/callback`)
- `AZURE_AD_ADMIN_EMAILS` (defaults to `rudi@devforgesolutions.com,tristan@devforgesolutions.com,calvin@devforgesolutions.com,ruds.botha@gmqail.com`)

Redirect URIs to register in provider consoles

- Google OAuth 2.0 -> Authorized redirect URI: `${BASE_URL}/auth/google/callback`
- Microsoft consumer OAuth -> Redirect URI: `${BASE_URL}/auth/microsoft/callback`
- AAD / Microsoft Entra ID -> Redirect URI: `${BASE_URL}/auth/azure/callback`

Notes and setup hints

- When you create an OAuth client in Google Cloud Console, enable the OAuth consent screen, add the scopes `openid email profile`, and register the redirect URI above.
- For School Management and Parent Microsoft sign-in, use the consumer Microsoft app registration flow. Organizational AAD sign-in is reserved for the Admin dashboard at `/auth/azure`.
- For Admin dashboard AAD sign-in, the email claim must match `AZURE_AD_ADMIN_EMAILS`. Matching users are provisioned as admin users on first successful AAD sign-in.
- For transactional emails, set `EMAIL_PROVIDER=postmark`, `EMAIL_FROM`, `POSTMARK_SERVER_TOKEN`, and optionally `REGISTRATION_NOTIFY_EMAIL`. `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` is also supported.
- Keep client secrets secure — store them in App Service configuration or Key Vault.
- After configuring environment variables, redeploy so the runtime picks up the new values (Azure will pick them up on next deployment or restart).

Local testing

- To test locally, set `BASE_URL` to your tunnel URL (for example, an `ngrok` HTTPS URL) and register that same URL as the OAuth redirect in provider consoles. Start the app locally with:

```bash
npm install
npm run dev
# or
npm start
```

Then open `${BASE_URL}/school-login` or `${BASE_URL}/parent-login` and use the provider buttons.


## Deployment Center

1. Open the Azure App Service.
2. Go to Deployment Center.
3. Select GitHub as the source.
4. Select this repository and branch.
5. Save and let Azure run the deployment.
6. Open Deployment Center logs and confirm `npm install` completed.

## Azure SQL Firewall

The app needs Azure SQL access. Add the App Service outbound IP addresses to the Azure SQL server firewall:

1. Open the App Service.
2. Go to Properties.
3. Copy Outbound IP addresses.
4. Open the Azure SQL server.
5. Go to Networking.
6. Add firewall rules for those outbound IPs.

For local development, also add your current public IP to the Azure SQL firewall.

## Smoke Test

After deployment, open:

```text
https://<your-app-name>.azurewebsites.net/health
```

Expected response:

```json
{
  "status": "OK",
  "message": "School Finance and Management System is running"
}
```

Then open:

```text
https://<your-app-name>.azurewebsites.net/
```

You should see the Kinder Care Hub public website. The login pages remain available at `/school-login`, `/parent-login`, and `/devforge-login`.
