# Azure App Service Deployment

The Azure placeholder page means the App Service is running, but this repository has not been deployed to the app's `wwwroot` content directory yet, or Azure is not starting the Node app.

## Required App Settings

Set these in Azure Portal under App Service > Settings > Environment variables:

- `DATABASE_URL`: Azure SQL connection string.
- `JWT_SECRET`: long random signing secret.
- `PORT`: leave unset unless Azure requires a custom port. The app already uses `process.env.PORT`.
- `WEBSITE_NODE_DEFAULT_VERSION`: `~20`
- `SCM_DO_BUILD_DURING_DEPLOYMENT`: `true`

## Startup Command

For Linux App Service, set Startup Command to:

```text
npm start
```

For Windows App Service, the included `web.config` can route requests to `src/app.js`. If Azure still does not start the app, set the startup command to:

```text
npm start
```

## OAuth provider setup (Google and Microsoft)

This repository now supports OAuth sign-in for `school-login` and `parent-login` via Google and Microsoft, and DevForge admin sign-in via Azure AD.

Required environment variables (add these to the App Service Configuration / Environment variables):

- `JWT_SECRET` — long random signing secret used by the app for JWTs.
- `BASE_URL` — the public base URL for your app (e.g. `https://devforgesolutions-saas-app-24.azurewebsites.net`).

Google (for school/parent logins):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (optional; defaults to `${BASE_URL}/auth/google/callback`)

Microsoft (personal/work accounts for school/parent logins):

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI` (optional; defaults to `${BASE_URL}/auth/microsoft/callback`)
- `MICROSOFT_AUTH_TENANT` (optional; default `common` — use your tenant ID for org-only sign-ins)

Azure AD (DevForge admin sign-in — already used by the repo):

- `AZURE_AD_TENANT_ID`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_REDIRECT_URI` (optional; defaults to `${BASE_URL}/auth/azure/callback`)

Redirect URIs to register in provider consoles

- Google OAuth 2.0 -> Authorized redirect URI: `${BASE_URL}/auth/google/callback`
- Microsoft / Azure AD OAuth -> Redirect URI: `${BASE_URL}/auth/microsoft/callback`
- Azure AD (DevForge admin) -> Redirect URI: `${BASE_URL}/auth/azure/callback`

Notes and setup hints

- When you create an OAuth client in Google Cloud Console, enable the OAuth consent screen, add the scopes `openid email profile`, and register the redirect URI above.
- For Microsoft sign-in, register an app in Azure AD (App registrations), add the redirect URI, and grant the `openid`, `profile`, and `email` permissions (no admin consent required for basic sign-in). If you want only organizational accounts, set `MICROSOFT_AUTH_TENANT` to your tenant ID instead of `common`.
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

You should see the DevForge Solutions login and registration screen.
