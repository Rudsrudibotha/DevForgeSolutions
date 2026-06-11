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

// Common middleware: load user, issue CSRF, verify CSRF on writes, expose locals
router.use(loadUser);
router.use(issueCsrf);
router.use(verifyCsrf);

// Public auth routes (also handles /login at root)
router.use('/auth', authRoutes);
router.get('/login', (req, res, next) => authRoutes.handle(Object.assign(req, { url: '/login' + (req.url.indexOf('?') >= 0 ? req.url.slice(req.url.indexOf('?')) : '') }), res, next));

// Account settings: any signed-in role (linked from the header dropdown)
router.use('/account', requireAuth, accountRoutes);

// Protected portal shells.
// SMS gets scopeToSchool so every DB call is auto-scoped to req.user.schoolId.
router.use('/parent', requireAuth, requireRole('parent'), parentRoutes);
router.use('/sms',    requireAuth, requireRole('school', 'admin'), loadCurrentSchool, scopeToSchool, schoolRoutes);
router.use('/devforge', requireAuth, requireRole('admin'), devforgeRoutes);

module.exports = router;
