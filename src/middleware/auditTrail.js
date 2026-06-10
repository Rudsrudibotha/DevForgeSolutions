'use strict';

// Express middleware helpers for audit logging.
//
//   - auditAdminRead(resourceType)  - call inside a handler to record an
//     admin's read of a specific school resource. Safe to call multiple
//     times per request.
//   - auditAdminWrite(resourceType) - record a write action. Awaited.
//
// Both helpers do nothing for non-admin actors, so they are safe to leave
// in place across all routes.

const AuditRepository = require('../data/auditRepository');

function getAudit() {
  if (!getAudit._instance) getAudit._instance = new AuditRepository();
  return getAudit._instance;
}

// Records an admin read of a single school-scoped resource.
//   schoolId:      the school that owns the resource
//   resourceType:  'student' | 'invoice' | 'payment' | etc.
//   resourceId:    the row's id
//   meta:          optional free-form object (request id, query params, etc.)
function auditAdminRead(schoolId, resourceType, resourceId, meta) {
  return function (req, _res, next) {
    if (!req.user || req.user.role !== 'admin') return next();
    if (!schoolId || schoolId === req.user.schoolId) return next();
    getAudit().recordReadAsync(req.user, schoolId, resourceType, resourceId, meta || { path: req.originalUrl });
    next();
  };
}

// Wrap an async route handler so its writes are recorded when the handler
// completes. The handler receives (req, res, next, record) where record
// is an async function (resourceType, resourceId, action, before, after).
function withAudit(handler) {
  return async function (req, res, next) {
    const audit = getAudit();
    const record = (resourceType, resourceId, action, before, after, meta) => {
      const schoolId = req.body && req.body.schoolId
        ? Number(req.body.schoolId)
        : (req.query.schoolId ? Number(req.query.schoolId) : (req.user.schoolId || null));
      if (!schoolId) {
        return Promise.reject(new Error('withAudit: could not determine schoolId for audit row'));
      }
      return audit.recordWrite(req.user, schoolId, resourceType, resourceId, action, before, after, meta);
    };
    try {
      await handler(req, res, next, record);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { auditAdminRead, withAudit, getAudit };
