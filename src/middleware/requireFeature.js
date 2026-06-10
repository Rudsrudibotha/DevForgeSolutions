// requireFeature: gate a route on a feature catalog key.
// 200/204/302 for allowed; 403 for denied (renders sms/errors/forbidden.ejs).
//
// Usage:
//   router.get('/invoices', requireFeature('finance.invoices.view'), handler);
//
// This is layered ON TOP of requireSchoolPermission (which checks
// the legacy permission keys). requireFeature additionally checks
// the new per-role Allow/Deny matrix.

'use strict';

const { hasFeature } = require('../security/permissionResolver');

function requireFeature(permissionKey) {
  return async function (req, res, next) {
    try {
      const allowed = await hasFeature(req.user, permissionKey);
      if (!allowed) {
        if (req.headers['hx-request'] === 'true') {
          res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'You do not have access to this feature.' } }));
          return res.status(204).end();
        }
        return res.status(403).render('errors/forbidden', {
          user: req.user,
          message: 'You do not have access to this feature. Ask your school administrator to enable it under Settings -> Permissions.'
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireFeature };
