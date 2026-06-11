'use strict';

// /account — self-service account settings, shared by all three portals.
// Mounted with requireAuth in portal/index.js; CSRF is verified there too
// (verifyCsrf runs on every non-GET portal request).

const express = require('express');
const router = express.Router();
const UserService = require('../../business/userService');
const { getAudit } = require('../../middleware/auditTrail');

const userService = new UserService();

function safeCall(promise, fallback) {
  return promise.catch(err => {
    console.warn('[account] data call failed, returning fallback:', err.message);
    return fallback;
  });
}

// Audit self-service account changes. AuditLog rows require a SchoolID,
// so changes by actors without a school context (platform admins,
// parents not linked to a school) are not tenant-auditable — skip them.
// Never include the submitted values: names are PII and passwords must
// never be persisted anywhere besides the bcrypt hash.
async function auditAccountChange(req, action) {
  if (!req.user || !req.user.schoolId) return;
  try {
    await getAudit().recordWrite(req.user, req.user.schoolId, 'user', req.user.id, action, null, null, { path: req.originalUrl });
  } catch (err) {
    console.warn('[account] audit write failed:', err.message);
  }
}

function respond(req, res, { ok, message, status }) {
  const type = ok ? 'success' : 'error';
  if (req.headers['hx-request'] === 'true') {
    res.set('HX-Trigger', JSON.stringify({ toast: { type, message } }));
    if (ok) res.set('HX-Redirect', '/account');
    return res.status(ok ? 204 : (status || 400)).end();
  }
  return res.redirect('/account?' + (ok ? 'saved=1' : 'error=' + encodeURIComponent(message)));
}

// Account settings page
router.get('/', async (req, res, next) => {
  try {
    res.locals.title = 'Account settings | Kinder Care Hub';
    // registerLocals defaults portal to 'sms' before loadUser has run;
    // /account is shared, so re-derive it from the actual role.
    res.locals.portal = req.user.role === 'admin' ? 'devforge' : (req.user.role === 'parent' ? 'parent' : 'sms');
    // Fall back to the session user when the DB is unavailable (local
    // dev with SKIP_DB, or transient outage) so the page still renders.
    const row = await safeCall(userService.getUserById(req.user.id), null);
    const profile = {
      firstName: (row && row.FirstName) || req.user.firstName || '',
      lastName: (row && row.LastName) || req.user.lastName || '',
      username: (row && row.Username) || '',
      email: (row && row.Email) || req.user.email || '',
      role: req.user.role,
      memberSince: row && row.CreatedDate ? row.CreatedDate : null
    };
    res.render('auth/account', {
      profile,
      saved: req.query.saved === '1',
      error: req.query.error ? String(req.query.error) : null
    });
  } catch (err) { next(err); }
});

// Update display name
router.post('/profile', async (req, res, next) => {
  try {
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    if (!firstName) {
      return respond(req, res, { ok: false, message: 'First name is required.' });
    }
    const ok = await safeCall(userService.updateProfile(req.user.id, { firstName, lastName }), false);
    if (!ok) {
      return respond(req, res, { ok: false, message: 'Could not save your profile. Please try again.', status: 500 });
    }
    await auditAccountChange(req, 'UPDATE');
    return respond(req, res, { ok: true, message: 'Profile saved.' });
  } catch (err) { next(err); }
});

// Change password
router.post('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return respond(req, res, { ok: false, message: 'New password must be at least 8 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return respond(req, res, { ok: false, message: 'New passwords do not match.' });
    }
    try {
      await userService.changePassword(req.user.id, currentPassword, newPassword);
    } catch (err) {
      // Service errors are user-facing ("Current password is incorrect");
      // DB connectivity errors are not — show a generic message for those.
      const message = /password|account/i.test(err.message) ? err.message : 'Could not change your password. Please try again.';
      return respond(req, res, { ok: false, message });
    }
    await auditAccountChange(req, 'UPDATE');
    return respond(req, res, { ok: true, message: 'Password changed.' });
  } catch (err) { next(err); }
});

module.exports = router;
