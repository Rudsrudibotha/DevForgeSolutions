'use strict';

const express = require('express');
const router = express.Router();
const AdminSchoolService = require('../../business/adminSchoolService');
const AdminUserService = require('../../business/adminUserService');
const AdminPaymentService = require('../../business/adminPaymentService');
const AdminAuditService = require('../../business/adminAuditService');
const AdminSettingsService = require('../../business/adminSettingsService');
const adminSchoolService = new AdminSchoolService();
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
    const kpis = await safeCall(adminSchoolService.getKpis({ actor: req.user }), {});
    const data = await safeCall(adminSchoolService.list({ actor: req.user, pageSize: 5 }), { rows: [] });
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

router.get('/schools/:id([1-9]\\d+)', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'School | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'schools';
    const school = await safeCall(adminSchoolService.getById({ actor: req.user, schoolId: Number(req.params.id) }), null);
    if (!school) return res.status(404).render('errors/csrf', { message: 'School not found.' });
    res.render('devforge/schools/detail', { school });
  } catch (err) { next(err); }
});

router.post('/schools/:id([1-9]\\d+)/status', requireAuth, requireAdmin, async (req, res, next) => {
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
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Status updated to ' + newStatus + '.' } }));
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

router.get('/users/:id([1-9]\\d+)', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.locals.title = 'User | DevForge';
    res.locals.portal = 'devforge';
    res.locals.activeNav = 'users';
    const user = await safeCall(adminUserService.getById({ actor: req.user, userId: Number(req.params.id) }), null);
    if (!user) return res.status(404).render('errors/csrf', { message: 'User not found.' });
    res.render('devforge/users/detail', { user });
  } catch (err) { next(err); }
});

router.post('/users/:id([1-9]\\d+)/active', requireAuth, requireAdmin, async (req, res, next) => {
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
    return res.status(204).end();
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message || 'Update failed' } }));
    if (req.headers['hx-request'] === 'true') return res.status(400).end();
    next(err);
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
