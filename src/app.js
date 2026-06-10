// Application Layer - Main application entry point
// This file sets up Express middleware, routes, health checks, and startup for the API.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
require('dotenv').config();

// Start Application Insights as early as possible so the SDK can hook
// require() patches and capture startup-time exceptions.
const { setupAppInsights } = require('./observability/appInsights');
setupAppInsights();

// Core data and route modules used by the API.
const { connectDB, getDbState } = require('./data/db');
const userRoutes = require('./application/userRoutes');
const schoolRoutes = require('./application/schoolRoutes');
const invoiceRoutes = require('./application/invoiceRoutes');
const familyRoutes = require('./application/familyRoutes');
const studentRoutes = require('./application/studentRoutes');
const transactionRoutes = require('./application/transactionRoutes');
const bankStatementRoutes = require('./application/bankStatementRoutes');
const billingCategoryRoutes = require('./application/billingCategoryRoutes');
const employeeRoutes = require('./application/employeeRoutes');
const leaveRoutes = require('./application/leaveRoutes');
const payslipRoutes = require('./application/payslipRoutes');
const parentRoutes = require('./application/parentRoutes');
const paymentRoutes = require('./application/paymentRoutes');
const exportRoutes = require('./application/exportRoutes');
const dashboardRoutes = require('./application/dashboardRoutes');
const auditRoutes = require('./application/auditRoutes');
const reportRoutes = require('./application/reportRoutes');
const attendanceRoutes = require('./application/attendanceRoutes');
const classRoutes = require('./application/classRoutes');
const featureRoutes = require('./application/featureRoutes');
const admissionsFinanceRoutes = require('./application/admissionsFinanceRoutes');
const rolloverTemplateRoutes = require('./application/rolloverTemplateRoutes');
const permissionLeaveYearEndRoutes = require('./application/permissionLeaveYearEndRoutes');
const registrationRoutes = require('./application/registrationRoutes');
const faultRoutes = require('./application/faultRoutes');
const emailRoutes = require('./application/emailRoutes');
// Route file naming convention (Task: file naming clarity):
//   - devforge-* : DevForge Admin Dashboard only
//   - sms-*      : School Management Dashboard only
//   - parent-*   : Parent Management Dashboard only
//   - all-dashboards-* : shared across all 3 dashboards
const messagingRoutes = require('./application/sms-messaging-routes');
const aiRoutes = require('./application/devforge-sms-ai-routes');
const bankReconciliationRoutes = require('./application/sms-bank-reconciliation-routes');
const kinderCareHubRoutes = require('./application/all-dashboards-kch-messaging-routes');
const devforgeSubscriptionRoutes = require('./application/devforge-subscription-routes');
const pdfRoutes = require('./application/pdfRoutes');
const parentVerificationRoutes = require('./application/parentVerificationRoutes');
const InvoiceService = require('./business/invoiceService');

// Express application instance shared by the server and local tests.
const app = express();

// Hide Express from response headers and let Azure/proxies provide the client IP.
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));

// Security headers: CSP blocks unknown scripts/frames, Helmet adds safe defaults.
// Inline theme-init script is allowed via a per-request nonce; style-src stays
// strict because Tailwind is built ahead of time and shipped as a single file.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'connect-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'object-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"]
    }
  },
  referrerPolicy: { policy: 'no-referrer' }
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001'];

// CORS only permits the configured frontend origins to call the API.
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

function positiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

// Rate limiting
// Dashboards load several scoped resources at once, and schools often share one
// public IP. Keep authentication strict while allowing normal portal navigation.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: positiveIntegerEnv('API_RATE_LIMIT_MAX', 1500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: positiveIntegerEnv('AUTH_RATE_LIMIT_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

app.use('/api/', apiLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// SECURITY (M8): keep the global JSON body limit low. Most endpoints send
// < 64 KB; the OFX upload is handled by multer with its own limit. This
// caps the resource-exhaustion surface from runaway clients.
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());
app.use(compression());

// Cache headers for /assets, /styles, /vendor, /app.js, etc. Public,
// fingerprinted-feeling static assets get a 1-hour cache + 24h SWR.
// express.static already sets ETag + Last-Modified by default.
const STATIC_ASSET_PREFIX = /^\/(assets|styles|vendor|app\.js|app-init\.js|palette\.js|palette-registry\.js|shortcuts\.js|favicon\.ico|robots\.txt)\b/;
function staticCacheControl(maxAgeSeconds, staleWhileRevalidateSeconds) {
  return function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (!STATIC_ASSET_PREFIX.test(req.path)) return next();
    res.setHeader('Cache-Control', 'public, max-age=' + maxAgeSeconds + ', stale-while-revalidate=' + staleWhileRevalidateSeconds);
    next();
  };
}
app.use(staticCacheControl(3600, 86400));
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, etag: true, lastModified: true }));

// Authenticated SSR pages and API responses must never be cached by
// intermediaries. Browsers will revalidate via the ETag we set on render.
app.use(function noStoreForDynamic(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  // Only mark responses Cache-Control: no-store when nothing else has set it.
  if (!res.getHeader && res.getHeader('Cache-Control')) return next();
  // API + portal pages are always no-store; static + marketing pages are not.
  if (req.path.startsWith('/api/') || req.path.startsWith('/sms') || req.path.startsWith('/parent') || req.path.startsWith('/devforge') || req.path.startsWith('/auth/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// ============================================================
// Server-rendered portal layer (new UI)
// ============================================================
const { setupViewEngine, registerLocals } = require('./application/portal/render');
const portalRoutes = require('./application/portal');

setupViewEngine(app);
app.use(ejsLayouts);
app.set('layout', 'layouts/app');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.use(registerLocals);
app.use(require('./middleware/portalLocals').portalLocals);
app.use('/', portalRoutes);

const { buildTestAuthResponse, isAuthDisabled } = require('./security/testAuth');

app.get('/api/config', (req, res) => {
  const payload = { authDisabled: isAuthDisabled() };

  if (payload.authDisabled) {
    try {
      payload.testSession = buildTestAuthResponse();
      payload.message = 'Login is disabled for local testing. A test session is provided automatically.';
    } catch (error) {
      payload.authDisabled = false;
      payload.error = error.message;
    }
  }

  res.json(payload);
});

// API route map. Each module owns the business endpoints for that feature area.
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/bank-statements', bankStatementRoutes);
app.use('/api/billing-categories', billingCategoryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/school-features', admissionsFinanceRoutes);
app.use('/api/platform', rolloverTemplateRoutes);
app.use('/api/hr', permissionLeaveYearEndRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/faults', faultRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bank-reconciliation', bankReconciliationRoutes);
app.use('/api/messages', kinderCareHubRoutes);
app.use('/api/devforge-subscriptions', devforgeSubscriptionRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/parent-verification', parentVerificationRoutes);

// Health endpoints used by Azure / GitHub deployment checks.
//   /health        - liveness:  always 200 while the process is running
//   /health/ready  - readiness: 200 when the database is reachable, 503 otherwise
// Both are unauthenticated and never expose sensitive data (lastError only in dev).
const startedAt = new Date();

// SECURITY (M14): strip Authorization, Cookie, and OAuth ?code= from any
// URL that may be logged. Also strip them from header dumps.
function sanitizeUrlForLog(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl, 'http://placeholder.local');
    const dropParams = ['code', 'access_token', 'id_token', 'token', 'jwt', 'authorization', 'state'];
    for (const p of dropParams) {
      if (u.searchParams.has(p)) u.searchParams.set(p, '***');
    }
    return u.pathname + (u.search ? '?' + u.searchParams.toString() : '');
  } catch (_) {
    return String(rawUrl).replace(/([?&])(code|access_token|id_token|token|jwt|authorization|state)=[^&]*/g, '$1$2=***');
  }
}
function sanitizeHeadersForLog(headers) {
  if (!headers) return {};
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    const lk = String(k).toLowerCase();
    if (lk === 'authorization' || lk === 'cookie') out[k] = '***';
    else out[k] = v;
  }
  return out;
}

const isProduction = process.env.NODE_ENV === 'production';

function healthPayload() {
  const database = getDbState();
  return {
    status: 'OK',
    service: 'kinder-care-hub',
    version: (() => { try { return require('../package.json').version; } catch (_) { return 'unknown'; } })(),
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    database: {
      connected: database.connected,
      lastError: isProduction ? null : database.lastError
    }
  };
}

app.get('/health', (req, res) => {
  res.json(healthPayload());
});

app.get('/health/ready', (req, res) => {
  const database = getDbState();
  if (database.connected) {
    return res.json(Object.assign(healthPayload(), { ready: true }));
  }
  // 503 lets Azure mark the instance unhealthy and stop routing traffic
  // to it while the DB is unreachable. Once the DB comes back, the
  // startDatabaseConnectionLoop's success path resets dbState.connected.
  return res.status(503).json(Object.assign(healthPayload(), { ready: false, reason: 'database-unreachable' }));
});

// Public marketing/login/register pages. These serve the new EJS views;
// the new portal routes (mounted above) already handle /sms, /devforge, /parent.
app.get('/', (req, res) => res.render('home', { title: 'Kinder Care Hub' }));
app.get('/website', (req, res) => res.render('home', { title: 'Kinder Care Hub' }));

// Public legal + status pages (linked from the marketing footer).
app.get('/privacy', (req, res) => res.render('legal/privacy', { title: 'Privacy Policy | Kinder Care Hub' }));
app.get('/terms', (req, res) => res.render('legal/terms', { title: 'Terms of Service | Kinder Care Hub' }));
app.get('/status', (req, res) => res.render('status', { title: 'Status | Kinder Care Hub', health: healthPayload() }));

// Each dashboard has its own independent login page so users cannot accidentally
// sign into the wrong shell. The same public/login.html is reused with a
// per-URL configuration (devforge-login / school-login / parent-login) and
// the in-page JS rejects wrong-role credentials and bounces to the correct
// dashboard. The /login unified entry still exists for marketing flows.
function serveDashboardLogin(req, res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
}
app.get('/devforge-login', serveDashboardLogin);
app.get('/school-login',   serveDashboardLogin);
app.get('/parent-login',   serveDashboardLogin);

// Public registration pages (school and parent) so the new tenants on
// SaaS can self-serve. Each registration form posts to the existing
// /api/users/register endpoint with the matching role.
app.get('/school-register', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});
app.get('/parent-register', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});
app.get('/devforge-register', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});

// Parent verification pages - public (no auth required) so first-time
// parents can confirm their email + cellphone before being granted any
// access to the parent portal.
app.get('/parent-verify', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('parent/verify', { title: 'Verify | Kinder Care Hub' });
});
app.get('/parent-verify/check-email', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('parent/verify-check-email', { title: 'Check your email | Kinder Care Hub', email: req.query.email || '' });
});

// OAuth dependencies are loaded after the basic public routes to keep the file
// readable: the next block handles AAD admin login and parent/school OAuth.
const UserService = require('./business/userService');
const {
  createOAuthState,
  getEmailClaim,
  postForm,
  readOAuthState,
  sendAuthCompletion,
  verifyGoogleIdToken,
  verifyMicrosoftIdToken
} = require('./security/oauth');
const { isAadAdminEmailAllowed, isAadAdminObjectIdAllowed, normalizeEmail } = require('./security/adminAccess');
const userServiceInstance = new UserService();

const DEFAULT_MICROSOFT_TENANT = 'common';

// Prefer BASE_URL in production so OAuth redirect URIs stay stable behind Azure.
function publicBaseUrl(req) {
  const configuredBaseUrl = String(process.env.BASE_URL || '').trim().replace(/\/+$/, '');

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return `${req.protocol}://${req.get('host')}`;
}

// OAuth providers must receive the exact callback URL configured in their portal.
function redirectUri(req, envName, callbackPath) {
  return process.env[envName] || `${publicBaseUrl(req)}${callbackPath}`;
}

// Build provider authorization URLs without manually concatenating query strings.
function buildAuthorizeUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

// Parent and school share OAuth routes, so normalize unknown values to parent.
function normalizePortalType(value, fallback = 'parent') {
  const type = String(value || '').trim().toLowerCase();

  return ['school', 'parent'].includes(type) ? type : fallback;
}

// Microsoft school/parent login must accept personal and work/school accounts.
function microsoftTenant() {
  return String(process.env.MICROSOFT_TENANT || DEFAULT_MICROSOFT_TENANT).trim() || DEFAULT_MICROSOFT_TENANT;
}

// After OAuth succeeds, send users to the correct dashboard shell.
function oauthRedirectForType(type) {
  return type === 'school' ? '/sms' : '/parent';
}

function oauthFailureStatus(error) {
  const message = String(error?.message || '');

  if (/not found|no matching|not authorized|registration|suspended|inactive/i.test(message)) {
    return 403;
  }

  if (/required|missing|invalid|expired|email|school id/i.test(message)) {
    return 400;
  }

  return 500;
}

function oauthFailureMessage(error, fallback) {
  const status = oauthFailureStatus(error);
  return status >= 500 ? fallback : error.message;
}

// OAuth state proves the callback belongs to a sign-in that this app started.
function readRequiredOAuthState(req, res) {
  try {
    return readOAuthState(req.query.state);
  } catch (err) {
    res.status(400).send('Invalid or expired OAuth state');
    return null;
  }
}

function oauthDisabledRedirect(res, fallbackPath = '/sms') {
  if (!isAuthDisabled()) {
    return false;
  }

  const authResponse = buildTestAuthResponse();
  const redirectTo = authResponse.user.role === 'admin'
    ? '/devforge'
    : authResponse.user.role === 'parent'
      ? '/parent'
      : fallbackPath;

  sendAuthCompletion(res, authResponse, redirectTo);
  return true;
}

// Azure AD sign-in route for the Admin dashboard only.
app.get('/auth/azure', (req, res) => {
  if (oauthDisabledRedirect(res, '/devforge')) {
    return undefined;
  }

  const tenant = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const callbackUri = redirectUri(req, 'AZURE_AD_REDIRECT_URI', '/auth/azure/callback');

  if (!tenant || !clientId) {
    return res.status(500).send('Azure AD not configured');
  }

  // AAD is locked to admin/devforge login only; parent/school use other routes.
  const state = createOAuthState({ type: 'admin', provider: 'azure' });
  const authorizeUrl = buildAuthorizeUrl(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`, {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: callbackUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state
  });

  return res.redirect(authorizeUrl);
});

app.get('/auth/azure/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const tenant = process.env.AZURE_AD_TENANT_ID;
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const callbackUri = redirectUri(req, 'AZURE_AD_REDIRECT_URI', '/auth/azure/callback');

    if (!code) {
      return res.status(400).send('Missing Azure AD code');
    }

    const state = readRequiredOAuthState(req, res);
    if (!state) {
      return undefined;
    }

    if (!tenant || !clientId || !clientSecret || state.type !== 'admin') {
      return res.status(400).send('Missing Azure AD configuration or code');
    }

    // Exchange the temporary code from Microsoft for an ID token.
    const tokenJson = await postForm(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      client_id: clientId,
      scope: 'openid profile email',
      code,
      redirect_uri: callbackUri,
      grant_type: 'authorization_code',
      client_secret: clientSecret
    });
    const idToken = tokenJson.id_token;
    if (!idToken) {
      return res.status(500).send('No id_token returned');
    }

    // Verify token signature, tenant, audience, and issuer before trusting it.
    const claims = await verifyMicrosoftIdToken(idToken, clientId, tenant);

    // Entra guest accounts can put the email in different claim fields.
    const emailCandidates = [
      claims.email,
      claims.preferred_username,
      claims.upn,
      claims.unique_name,
      getEmailClaim(claims)
    ].map(normalizeEmail).filter(Boolean);
    const allowedEmail = emailCandidates.find(isAadAdminEmailAllowed);
    const objectIdAllowed = isAadAdminObjectIdAllowed(claims.oid);
    const email = allowedEmail || emailCandidates[0];

    if (!email) {
      return res.status(400).send('No email claim in id_token');
    }

    // Only explicitly allowed admin emails or AAD object IDs can enter the DevForge dashboard.
    if (!allowedEmail && !objectIdAllowed) {
      console.warn('[AAD] Unauthorized admin login attempt', {
        selectedEmail: email,
        candidates: emailCandidates,
        email: normalizeEmail(claims.email),
        preferredUsername: normalizeEmail(claims.preferred_username),
        upn: normalizeEmail(claims.upn),
        uniqueName: normalizeEmail(claims.unique_name),
        oid: claims.oid,
        tid: claims.tid
      });
      return res.status(403).send('User not authorized for Admin dashboard login');
    }

    // Allowed AAD admins are provisioned automatically if the user row is absent.
    const userRecord = await userServiceInstance.findOrCreateOAuthUser(
      'azure',
      email,
      'devforge',
      null,
      { allowAdminProvisioning: true, aadObjectId: claims.oid }
    );
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    return sendAuthCompletion(res, authResponse, '/devforge');
  } catch (err) {
    console.error('Azure callback error', err);
    return res.status(500).send('Azure authentication failed');
  }
});

// Microsoft OAuth for school/parent. AAD is reserved for the Admin dashboard route above.
app.get('/auth/microsoft', (req, res) => {
  const type = normalizePortalType(req.query.type);
  if (oauthDisabledRedirect(res, oauthRedirectForType(type))) {
    return undefined;
  }

  const tenant = microsoftTenant();
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const callbackUri = redirectUri(req, 'MICROSOFT_REDIRECT_URI', '/auth/microsoft/callback');
  const schoolId = type === 'school' ? String(req.query.schoolId || '').trim() : '';

  if (!clientId) {
    return res.status(500).send('Microsoft OAuth not configured');
  }

  if (type === 'school' && (!Number.isInteger(Number(schoolId)) || Number(schoolId) <= 0)) {
    return res.status(400).send('School ID is required for school login');
  }

  const state = createOAuthState({ type, schoolId, provider: 'microsoft' });
  const authorizeUrl = buildAuthorizeUrl(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`, {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: callbackUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state,
    prompt: 'select_account'
  });

  return res.redirect(authorizeUrl);
});

app.get('/auth/microsoft/callback', async (req, res) => {
  try {
    if (req.query.error) {
      throw new Error(String(req.query.error_description || req.query.error));
    }

    const code = req.query.code;

    if (!code) {
      return res.status(400).send('Missing Microsoft auth code');
    }

    const state = readRequiredOAuthState(req, res);
    if (!state) {
      return undefined;
    }

    const type = normalizePortalType(state.type);
    const schoolId = state.schoolId || null;

    const tenant = microsoftTenant();
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const callbackUri = redirectUri(req, 'MICROSOFT_REDIRECT_URI', '/auth/microsoft/callback');

    if (!clientId || !clientSecret || state.provider !== 'microsoft') {
      return res.status(400).send('Missing Microsoft auth config');
    }

    // Microsoft consumer login uses the "consumers" tenant, not the AAD admin tenant.
    const tokenJson = await postForm(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      client_id: clientId,
      scope: 'openid profile email',
      code,
      redirect_uri: callbackUri,
      grant_type: 'authorization_code',
      client_secret: clientSecret
    });

    const idToken = tokenJson.id_token;
    if (!idToken) {
      return res.status(500).send('No id_token returned');
    }

    const claims = await verifyMicrosoftIdToken(idToken, clientId, tenant);
    const email = getEmailClaim(claims);
    if (!email) {
      return res.status(400).send('No email claim');
    }

    // Parent/school OAuth users are matched or created by role and school context.
    const userRecord = await userServiceInstance.findOrCreateOAuthUser('microsoft', email, type, schoolId);
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    return sendAuthCompletion(res, authResponse, oauthRedirectForType(type));
  } catch (err) {
    console.error('Microsoft callback error', err);
    return res.status(oauthFailureStatus(err)).send(oauthFailureMessage(err, 'Microsoft authentication failed'));
  }
});

// Google OAuth for school/parent
app.get('/auth/google', (req, res) => {
  const type = normalizePortalType(req.query.type);
  if (oauthDisabledRedirect(res, oauthRedirectForType(type))) {
    return undefined;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUri = redirectUri(req, 'GOOGLE_REDIRECT_URI', '/auth/google/callback');
  const schoolId = type === 'school' ? String(req.query.schoolId || '').trim() : '';

  if (!clientId) {
    return res.status(500).send('Google OAuth not configured');
  }

  if (type === 'school' && (!Number.isInteger(Number(schoolId)) || Number(schoolId) <= 0)) {
    return res.status(400).send('School ID is required for school login');
  }

  const state = createOAuthState({ type, schoolId, provider: 'google' });
  const authorizeUrl = buildAuthorizeUrl('https://accounts.google.com/o/oauth2/v2/auth', {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: callbackUri,
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account'
  });

  return res.redirect(authorizeUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    if (req.query.error) {
      throw new Error(String(req.query.error_description || req.query.error));
    }

    const code = req.query.code;

    if (!code) {
      return res.status(400).send('Missing Google auth code');
    }

    const state = readRequiredOAuthState(req, res);
    if (!state) {
      return undefined;
    }

    const type = normalizePortalType(state.type);
    const schoolId = state.schoolId || null;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUri = redirectUri(req, 'GOOGLE_REDIRECT_URI', '/auth/google/callback');

    if (!clientId || !clientSecret || state.provider !== 'google') {
      return res.status(400).send('Missing Google auth config');
    }

    // Exchange Google's code and verify the returned ID token before login.
    const tokenJson = await postForm('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUri,
      grant_type: 'authorization_code'
    });

    const idToken = tokenJson.id_token;
    if (!idToken) {
      return res.status(500).send('No id_token returned');
    }

    const claims = await verifyGoogleIdToken(idToken, clientId);
    const email = getEmailClaim(claims);
    if (!email) {
      return res.status(400).send('No email claim');
    }

    // Parent/school Google users follow the same app-user flow as Microsoft.
    const userRecord = await userServiceInstance.findOrCreateOAuthUser('google', email, type, schoolId);
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    return sendAuthCompletion(res, authResponse, oauthRedirectForType(type));
  } catch (err) {
    console.error('Google callback error', err);
    return res.status(oauthFailureStatus(err)).send(oauthFailureMessage(err, 'Google authentication failed'));
  }
});

// Dashboard shells are now handled by the new SSR portal routes mounted above.
// /sms, /devforge, /parent all render EJS views through src/application/portal.
// The legacy /school/* wildcard remains for backwards compatibility with
// the existing JS frontend — it still serves public/index.html.
// SECURITY (H6): the legacy unauthenticated /school/* SPA shell has been
// retired. Any hit is now a hard 301 to the new SMS portal. The legacy
// front-end can no longer be used as a CSRF/SSRF pivot.
app.get('/school', (req, res) => res.redirect(301, '/sms'));
app.get('/school/*', (req, res) => res.redirect(301, '/sms'));

// Monthly invoices run only for the first-day billing cycle.
const MAX_SCHEDULER_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// Work out the next first-of-month billing time.
function nextMonthlyInvoiceRun(from = new Date(), skipCurrentMonth = false) {
  const candidate = new Date(from.getFullYear(), from.getMonth(), 1, 0, 5, 0, 0);
  if (skipCurrentMonth || from >= candidate) {
    return new Date(from.getFullYear(), from.getMonth() + 1, 1, 0, 5, 0, 0);
  }

  return candidate;
}

// Generates recurring monthly invoices when schedulers are enabled.
function startMonthlyInvoiceScheduler() {
  const invoiceService = new InvoiceService();
  const runGeneration = async () => {
    try {
      const result = await invoiceService.generateMonthlyInvoices({ Role: 'admin' });
      const total = (result.generated || []).reduce((sum, s) => sum + (s.createdCount || 0), 0);
      console.log(`[Scheduler] Monthly invoice generation completed. Created ${total} invoices.`);
    } catch (err) {
      console.error('[Scheduler] Monthly invoice generation failed:', err.message);
    }
  };

  const scheduleRun = (runAt) => {
    const delay = Math.max(0, runAt.getTime() - Date.now());
    setTimeout(async () => {
      if (Date.now() >= runAt.getTime()) {
        await runGeneration();
        scheduleNextRun();
        return;
      }

      scheduleRun(runAt);
    }, Math.min(delay, MAX_SCHEDULER_TIMEOUT_MS));
  };

  const scheduleNextRun = (skipCurrentMonth = false) => {
    const runAt = nextMonthlyInvoiceRun(new Date(), skipCurrentMonth);
    console.log(`[Scheduler] Monthly invoice generation scheduled for ${runAt.toISOString()}`);
    scheduleRun(runAt);
  };

  const now = new Date();
  if (now.getDate() === 1) {
    console.log('[Scheduler] First day detected; running monthly invoice catch-up shortly.');
    setTimeout(runGeneration, 10000);
    scheduleNextRun(true);
    return;
  }

  scheduleNextRun();
}

// Overdue invoice flagging runs every hour by default.
function startOverdueScheduler() {
  const invoiceService = new InvoiceService();
  const interval = Number(process.env.OVERDUE_CHECK_INTERVAL_MS) || 3600000;

  setInterval(async () => {
    try {
      const count = await invoiceService.flagOverdueInvoices();
      if (count > 0) {
        console.log(`[Scheduler] Flagged ${count} invoices as overdue`);
      }
    } catch (err) {
      console.error('[Scheduler] Overdue check failed:', err.message);
    }
  }, interval);
}

// Backoff delay for database startup retries.
function databaseRetryDelayMs(attempt) {
  const configuredDelay = positiveIntegerEnv('DB_CONNECT_RETRY_MS', 0);
  if (configuredDelay > 0) {
    return configuredDelay;
  }

  return Math.min(30000, 1000 * (2 ** Math.min(attempt - 1, 5)));
}

// Keep trying to connect to the database so Azure cold starts are more resilient.
function startDatabaseConnectionLoop({ skipDatabase }) {
  let attempt = 0;
  const maxAttempts = skipDatabase ? 1 : nonNegativeIntegerEnv('DB_CONNECT_MAX_ATTEMPTS', 0);

  const tryConnect = async () => {
    attempt += 1;

    try {
      await connectDB();
    } catch (error) {
      const message = error?.message || String(error);

      if (skipDatabase) {
        console.warn('Skipping database startup for testing because SKIP_DB is set:', message);
        return;
      }

      if (maxAttempts > 0 && attempt >= maxAttempts) {
        console.error(`Database connection failed after ${attempt} attempt(s):`, message);
        return;
      }

      const delay = databaseRetryDelayMs(attempt);
      console.error(`Database connection attempt ${attempt} failed; retrying in ${delay}ms:`, message);
      const retryTimer = setTimeout(tryConnect, delay);
      retryTimer.unref?.();
    }
  };

  tryConnect();
}

// 404 catch-all for non-API routes. Must be after all routes, before the
// global error handler, so it doesn't shadow legitimate routes.
app.use(function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found', path: req.originalUrl });
  }
  res.status(404).render('errors/404', { path: req.originalUrl });
});

// ============================================================
// Global error handler - render nice pages, log details in dev
// ============================================================
// Distinguishes 404 (not found), 403 (forbidden), 500 (server error).
// API endpoints always get JSON regardless of status code.
app.use(function (err, req, res, next) {
  const status = err.status || 500;
  // Promote common not-found signals to a proper 404
  if (!err.status && (err.code === 'ENOENT' || /not found/i.test(err.message || ''))) {
    err.status = 404;
  }
  // SECURITY (M14): sanitized logger. Strip Authorization / Cookie /
  // OAuth ?code= from the URL before writing to logs.
  const safeUrl = sanitizeUrlForLog(req.originalUrl);
  const safeHeaders = sanitizeHeadersForLog(req.headers);
  console.error('[Error]', status, req.method, safeUrl,
    'headers=' + JSON.stringify(safeHeaders),
    'stack=' + (err && err.stack ? err.stack : String(err)));

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: err.message || 'Server error' });
  }

  if (res.headersSent) return next(err);

  if (status === 404) {
    return res.status(404).render('errors/404', { path: req.originalUrl });
  }
  if (status === 403) {
    return res.status(403).render('errors/forbidden', { message: err.message });
  }
  res.status(status).render('errors/offline', { message: err.message || 'Something went wrong.' });
});

// Application startup: bind a port, connect DB, and optionally start schedulers.
async function start() {
  const basePort = Number(process.env.PORT) || 3000;
  const schedulersEnabled = process.env.ENABLE_SCHEDULERS === 'true';
  const skipDatabase = process.env.SKIP_DB === 'true' || process.env.START_WITHOUT_DB === 'true';

  const launchServer = async (port) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      startDatabaseConnectionLoop({ skipDatabase });

      if (schedulersEnabled) {
        startOverdueScheduler();
        startMonthlyInvoiceScheduler();
      } else {
        console.log('Schedulers are disabled. Set ENABLE_SCHEDULERS=true to enable them.');
      }
    });

    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is already in use. Trying port ${nextPort}...`);
        await launchServer(nextPort);
        return;
      }

      console.error('Server startup failed:', error);
      process.exit(1);
    });
  };

  await launchServer(basePort);
}

// Only start the HTTP server when this file is run directly.
if (require.main === module) {
  start();
}

// Export app/start for local smoke tests without binding a fixed port.
module.exports = { app, start, nextMonthlyInvoiceRun };
