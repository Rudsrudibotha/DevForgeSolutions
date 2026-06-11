'use strict';

// Portal-layer auth middleware. The original src/middleware/auth.js stays
// untouched so the existing /api/* JSON contract is preserved. This module
// provides the same token verification for SSR routes, returning HTML when
// the request fails (redirects for unauthenticated, rendered error pages
// for forbidden).

const jwt = require('jsonwebtoken');
const UserService = require('../business/userService');
const { isAuthDisabled, buildTestAuthResponse } = require('../security/testAuth');

const userService = new UserService();

function readToken(req) {
  const auth = req.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  if (req.cookies && req.cookies.kch_token) {
    return req.cookies.kch_token;
  }
  return null;
}

function isDbError(error) {
  if (!error) return false;
  return ['ConnectionError', 'RequestError'].includes(error.name)
    || ['ELOGIN', 'ESOCKET', 'ETIMEOUT', 'ECONNCLOSED', 'ENOTOPEN'].includes(error.code);
}

async function loadUser(req, _res, next) {
  // When auth is disabled (local dev), inject the test user. Tests can
  // override the role/school per-request via X-Test-Role / X-Test-School-Id
  // headers when NODE_ENV is not production.
  if (isAuthDisabled()) {
    try {
      const auth = buildTestAuthResponse();
      let role = auth.user.role;
      let schoolId = auth.user.schoolId;

      if (process.env.NODE_ENV !== 'production') {
        // Tests use the X-Test-Role header; browsers can use ?testRole=admin
        // (persisted in a cookie) to preview the other dashboards locally.
        const queryRole = String((req.query && req.query.testRole) || '').toLowerCase();
        const cookieRole = String((req.cookies && req.cookies.kch_test_role) || '').toLowerCase();
        const overrideRole = String(req.get('x-test-role') || '').toLowerCase() || queryRole || cookieRole;
        if (['parent', 'school', 'admin'].includes(overrideRole)) role = overrideRole;
        if (['parent', 'school', 'admin'].includes(queryRole) && _res && _res.cookie) {
          _res.cookie('kch_test_role', queryRole, { httpOnly: true, sameSite: 'lax' });
        }
        const overrideSchool = Number(req.get('x-test-school-id'));
        if (Number.isInteger(overrideSchool) && overrideSchool > 0) schoolId = overrideSchool;
      }

      req.user = {
        id: auth.user.id,
        email: auth.user.email,
        role,
        firstName: 'Test',
        lastName: 'User',
        schoolId: role === 'school' ? schoolId : null,
        permissions: auth.user.permissions || [],
        SchoolPermissions: auth.user.permissions || [],
        PermissionSet: auth.user.permissions || []
      };
      return next();
    } catch (_) { return next(); }
  }

  const token = readToken(req);
  if (!token) return next();

  try {
    if (!process.env.JWT_SECRET) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    let user = null;
    try { user = await userService.getUserById(decoded.userId); }
    catch (err) {
      if (isDbError(err)) {
        // Surface a soft error so the portal can render an offline state.
        req.userLoadError = 'Database unavailable';
        return next();
      }
      throw err;
    }

    if (!user) return next();

    // Honour token-bound dashboard context. One account can be school
    // staff and a parent: the login shell picks the session role, and we
    // verify the matching relationship before applying it.
    let activeRole = user.Role;
    let activeSchoolId = user.SchoolID;
    if (decoded.role === 'school' && decoded.schoolId && ['school', 'admin', 'parent'].includes(user.Role)) {
      const membership = await userService.getActiveStaffMembership(user.UserID, decoded.schoolId).catch(() => null);
      if (membership) { activeRole = 'school'; activeSchoolId = decoded.schoolId; }
    }
    if (decoded.role === 'parent' && user.Role !== 'parent' && user.Role !== 'admin') {
      const links = await userService.getParentLinkedSchools(user.UserID).catch(() => []);
      if (links.length) { activeRole = 'parent'; activeSchoolId = null; }
    }

    req.user = {
      id: user.UserID,
      email: user.Email,
      role: activeRole,
      firstName: user.FirstName || user.Username || '',
      lastName: user.LastName || '',
      schoolId: activeSchoolId,
      permissions: [],
      // Set when a DevForge admin is impersonating this user. Drives the
      // portal banner so the session is never silent.
      impersonatorId: decoded.imp || null
    };
  } catch (_) { /* invalid token, render as anonymous */ }
  next();
}

function requireAuth(req, res, next) {
  if (req.userLoadError) {
    return res.status(503).render('errors/offline', { user: null, message: req.userLoadError });
  }
  if (!req.user) {
    const next_url = encodeURIComponent(req.originalUrl || '/');
    return res.redirect('/login?next=' + next_url);
  }
  next();
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl || '/'));
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'You do not have access to this area.' });
    }
    next();
  };
}

// Resolve the active school for school-role users. Caches on req for the
// request lifecycle so partials don't re-query.
async function loadCurrentSchool(req, res, next) {
  if (!req.user || req.user.role !== 'school' || !req.user.schoolId) {
    res.locals.currentSchool = null;
    return next();
  }
  try {
    const SchoolService = require('../business/schoolService');
    const schoolService = new SchoolService();
    const school = await schoolService.getSchoolById(req.user.schoolId).catch(() => null);
    res.locals.currentSchool = school;
    req.currentSchool = school;
  } catch (_) {
    res.locals.currentSchool = null;
    req.currentSchool = null;
  }
  next();
}

module.exports = { loadUser, requireAuth, requireRole, loadCurrentSchool, readToken };
