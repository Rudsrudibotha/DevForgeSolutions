const { getPool, sql } = require('../data/db');

const OWNER_PERMISSION = '*';

const PERMISSION_ALIASES = {
  'classes.view': ['school.classes.view', 'classes.view_assigned'],
  'classes.manage': ['school.classes.manage', 'school.classes.view'],
  'students.view': ['school.students.view'],
  'students.manage': ['school.students.manage', 'school.students.view'],
  'parents.view': ['school.parents.view'],
  'parents.manage': ['school.parents.manage', 'school.parents.view'],
  'staff.view': ['school.staff.view'],
  'staff.manage': ['school.staff.manage', 'school.staff.view'],
  'users.manage': [
    'school.staff.permissions.manage',
    'school.staff.manage',
    'school.staff.view',
    'school.consent.manage',
    'school.consent.view',
    'school.year_rollover.preview',
    'school.year_rollover.apply',
    'attendance.view_all',
    'attendance.edit_all',
    'reports.view'
  ],
  'attendance.capture': ['attendance.submit_assigned', 'attendance.view_assigned'],
  'finance.view': [
    'finance.invoices.view',
    'finance.payments.view',
    'finance.outstanding_fees.view',
    'finance.bank_reconciliation.view',
    'finance.registration_fees.view',
    'finance.audit.view'
  ],
  'invoices.manage': ['finance.invoices.create', 'finance.invoices.edit', 'finance.invoices.view'],
  'payments.allocate': ['finance.payments.allocate', 'finance.payments.view'],
  'reports.finance': ['reports.finance.view', 'reports.finance.export'],
  'hr.view': ['school.staff.view', 'leave.view_all', 'hr.view_payslips'],
  'hr.manage_leave': ['leave.manage_types', 'leave.manage_balances', 'leave.adjust_balances', 'leave.view_all'],
  'hr.manage_payslips': [
    'hr.manage_payslips',
    'hr.view_payslips',
    'payroll.generate',
    'payroll.review',
    'payroll.finalize',
    'payroll.view_previous',
    'sensitive.payroll.view'
  ],
  'school.messaging.send': [
    'school.messaging.view',
    'school.consent.manage',
    'school.parents.manage'
  ],
  'school.messaging.view': [
    'school.messaging.send',
    'school.consent.view',
    'school.parents.view'
  ]
};

const HR_LEGACY_PERMISSIONS = [
  'school.staff.view',
  'leave.view_all',
  'leave.approve',
  'leave.decline',
  'hr.view_payslips',
  'hr.manage_payslips',
  'payroll.generate',
  'payroll.review',
  'payroll.finalize',
  'payroll.view_previous',
  'sensitive.payroll.view'
];

const SENSITIVE_PERMISSIONS = [
  'school.staff.permissions.manage',
  'finance.refunds.approve',
  'finance.refunds.complete',
  'finance.year_end_close',
  'finance.year_end_reopen',
  'finance.period_lock.manage',
  'finance.audit.view',
  'hr.manage_payslips',
  'payroll.generate',
  'payroll.review',
  'payroll.approve',
  'payroll.finalize',
  'payroll.correct',
  'sensitive.student_medical.view',
  'sensitive.student_documents.view',
  'sensitive.staff_documents.view',
  'sensitive.ethnicity.view',
  'sensitive.id_documents.view',
  'sensitive.payroll.view',
  'sensitive.payroll.export',
  'reports.export',
  'reports.finance.export',
  'reports.attendance.export',
  'reports.demographics.export',
  'reports.ethnicity.export',
  'reports.consent.export',
  'reports.year_end.export'
];

function normalizePermission(permission) {
  return String(permission || '').trim().toLowerCase();
}

function parsePermissions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizePermission).filter(Boolean);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return parsePermissions(parsed);
    } catch {
      return trimmed.split(',').map(normalizePermission).filter(Boolean);
    }
  }

  return [];
}

function expandPermissions(permissions) {
  const expanded = new Set();
  parsePermissions(permissions).forEach((permission) => {
    expanded.add(permission);
    (PERMISSION_ALIASES[permission] || []).forEach((alias) => expanded.add(normalizePermission(alias)));
  });
  return expanded;
}

function schoolIdFor(user) {
  return Number(user?.SchoolID || user?.schoolId || 0);
}

async function isSchoolOwner(user) {
  const schoolId = schoolIdFor(user);
  const userId = Number(user?.UserID || user?.id || 0);

  if (user?.Role === 'admin' || user?.role === 'admin') return true;
  if (!schoolId || !userId || (user?.Role || user?.role) !== 'school') return false;

  const pool = await getPool();
  const result = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('userId', sql.Int, userId)
    .query(`SELECT sr.Permissions
            FROM UserRoleAssignments ura
            INNER JOIN StaffRoles sr ON sr.StaffRoleID = ura.StaffRoleID
            INNER JOIN Users u ON u.UserID = ura.UserID
            INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = @schoolId
            WHERE ura.UserID = @userId
              AND sr.SchoolID = @schoolId
              AND sr.IsActive = 1
              AND ISNULL(u.IsActive, 1) = 1
              AND ISNULL(e.IsActive, 1) = 1`);

  return result.recordset.some((row) => expandPermissions(row.Permissions).has(OWNER_PERMISSION));
}

async function getSchoolPermissions(user) {
  const role = user?.Role || user?.role;
  const schoolId = schoolIdFor(user);
  const userId = Number(user?.UserID || user?.id || 0);

  if (role === 'admin') return [OWNER_PERMISSION];
  if (role !== 'school' || !schoolId || !userId) return [];

  if (await isSchoolOwner(user)) {
    return [OWNER_PERMISSION];
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('userId', sql.Int, userId)
    .query(`SELECT sr.Permissions
            FROM UserRoleAssignments ura
            INNER JOIN StaffRoles sr ON sr.StaffRoleID = ura.StaffRoleID
            INNER JOIN Users u ON u.UserID = ura.UserID
            INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = @schoolId
            WHERE ura.UserID = @userId
              AND sr.SchoolID = @schoolId
              AND sr.IsActive = 1
              AND ISNULL(u.IsActive, 1) = 1
              AND ISNULL(e.IsActive, 1) = 1`);

  const permissions = new Set();
  result.recordset.forEach((row) => {
    expandPermissions(row.Permissions).forEach((permission) => permissions.add(permission));
  });

  if (user.HasHrPermission || user.hasHrPermission) {
    HR_LEGACY_PERMISSIONS.forEach((permission) => permissions.add(permission));
  }

  return Array.from(permissions).sort();
}

function permissionSetFor(user) {
  if (user?.SchoolPermissionSet instanceof Set) return user.SchoolPermissionSet;
  return new Set((user?.SchoolPermissions || user?.permissions || []).map(normalizePermission));
}

function hasSchoolPermission(user, requiredPermissions) {
  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const permissions = permissionSetFor(user);

  if (permissions.has(OWNER_PERMISSION)) return true;
  return required.map(normalizePermission).some((permission) => permissions.has(permission));
}

function hasSensitivePermission(permissions) {
  const expanded = expandPermissions(permissions);
  return SENSITIVE_PERMISSIONS.some((permission) => expanded.has(permission));
}

module.exports = {
  OWNER_PERMISSION,
  SENSITIVE_PERMISSIONS,
  expandPermissions,
  getSchoolPermissions,
  hasSchoolPermission,
  hasSensitivePermission,
  isSchoolOwner,
  normalizePermission,
  parsePermissions
};
