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

You should see the DevForegeSolutions login and registration screen.
