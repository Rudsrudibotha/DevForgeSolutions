// Single source of truth for the SMS access matrix.
//
// Each GROUP (e.g. "School", "Finance") has a list of LEAVES
// (e.g. "Students", "Invoices"). Each leaf has a permissionKey
// (the same string already used by requireSchoolPermission
// everywhere else in the codebase). Each group also has a
// permissionKey which is "feature-group.<slug>" - when an admin
// grants the group, every leaf in it becomes allowed; when they
// deny the group, every leaf becomes denied.
//
// The catalog is consumed by:
//   - src/security/permissionResolver.js  (user -> effective set)
//   - src/application/portal/smsRoutes.js (the /sms/permissions matrix UI)
//   - src/security/sidebarVisibility.js   (filter denied nav items)
//   - src/middleware/requireFeature.js    (route gating)
//
// If you add a new SMS feature, add it here AND seed the matching
// permission key in db/schema.sql (so the matrix UI can show it).

'use strict';

const FEATURE_CATALOG = [
  {
    key: 'feature-group.school',
    label: 'School',
    description: 'Students, families, classes, attendance, staff, leave, payslips.',
    leaves: [
      { key: 'school.students.view',     label: 'Students',   path: '/sms/students' },
      { key: 'school.families.view',     label: 'Families',   path: '/sms/families' },
      { key: 'school.classes.view',      label: 'Classes',    path: '/sms/classes' },
      { key: 'attendance.view_all',      label: 'Attendance', path: '/sms/attendance' },
      { key: 'school.staff.view',        label: 'Staff',      path: '/sms/staff' },
      { key: 'leave.view',               label: 'Leave',      path: '/sms/leave' },
      { key: 'payslips.view',            label: 'Payslips',   path: '/sms/payslips' }
    ]
  },
  {
    key: 'feature-group.finance',
    label: 'Finance',
    description: 'Invoices, payments, outstanding, refunds, adjustments, bank reconciliation.',
    leaves: [
      { key: 'finance.invoices.view',           label: 'Invoices',       path: '/sms/invoices' },
      { key: 'finance.payments.view',           label: 'Payments',       path: '/sms/payments' },
      { key: 'finance.outstanding_fees.view',   label: 'Outstanding',    path: '/sms/outstanding' },
      { key: 'finance.bank_reconciliation.view', label: 'Bank statements', path: '/sms/bank-statements' },
      { key: 'finance.bank_reconciliation.approve_match', label: 'Reconciliation', path: '/sms/bank-reconciliation' },
      { key: 'finance.refunds.create',          label: 'Refunds',        path: '/sms/refunds' },
      { key: 'finance.adjustments.create',      label: 'Adjustments',    path: '/sms/adjustments' },
      { key: 'finance.period_lock.manage',      label: 'Period locks',   path: '/sms/period-locks' },
      { key: 'finance.year_end_close',          label: 'Year-end close', path: '/sms/year-end' },
      { key: 'finance.rollover.manage',         label: 'Re-enrolment',   path: '/sms/reenrolment' },
      { key: 'school.consent.view',             label: 'Consents',       path: '/sms/consents' },
      { key: 'reports.view',                    label: 'Reports',        path: '/sms/reports' }
    ]
  },
  {
    key: 'feature-group.kch',
    label: 'Kinder Care Hub',
    description: 'In-app messaging between school, parents, and DevForge.',
    leaves: [
      { key: 'messaging.school.use', label: 'Messages', path: '/sms/kch' }
    ]
  },
  {
    key: 'feature-group.settings',
    label: 'Settings',
    description: 'School profile, school account, users, permissions, audit log, subscription.',
    leaves: [
      { key: 'school.profile.view',         label: 'School profile',  path: '/sms/settings' },
      { key: 'school.account.view',         label: 'School account',  path: '/sms/settings/school-account' },
      { key: 'school.staff.manage',         label: 'System users',    path: '/sms/users' },
      { key: 'permissions.view',            label: 'Permissions',     path: '/sms/permissions' },
      { key: 'school.audit.view',           label: 'Audit log',       path: '/sms/audit' },
      { key: 'school.subscription.view',    label: 'Subscription',    path: '/sms/settings/subscription' }
    ]
  },
  {
    key: 'feature-group.ai',
    label: 'AI',
    description: 'Kinder Care Hub AI assistant and bank reconciliation suggestions.',
    leaves: [
      { key: 'ai.chatbot.use', label: 'AI assistant', path: '/sms/kch' }
    ]
  }
];

// Flat list of all permission keys the catalog knows about.
function allPermissionKeys() {
  const out = [];
  for (const group of FEATURE_CATALOG) {
    out.push(group.key);
    for (const leaf of group.leaves) out.push(leaf.key);
  }
  return out;
}

// Map permission key -> path (for sidebar filtering).
function keyToPath() {
  const out = {};
  for (const group of FEATURE_CATALOG) {
    for (const leaf of group.leaves) out[leaf.key] = leaf.path;
  }
  return out;
}

// Map permission key -> group key (so resolver can ask "is the group
// granted or denied?").
function keyToGroup() {
  const out = {};
  for (const group of FEATURE_CATALOG) {
    out[group.key] = group.key;
    for (const leaf of group.leaves) out[leaf.key] = group.key;
  }
  return out;
}

// Default grants applied to a freshly created role.
// "School" and "Finance" are on by default; the rest is off.
const DEFAULT_GRANTS = (function () {
  const out = {};
  for (const group of FEATURE_CATALOG) {
    const isOnByDefault = (group.key === 'feature-group.school' || group.key === 'feature-group.finance');
    out[group.key] = isOnByDefault ? 'Allow' : 'Inherit';
    for (const leaf of group.leaves) {
      out[leaf.key] = isOnByDefault ? 'Allow' : 'Inherit';
    }
  }
  return out;
})();

module.exports = {
  FEATURE_CATALOG,
  allPermissionKeys,
  keyToPath,
  keyToGroup,
  DEFAULT_GRANTS
};
