'use strict';

const express = require('express');
const router = express.Router();
const { isAuthDisabled, buildTestAuthResponse } = require('../../security/testAuth');

// GET /login - render login form (delegated to legacy /login for actual auth)
router.get('/login', function (req, res) {
  if (isAuthDisabled() && String(req.query.next || '').trim()) {
    try {
      buildTestAuthResponse();
      return res.redirect(String(req.query.next).trim());
    } catch (_) { /* show login if test session cannot be built */ }
  }

  const next = String(req.query.next || '');
  const portal = String(req.query.portal || 'school');
  const schoolId = String(req.query.schoolId || '');
  const error = req.query.error ? 'Your session expired. Please sign in again.' : null;
  res.locals.title = 'Sign in | Kinder Care Hub';
  res.locals.portal = portal;
  res.locals.schoolId = schoolId;
  res.locals.next = next;
  res.locals.error = error;
  res.render('auth/login');
});

// POST /auth/logout - end the session. The JWT lives in the HttpOnly
// kch_token cookie, so clearing it is the authoritative sign-out. The
// legacy SPA's localStorage copy expires with the token (24h).
router.post('/logout', express.urlencoded({ extended: false, limit: '64kb' }), function (req, res) {
  res.clearCookie('kch_token', { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
  res.set('Cache-Control', 'no-store');
  res.redirect('/login');
});

// GET /auth/school-register and /auth/parent-register - the real
// registration pages live at the top-level paths served by app.js.
router.get('/school-register', function (req, res) {
  res.redirect('/school-register');
});

router.get('/parent-register', function (req, res) {
  res.redirect('/parent-register');
});

// POST /auth/portal-login - delegates to existing user login flow
router.post('/portal-login', express.urlencoded({ extended: false, limit: '1mb' }), function (req, res) {
  const { identifier, password, schoolId, portal, next } = req.body || {};
  const params = new URLSearchParams();
  if (identifier) params.set('identifier', identifier);
  if (password) params.set('password', password);
  if (schoolId) params.set('schoolId', schoolId);
  params.set('loginType', portal === 'parent' ? 'parent' : 'school');

  // Bridge to the existing API login
  const apiReq = {
    method: 'POST',
    url: '/api/users/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  };

  // For SSR we need to capture the response. Easiest: forward to the API
  // internally via http. But for now, redirect to a "logging you in" page
  // that does the actual POST and follows the redirect.
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html><html><body>
    <noscript>You need JavaScript to sign in.</noscript>
    <form id="f" method="post" action="/api/users/login">
      <input type="hidden" name="identifier" value="${escapeHtml(identifier || '')}" />
      <input type="hidden" name="password" value="${escapeHtml(password || '')}" />
      <input type="hidden" name="schoolId" value="${escapeHtml(schoolId || '')}" />
      <input type="hidden" name="loginType" value="${portal === 'parent' ? 'parent' : 'school'}" />
    </form>
    <script>document.getElementById('f').submit();</script>
  </body></html>`);
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = router;
