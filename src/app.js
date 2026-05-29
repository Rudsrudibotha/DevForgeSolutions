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
  res.redirect('/school-login');
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

// Azure AD sign-in routes for DevForge admin users
const UserService = require('./business/userService');
const jwt = require('jsonwebtoken');
const userServiceInstance = new UserService();

app.get('/auth/azure', (req, res) => {
  const tenant = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI || `${process.env.BASE_URL || ''}/auth/azure/callback`;

  if (!tenant || !clientId) {
    return res.status(500).send('Azure AD not configured');
  }

  const authorizeUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent('openid profile email')}`;
  res.redirect(authorizeUrl);
});

app.get('/auth/azure/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const tenant = process.env.AZURE_AD_TENANT_ID;
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const redirectUri = process.env.AZURE_AD_REDIRECT_URI || `${process.env.BASE_URL || ''}/auth/azure/callback`;

    if (!code || !tenant || !clientId || !clientSecret) {
      return res.status(400).send('Missing Azure AD configuration or code');
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'openid profile email');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', clientSecret);

    const tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const tokenJson = await tokenResp.json();

    if (!tokenResp.ok) {
      return res.status(500).send('Token exchange failed');
    }

    const idToken = tokenJson.id_token;
    if (!idToken) return res.status(500).send('No id_token returned');

    const decoded = jwt.decode(idToken);
    const email = decoded?.preferred_username || decoded?.email || decoded?.upn;

    if (!email) return res.status(400).send('No email claim in id_token');

    // Find user by email and ensure admin role
    const userRecord = await userServiceInstance.userRepository.getUserByEmail(String(email).toLowerCase());

    if (!userRecord || (userRecord.Role !== 'admin' && userRecord.Role !== 'devforge')) {
      return res.status(403).send('User not authorized for DevForge login');
    }

    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    // Render a small page to set localStorage token and redirect to dashboard
    const token = JSON.stringify(authResponse.token);
    const user = JSON.stringify(authResponse.user);
    const redirectTo = '/devforge';

    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Signing in...</title></head><body><script>localStorage.setItem('smsToken', ${token}); localStorage.setItem('smsUser', ${user}); localStorage.setItem('smsLastActivity', '${Date.now()}'); window.location.href='${redirectTo}';</script></body></html>`);
  } catch (err) {
    console.error('Azure callback error', err);
    res.status(500).send('Azure authentication failed');
  }
});

// Generic Microsoft (personal/work) OAuth for school/parent
app.get('/auth/microsoft', (req, res) => {
  const tenant = process.env.MICROSOFT_AUTH_TENANT || 'common';
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.BASE_URL || ''}/auth/microsoft/callback`;
  const type = String(req.query.type || '').trim();
  const schoolId = req.query.schoolId || '';

  if (!clientId) return res.status(500).send('Microsoft OAuth not configured');

  const state = Buffer.from(JSON.stringify({ type, schoolId })).toString('base64');
  const authorizeUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent('openid profile email')}&state=${encodeURIComponent(state)}`;
  res.redirect(authorizeUrl);
});

app.get('/auth/microsoft/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state ? JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8')) : {};
    const type = state.type || 'parent';
    const schoolId = state.schoolId || null;

    const tenant = process.env.MICROSOFT_AUTH_TENANT || 'common';
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.BASE_URL || ''}/auth/microsoft/callback`;

    if (!code || !clientId || !clientSecret) return res.status(400).send('Missing Microsoft auth config');

    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'openid profile email');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    params.append('client_secret', clientSecret);

    const tokenResp = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) return res.status(500).send('Token exchange failed');

    const idToken = tokenJson.id_token;
    if (!idToken) return res.status(500).send('No id_token returned');

    const decoded = jwt.decode(idToken);
    const email = decoded?.preferred_username || decoded?.email || decoded?.upn;
    if (!email) return res.status(400).send('No email claim');

    const userRecord = await userServiceInstance.findOrCreateOAuthUser('microsoft', email, type, schoolId);
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    const token = JSON.stringify(authResponse.token);
    const user = JSON.stringify(authResponse.user);
    const redirectTo = type === 'devforge' ? '/devforge' : (type === 'school' ? '/sms' : '/parent');

    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Signing in...</title></head><body><script>localStorage.setItem('smsToken', ${token}); localStorage.setItem('smsUser', ${user}); localStorage.setItem('smsLastActivity', '${Date.now()}'); window.location.href='${redirectTo}';</script></body></html>`);
  } catch (err) {
    console.error('Microsoft callback error', err);
    res.status(500).send('Microsoft authentication failed');
  }
});

// Google OAuth for school/parent
app.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || ''}/auth/google/callback`;
  const type = String(req.query.type || '').trim();
  const schoolId = req.query.schoolId || '';

  if (!clientId) return res.status(500).send('Google OAuth not configured');

  const state = Buffer.from(JSON.stringify({ type, schoolId })).toString('base64');
  const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(state)}&access_type=online&prompt=select_account`;
  res.redirect(authorizeUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state ? JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8')) : {};
    const type = state.type || 'parent';
    const schoolId = state.schoolId || null;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || ''}/auth/google/callback`;

    if (!code || !clientId || !clientSecret) return res.status(400).send('Missing Google auth config');

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');

    const tokenResp = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) return res.status(500).send('Token exchange failed');

    const idToken = tokenJson.id_token;
    if (!idToken) return res.status(500).send('No id_token returned');

    const decoded = jwt.decode(idToken);
    const email = decoded?.email || decoded?.preferred_username;
    if (!email) return res.status(400).send('No email claim');

    const userRecord = await userServiceInstance.findOrCreateOAuthUser('google', email, type, schoolId);
    const authResponse = await userServiceInstance.buildAuthResponse(userRecord);

    const token = JSON.stringify(authResponse.token);
    const user = JSON.stringify(authResponse.user);
    const redirectTo = type === 'devforge' ? '/devforge' : (type === 'school' ? '/sms' : '/parent');

    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Signing in...</title></head><body><script>localStorage.setItem('smsToken', ${token}); localStorage.setItem('smsUser', ${user}); localStorage.setItem('smsLastActivity', '${Date.now()}'); window.location.href='${redirectTo}';</script></body></html>`);
  } catch (err) {
    console.error('Google callback error', err);
    res.status(500).send('Google authentication failed');
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

async function start() {
  const basePort = Number(process.env.PORT) || 3000;
  const schedulersEnabled = process.env.ENABLE_SCHEDULERS === 'true';
  const skipDatabase = process.env.SKIP_DB === 'true' || process.env.START_WITHOUT_DB === 'true';

  const launchServer = async (port) => {
    if (!skipDatabase) {
      try {
        await connectDB();
      } catch (error) {
        console.error('Failed to connect to database during startup:', error.message);
        process.exit(1);
      }
    } else {
      try {
        await connectDB();
      } catch (error) {
        console.warn('Skipping database startup for testing because SKIP_DB is set:', error.message);
      }
    }

    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);

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
