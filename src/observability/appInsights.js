'use strict';

// Application Insights telemetry for Azure App Service.
// Set APPINSIGHTS_INSTRUMENTATIONKEY (or APPLICATIONINSIGHTS_CONNECTION_STRING)
// in the App Service Application Settings; the SDK auto-collects requests,
// dependencies, exceptions, and performance counters.

function setupAppInsights() {
  if (process.env.DISABLE_APPINSIGHTS === 'true') return;
  if (process.env.NODE_ENV === 'test') return;

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
    || process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[appinsights] No instrumentation key configured for production');
    }
    return;
  }

  try {
    const appInsights = require('applicationinsights');
    appInsights.setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(false)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true)
      .start();

    const cloudRole = process.env.APPINSIGHTS_CLOUD_ROLE || 'kinder-care-hub';
    appInsights.defaultClient.context.tags['ai.cloud.role'] = cloudRole;
    appInsights.defaultClient.context.tags['ai.application.ver'] = process.env.APP_VERSION || '1.0.0';

    console.log(`[appinsights] Started (role=${cloudRole})`);
    return appInsights;
  } catch (err) {
    console.error('[appinsights] Failed to start:', err.message);
  }
}

module.exports = { setupAppInsights };
