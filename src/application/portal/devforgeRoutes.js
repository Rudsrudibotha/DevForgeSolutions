'use strict';

const express = require('express');
const router = express.Router();
const AdminSchoolService = require('../../business/adminSchoolService');
const AdminUserService = require('../../business/adminUserService');
const AdminPaymentService = require('../../business/adminPaymentService');
const AdminAuditService = require('../../business/adminAuditService');
const AdminSettingsService = require('../../business/adminSettingsService');
const SchoolOnboardingService = require('../../business/schoolOnboardingService');
const UserService = require('../../business/userService');
const { demoOr } = require('../../business/demoData');
const adminSchoolService = new AdminSchoolService();
const schoolOnboardingService = new SchoolOnboardingService();
const userService = new UserService();
const adminUserService = new AdminUserService();
const adminPaymentService = new AdminPaymentService();
const adminAuditService = new AdminAuditService();
const adminSettingsService = new AdminSettingsService();

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin') {
    return res.status(403).render('errors/forbidden', { user: req.user, message: 'Admin access required.' });
  }
  next();
}

function safeCall(promise, fallback) {
  return promise.catch(err => {
    console.warn('[devforge] data call failed, returning fallback:', err.message);
    return fallback;
  });
}

// ========================================================
// DevForge Admin - Schools
// ========================================================

// Landing dashboard with KPIs + schools summary
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'DevForge | Platform overview';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'home';
    const kpis = await safeCall(adminSchoolService.getKpis({ actor: req.user }), demoOr('devforgeKpis', {}));
    const data = await safeCall(adminSchoolService.list({ actor: req.user, pageSize: 5 }), demoOr('devforgeRecentSchools', { rows: [] }));
    res.render('devforge/dashboard', { kpis, recentSchools: data.rows });
  } catch (err) { next(err); }
});

router.get('/schools', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Schools | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'schools';
    const data = await safeCall(adminSchoolService.list({
      actor: req.user,
      search: req.query.q,
      plan: req.query.plan,
      status: req.query.status,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', plan: '', status: '' } });
    res.render('devforge/schools/list', data);
  } catch (err) { next(err); }
});

router.get('/schools/partials/table', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await safeCall(adminSchoolService.list({
      actor: req.user,
      search: req.query.q,
      plan: req.query.plan,
      status: req.query.status,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', plan: '', status: '' } });
    res.render('devforge/schools/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

// Register a new school: one form creates the school tenant plus its
// owner user (Employee record + 'Owner' staff role with full access).
// Optionally prefilled from a pending public registration request.
router.get('/schools/new', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Register school | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'schools';
    const requests = await safeCall(schoolOnboardingService.listPendingRequests({ actor: req.user }), []);
    let form = {};
    let requestId = null;
    if (/^[1-9]\d*$/.test(String(req.query.requestId || ''))) {
      const request = await safeCall(schoolOnboardingService.getRequest({ actor: req.user, requestId: Number(req.query.requestId) }), null);
      if (request && request.Status === 'Pending') {
        requestId = request.RequestID;
        const nameParts = String(request.ContactPerson || '').trim().split(/\s+/).filter(Boolean);
        form = {
          schoolName: request.SchoolName,
          address: request.Address,
          contactPerson: request.ContactPerson,
          contactEmail: request.ContactEmail,
          contactPhone: request.ContactPhone,
          website: request.Website,
          subscriptionPlan: request.RequestedPlan,
          ownerFirstName: nameParts.shift() || '',
          ownerLastName: nameParts.join(' '),
          ownerEmail: request.ContactEmail
        };
      }
    }
    res.render('devforge/schools/new', { form, requests, requestId, error: null });
  } catch (err) { next(err); }
});

router.post('/schools', requireAuth, requireAdmin, async (req, res, next) => {
  const form = {
    schoolName: req.body.schoolName,
    address: req.body.address,
    contactPerson: req.body.contactPerson,
    contactEmail: req.body.contactEmail,
    contactPhone: req.body.contactPhone,
    website: req.body.website,
    subscriptionPlan: req.body.subscriptionPlan,
    ownerFirstName: req.body.ownerFirstName,
    ownerLastName: req.body.ownerLastName,
    ownerEmail: req.body.ownerEmail
  };
  try {
    res.locals.title = 'Register school | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'schools';
    const result = await schoolOnboardingService.registerSchool({
      actor: req.user,
      school: form,
      owner: {
        firstName: form.ownerFirstName,
        lastName: form.ownerLastName,
        email: form.ownerEmail
      },
      requestId: req.body.requestId
    });
    res.render('devforge/schools/onboarded', result);
  } catch (err) {
    if (res.headersSent) return next(err);
    const requests = await safeCall(schoolOnboardingService.listPendingRequests({ actor: req.user }), []);
    res.status(400).render('devforge/schools/new', {
      form,
      requests,
      requestId: /^[1-9]\d*$/.test(String(req.body.requestId || '')) ? Number(req.body.requestId) : null,
      error: err.message || 'Could not register the school.'
    });
  }
});

router.get('/schools/:id([1-9]\\d*)', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'School | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'schools';
    const school = await safeCall(adminSchoolService.getById({ actor: req.user, schoolId: Number(req.params.id) }), null);
    if (!school) return res.status(404).render('errors/csrf', { message: 'School not found.' });
    res.render('devforge/schools/detail', { school });
  } catch (err) { next(err); }
});

router.post('/schools/:id([1-9]\\d*)/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const newStatus = String(req.body.status || '').trim();
    const reason = String(req.body.reason || '').trim();
    if (!reason || reason.length < 4) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'A reason (4+ chars) is required.' } }));
      return res.status(400).end();
    }
    const ok = await safeCall(adminSchoolService.updateStatus({ actor: req.user, schoolId: id, newStatus, reason }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not update status.' } }));
      return res.status(500).end();
    }
    // Reload so the new status (and its actions) render immediately.
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Status updated to ' + newStatus + '.' } }));
    res.set('HX-Refresh', 'true');
    return res.status(204).end();
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message || 'Update failed' } }));
    if (req.headers['hx-request'] === 'true') return res.status(400).end();
    next(err);
  }
});

// ========================================================
// DevForge Admin - Users
// ========================================================
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Users | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'users';
    const data = await safeCall(adminUserService.list({
      actor: req.user,
      search: req.query.q,
      role: req.query.role,
      schoolId: req.query.schoolId,
      status: req.query.status,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', role: '', schoolId: '', status: '' } });
    const schools = await safeCall(adminUserService.listSchools({ actor: req.user }), []);
    res.render('devforge/users/list', { ...data, schools });
  } catch (err) { next(err); }
});

router.get('/users/partials/table', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await safeCall(adminUserService.list({
      actor: req.user,
      search: req.query.q,
      role: req.query.role,
      schoolId: req.query.schoolId,
      status: req.query.status,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', role: '', schoolId: '', status: '' } });
    res.render('devforge/users/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

router.get('/users/:id([1-9]\\d*)', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'User | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'users';
    const user = await safeCall(adminUserService.getById({ actor: req.user, userId: Number(req.params.id) }), null);
    if (!user) return res.status(404).render('errors/csrf', { message: 'User not found.' });
    res.render('devforge/users/detail', { user });
  } catch (err) { next(err); }
});

router.post('/users/:id([1-9]\\d*)/active', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const isActive = req.body.isActive === 'true' || req.body.isActive === '1';
    const reason = String(req.body.reason || '').trim();
    if (!reason || reason.length < 4) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'A reason (4+ chars) is required.' } }));
      return res.status(400).end();
    }
    const ok = await safeCall(adminUserService.setActive({ actor: req.user, userId: id, isActive, reason }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not update user.' } }));
      return res.status(404).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: isActive ? 'User enabled.' : 'User disabled.' } }));
    res.set('HX-Refresh', 'true');
    return res.status(204).end();
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message || 'Update failed' } }));
    if (req.headers['hx-request'] === 'true') return res.status(400).end();
    next(err);
  }
});

// Sign in AS a school or parent user (support tool). Authorised, audited,
// and the user is emailed — see AdminUserService.prepareImpersonation.
// Issues a 1-hour session token carrying an `imp` claim so the portal
// shows a persistent "you are impersonating" banner.
router.post('/users/:id([1-9]\\d*)/impersonate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body.reason || '').trim();
    const { target, role, schoolId } = await adminUserService.prepareImpersonation({ actor: req.user, userId: id, reason });
    const token = userService.signImpersonationToken({ target, role, schoolId, impersonatorId: req.user.id });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('kch_token', token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 1000, secure: isProd
    });
    res.set('Cache-Control', 'no-store');
    return res.redirect(role === 'parent' ? '/parent' : '/sms');
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message || 'Could not sign in as user' } }));
    if (req.headers['hx-request'] === 'true') return res.status(400).end();
    return res.status(400).render('errors/forbidden', { user: req.user, message: err.message || 'Could not sign in as user' });
  }
});

// ========================================================
// DevForge Admin - Payments (cross-school ledger)
// ========================================================
router.get('/payments', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Payments | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'payments';
    const data = await safeCall(adminPaymentService.list({
      actor: req.user,
      search: req.query.q,
      schoolId: req.query.schoolId,
      allocationStatus: req.query.allocationStatus,
      paymentMethod: req.query.paymentMethod,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, totalAmount: 0, page: 1, pageSize: 25, hasMore: false, kpis: { totalAmount: 0, pageAllocated: 0, pageUnallocated: 0, pagePending: 0 }, filters: { search: '', schoolId: '', allocationStatus: '', paymentMethod: '', from: '', to: '' } });
    const [kpis, schools] = await Promise.all([
      safeCall(adminPaymentService.getKpis({ actor: req.user }), {}),
      safeCall(adminPaymentService.listSchools({ actor: req.user }), [])
    ]);
    res.render('devforge/payments/list', { ...data, kpis, schools });
  } catch (err) { next(err); }
});

router.get('/payments/partials/table', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await safeCall(adminPaymentService.list({
      actor: req.user,
      search: req.query.q,
      schoolId: req.query.schoolId,
      allocationStatus: req.query.allocationStatus,
      paymentMethod: req.query.paymentMethod,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, totalAmount: 0, page: 1, pageSize: 25, hasMore: false, kpis: { totalAmount: 0, pageAllocated: 0, pageUnallocated: 0, pagePending: 0 }, filters: { search: '', schoolId: '', allocationStatus: '', paymentMethod: '', from: '', to: '' } });
    res.render('devforge/payments/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

// ========================================================
// DevForge Admin - Audit log (read-only, self-audited)
// ========================================================
router.get('/audit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Audit log | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'audit';
    const data = await safeCall(adminAuditService.list({
      actor: req.user,
      schoolId: req.query.schoolId,
      actorUserId: req.query.actorUserId,
      actorEmail: req.query.actorEmail,
      action: req.query.action,
      resourceType: req.query.resourceType,
      resourceId: req.query.resourceId,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: 50
    }), { rows: [], total: 0, page: 1, pageSize: 50, hasMore: false, filters: { schoolId: '', actorUserId: '', actorEmail: '', action: '', resourceType: '', resourceId: '', from: '', to: '' } });
    const [schools, actions, resourceTypes] = await Promise.all([
      safeCall(adminAuditService.listSchools({ actor: req.user }), []),
      safeCall(adminAuditService.listActions(), []),
      safeCall(adminAuditService.listResourceTypes({ actor: req.user }), [])
    ]);
    res.render('devforge/audit/list', { ...data, schools, actions, resourceTypes });
  } catch (err) { next(err); }
});

router.get('/audit/partials/table', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await safeCall(adminAuditService.list({
      actor: req.user,
      schoolId: req.query.schoolId,
      actorUserId: req.query.actorUserId,
      actorEmail: req.query.actorEmail,
      action: req.query.action,
      resourceType: req.query.resourceType,
      resourceId: req.query.resourceId,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: 50
    }), { rows: [], total: 0, page: 1, pageSize: 50, hasMore: false, filters: { schoolId: '', actorUserId: '', actorEmail: '', action: '', resourceType: '', resourceId: '', from: '', to: '' } });
    res.render('devforge/audit/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

// ========================================================
// DevForge Admin - Kinder Care Hub (messaging only, no AI per project rule)
// ========================================================
router.get('/kch', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Kinder Care Hub | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'kch';
    res.locals.sidebarOverride = 'devforge';
    res.render('partials/kch-chat', { showAi: false, sidebarOverride: 'devforge', currentUserId: req.user.id });
  } catch (err) { next(err); }
});

// ========================================================
// DevForge Admin - Settings + observability
// ========================================================
router.get('/settings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Settings | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'settings';
    const data = await safeCall(adminSettingsService.getDashboard({ actor: req.user }), { settings: [], health: null, platform: null, env: [], recentErrors: [] });
    res.render('devforge/settings/list', { ...data, csrfToken: req.csrfToken || '' });
  } catch (err) { next(err); }
});

router.post('/settings/:key([a-zA-Z][a-zA-Z0-9._-]{0,63})', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const value = req.body.value;
    if (value === undefined) return res.status(400).json({ error: 'value is required' });
    const updated = await safeCall(adminSettingsService.updateSetting({ actor: req.user, key: req.params.key, value: String(value) }), null);
    if (!updated) return res.status(400).json({ error: 'failed to update' });
    res.json({ ok: true, setting: updated });
  } catch (err) {
    if (/admin role required|invalid key|invalid value/.test(err.message)) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// ========================================================
// DevForge Admin - Subscription management
// ========================================================
router.get('/subscriptions', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'Subscriptions | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'subscriptions';
    res.render('devforge/subscriptions');
  } catch (err) { next(err); }
});

module.exports = router;
