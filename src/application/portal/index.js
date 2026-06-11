'use strict';

const express = require('express');
const router = express.Router();

const { loadUser, requireAuth, requireRole, loadCurrentSchool } = require('../../middleware/portalAuth');
const { issueCsrf, verifyCsrf } = require('../../middleware/csrf');
const scopeToSchool = require('../../middleware/scopeToSchool');

const parentRoutes = require('./parentRoutes');
const schoolRoutes = require('./smsRoutes');
const devforgeRoutes = require('./devforgeRoutes');
const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');
const { SMS_NAV, DEVFORGE_NAV, PARENT_NAV } = require('../../security/navSpec');
const { getEffectivePermissions } = require('../../security/permissionResolver');
const { applyNavVisibility } = require('../../middleware/portalLocals');

// Common middleware: load user, issue CSRF, verify CSRF on writes, expose locals
router.use(loadUser);
router.use(issueCsrf);
router.use(verifyCsrf);

// Public auth routes (also handles /login at root)
router.use('/auth', authRoutes);
router.get('/login', (req, res, next) => authRoutes.handle(Object.assign(req, { url: '/login' + (req.url.indexOf('?') >= 0 ? req.url.slice(req.url.indexOf('?')) : '') }), res, next));
router.get('/parent/verify', (req, res) => {
  res.locals.title = 'Parent Verification | Kinder Care Hub';
  res.locals.portal = 'parent';
  res.render('parent/verify');
});
router.get('/parent/verify/check-email', (req, res) => {
  res.locals.title = 'Check your email | Kinder Care Hub';
  res.locals.portal = 'parent';
  res.render('parent/verify-check-email');
});
router.get('/parent/magic', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect('/api/parent-verification/magic' + query);
});

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function portalFromRequest(req) {
  const referer = String(req.get('referer') || '');
  if (/\/devforge(?:\/|$)/.test(referer)) return 'devforge';
  if (/\/parent(?:\/|$)/.test(referer)) return 'parent';
  if (/\/sms(?:\/|$)/.test(referer)) return 'sms';
  if (req.user && req.user.role === 'admin') return 'devforge';
  if (req.user && req.user.role === 'parent') return 'parent';
  return 'sms';
}

async function visibleSearchGroups(req, portal) {
  const nav = portal === 'devforge' ? DEVFORGE_NAV : portal === 'parent' ? PARENT_NAV : SMS_NAV;
  if (req.user && req.user.role === 'admin' && portal === 'devforge') return nav;
  try {
    const visibleSet = await getEffectivePermissions(req.user);
    return applyNavVisibility(nav, visibleSet);
  } catch (_) {
    return nav;
  }
}

router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q || req.query.search || '').trim().toLowerCase();
    const portal = portalFromRequest(req);
    const groups = await visibleSearchGroups(req, portal);
    const matches = [];
    for (const group of groups) {
      for (const item of group.items || []) {
        const haystack = [item.label, group.label, item.href].join(' ').toLowerCase();
        if (!query || haystack.includes(query)) {
          matches.push({ group: group.label, label: item.label, href: item.href });
        }
      }
    }
    if (!matches.length) {
      return res.send('<p class="text-sm text-muted px-2 py-3">No matching dashboard links.</p>');
    }
    res.send(matches.slice(0, 8).map(item =>
      '<a class="nav-item" href="' + escapeHtml(item.href) + '">' +
        '<span class="flex-1 min-w-0">' +
          '<span class="block font-medium truncate">' + escapeHtml(item.label) + '</span>' +
          '<span class="block text-xs text-muted truncate">' + escapeHtml(item.group) + '</span>' +
        '</span>' +
      '</a>'
    ).join(''));
  } catch (err) { next(err); }
});

// Account settings: any signed-in role (linked from the header dropdown)
router.use('/account', requireAuth, accountRoutes);

// Protected portal shells.
// SMS gets scopeToSchool so every DB call is auto-scoped to req.user.schoolId.
router.use('/parent', requireAuth, requireRole('parent'), parentRoutes);
router.use('/sms',    requireAuth, requireRole('school', 'admin'), loadCurrentSchool, scopeToSchool, schoolRoutes);
router.use('/devforge', requireAuth, requireRole('admin'), devforgeRoutes);

module.exports = router;
