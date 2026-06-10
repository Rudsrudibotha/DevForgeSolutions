'use strict';

const crypto = require('crypto');

const CSRF_COOKIE = 'kch_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const IGNORE_PATHS = ['/api/users/login', '/api/users/register', '/health'];

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Issues a CSRF token cookie if missing and exposes it on the request.
function issueCsrf(req, res, next) {
  let token = req.cookies && req.cookies[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(24).toString('base64url');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by meta tag and JS for htmx
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
  }
  req.csrfToken = token;
  res.locals.csrfToken = token;
  next();
}

// Verifies the CSRF token for unsafe HTTP methods. Htmx sends the header
// automatically because we set hx-headers on the body tag.
function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.path.startsWith('/api/')) return next(); // JWT-protected API
  if (IGNORE_PATHS.includes(req.path)) return next();

  const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER) || req.body && req.body._csrf;

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return res.status(403).render('errors/csrf', { message: 'Your session token is invalid or expired. Please refresh and try again.' });
  }
  next();
}

module.exports = { issueCsrf, verifyCsrf, CSRF_COOKIE, CSRF_HEADER };
