// Application Layer - Main application entry point
// This file sets up Express middleware, routes, health checks, and startup for the API.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

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
const InvoiceService = require('./business/invoiceService');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));

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

app.use(express.json({ limit: '3mb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

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

app.get('/health', (req, res) => {
  const database = getDbState();
  const isProduction = process.env.NODE_ENV === 'production';

  res.json({
    status: 'OK',
    message: 'School Finance and Management System is running',
    database: {
      connected: database.connected,
      lastError: isProduction ? null : database.lastError
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'home.html'));
});

app.get('/website', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'home.html'));
});

app.get('/devforge-login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/school-login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/parent-login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/school-register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});

app.get('/parent-register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});

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
const { isAadAdminEmailAllowed, normalizeEmail } = require('./security/adminAccess');
const userServiceInstance = new UserService();

const MICROSOFT_CONSUMER_TENANT = 'consumers';

function publicBaseUrl(req) {
  const configuredBaseUrl = String(process.env.BASE_URL || '').trim().replace(/\/+$/, '');

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return `${req.protocol}://${req.get('host')}`;
}

function redirectUri(req, envName, callbackPath) {
  return process.env[envName] || `${publicBaseUrl(req)}${callbackPath}`;
}

function buildAuthorizeUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function normalizePortalType(value, fallback = 'parent') {
  const type = String(value || '').trim().toLowerCase();

  return ['school', 'parent'].includes(type) ? type : fallback;
}

function oauthRedirectForType(type) {
  return type === 'school' ? '/sms' : '/parent';
}

function readRequiredOAuthState(req, res) {
  try {
    return readOAuthState(req.query.state);
  } catch (err) {
    res.status(400).send('Invalid or expired OAuth state');
    return null;
  }
}

// Azure AD sign-in route for the Admin dashboard only.
app.get('/auth/azure', (req, res) => {
  const tenant = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const callbackUri = redirectUri(req, 'AZURE_AD_REDIRECT_URI', '/auth/azure/callback');

  if (!tenant || !clientId) {
    return res.status(500).send('Azure AD not configured');
  }

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
    const emailCandidates = [
      claims.email,
      claims.preferred_username,
      claims.upn,
      claims.unique_name,
      getEmailClaim(claims)
    ].map(normalizeEmail).filter(Boolean);
    const email = emailCandidates.find(isAadAdminEmailAllowed) || emailCandidates[0];

    if (!email) {
      return res.status(400).send('No email claim in id_token');
    }

    if (!isAadAdminEmailAllowed(email)) {
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

    const userRecord = await userServiceInstance.findOrCreateOAuthUser(
      'azure',
      email,
      'devforge',
      null,
      { allowAdminProvisioning: true }
    );
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    return sendAuthCompletion(res, authResponse, '/devforge');
  } catch (err) {
    console.error('Azure callback error', err);
    return res.status(500).send('Azure authentication failed');
  }
});

// Microsoft consumer OAuth for school/parent. AAD is reserved for the Admin dashboard route above.
app.get('/auth/microsoft', (req, res) => {
  const tenant = MICROSOFT_CONSUMER_TENANT;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const callbackUri = redirectUri(req, 'MICROSOFT_REDIRECT_URI', '/auth/microsoft/callback');
  const type = normalizePortalType(req.query.type);
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

    const tenant = MICROSOFT_CONSUMER_TENANT;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const callbackUri = redirectUri(req, 'MICROSOFT_REDIRECT_URI', '/auth/microsoft/callback');

    if (!clientId || !clientSecret || state.provider !== 'microsoft') {
      return res.status(400).send('Missing Microsoft auth config');
    }

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

    const userRecord = await userServiceInstance.findOrCreateOAuthUser('microsoft', email, type, schoolId);
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    return sendAuthCompletion(res, authResponse, oauthRedirectForType(type));
  } catch (err) {
    console.error('Microsoft callback error', err);
    return res.status(500).send('Microsoft authentication failed');
  }
});

// Google OAuth for school/parent
app.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUri = redirectUri(req, 'GOOGLE_REDIRECT_URI', '/auth/google/callback');
  const type = normalizePortalType(req.query.type);
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

    const userRecord = await userServiceInstance.findOrCreateOAuthUser('google', email, type, schoolId);
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    return sendAuthCompletion(res, authResponse, oauthRedirectForType(type));
  } catch (err) {
    console.error('Google callback error', err);
    return res.status(500).send('Google authentication failed');
  }
});

app.get('/sms', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/school', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/school/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/devforge', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'devforge.html'));
});

app.get('/parent', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'parent.html'));
});

// Monthly invoices run only for the first-day billing cycle.
const MAX_SCHEDULER_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function nextMonthlyInvoiceRun(from = new Date(), skipCurrentMonth = false) {
  const candidate = new Date(from.getFullYear(), from.getMonth(), 1, 0, 5, 0, 0);
  if (skipCurrentMonth || from >= candidate) {
    return new Date(from.getFullYear(), from.getMonth() + 1, 1, 0, 5, 0, 0);
  }

  return candidate;
}

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

function databaseRetryDelayMs(attempt) {
  const configuredDelay = positiveIntegerEnv('DB_CONNECT_RETRY_MS', 0);
  if (configuredDelay > 0) {
    return configuredDelay;
  }

  return Math.min(30000, 1000 * (2 ** Math.min(attempt - 1, 5)));
}

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

if (require.main === module) {
  start();
}

module.exports = { app, start, nextMonthlyInvoiceRun };
