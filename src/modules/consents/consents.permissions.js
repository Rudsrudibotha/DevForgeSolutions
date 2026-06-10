// src/modules/consents/consents.permissions.js
//
// Permission aliases and helper guards for the Consents feature.
// Mirrors the alias map pattern in src/security/schoolPermissions.js.

const { hasSchoolPermission } = require('../../security/schoolPermissions');

const VIEW = ['school.consent.view', 'school.consent.manage'];
const MANAGE = ['school.consent.manage'];

function canView(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'parent') return true;
  return hasSchoolPermission(user, ...VIEW);
}

function canManage(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return hasSchoolPermission(user, ...MANAGE);
}

module.exports = { canView, canManage, VIEW, MANAGE };
