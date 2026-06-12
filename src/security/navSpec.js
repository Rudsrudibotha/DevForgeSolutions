// SMS sidebar navigation spec.
//
// Drives the SMS portal sidebar. Each item has:
//   - href: the path
//   - label: shown next to the icon
//   - icon: an inline SVG path string
//   - permissionKey: feature-catalog key required to see this item
//     (missing key = always visible, e.g. Dashboard)
//
// The sidebar partial renders this spec. Permission filtering happens
// in the route via permissionResolver.listVisibleGroups().

'use strict';

const ICON = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3',
  students: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  families: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  classes: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  attendance: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  staff: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  leave: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  payslips: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  invoices: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  payments: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  outstanding: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  bank: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  reconciliation: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  refunds: 'M3 10h10a5 5 0 015 5v2M3 10l3-3m-3 3l3 3',
  adjustments: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  periodLocks: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  yearEnd: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  reenrolment: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  consents: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  messages: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.39-1.03L3 20l1.4-4.31A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  schoolAccount: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  permissions: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  audit: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  subscription: 'M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm5 4h.01M10 14h4',
  faults: 'M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z'
};

const SMS_NAV = [
  {
    key: 'feature-group.school',
    label: 'School',
    items: [
      { href: '/sms/students',  label: 'Students',   icon: ICON.students,   permissionKey: 'school.students.view' },
      { href: '/sms/families',  label: 'Families',   icon: ICON.families,   permissionKey: 'school.families.view' },
      { href: '/sms/classes',   label: 'Classes',    icon: ICON.classes,    permissionKey: 'school.classes.view' },
      { href: '/sms/attendance',label: 'Attendance', icon: ICON.attendance, permissionKey: 'attendance.view_all' },
      { href: '/sms/staff',     label: 'Staff',      icon: ICON.staff,      permissionKey: 'school.staff.view' },
      { href: '/sms/leave',     label: 'Leave',      icon: ICON.leave,      permissionKey: 'leave.view' },
      { href: '/sms/payslips',  label: 'Payslips',   icon: ICON.payslips,   permissionKey: 'payslips.view' }
    ]
  },
  {
    key: 'feature-group.finance',
    label: 'Finance',
    items: [
      { href: '/sms/invoices',           label: 'Invoices',       icon: ICON.invoices,       permissionKey: 'finance.invoices.view' },
      { href: '/sms/payments',           label: 'Payments',       icon: ICON.payments,       permissionKey: 'finance.payments.view' },
      { href: '/sms/outstanding',        label: 'Outstanding',    icon: ICON.outstanding,    permissionKey: 'finance.outstanding_fees.view' },
      { href: '/sms/bank-statements/import', label: 'Import Bank Statement', icon: ICON.bank, permissionKey: 'finance.bank_reconciliation.view' },
      { href: '/sms/bank-reconciliation', label: 'Reconciliation', icon: ICON.reconciliation, permissionKey: 'finance.bank_reconciliation.approve_match' },
      { href: '/sms/refunds',            label: 'Refunds',        icon: ICON.refunds,        permissionKey: 'finance.refunds.create' },
      { href: '/sms/adjustments',        label: 'Adjustments',    icon: ICON.adjustments,    permissionKey: 'finance.adjustments.create' },
      { href: '/sms/period-locks',       label: 'Period locks',   icon: ICON.periodLocks,    permissionKey: 'finance.period_lock.manage' },
      { href: '/sms/year-end',           label: 'Year-end close', icon: ICON.yearEnd,        permissionKey: 'finance.year_end_close' },
      { href: '/sms/reenrolment',        label: 'Re-enrolment',   icon: ICON.reenrolment,    permissionKey: 'finance.rollover.manage' },
      { href: '/sms/consents',           label: 'Consents',       icon: ICON.consents,       permissionKey: 'school.consent.view' },
      { href: '/sms/reports',            label: 'Reports',        icon: ICON.reports,        permissionKey: 'reports.view' }
    ]
  },
  {
    key: 'feature-group.kch',
    label: 'Kinder Care Hub',
    items: [
      { href: '/sms/kch', label: 'Messages', icon: ICON.messages, permissionKey: 'messaging.school.use' }
    ]
  },
  {
    key: 'feature-group.settings',
    label: 'Settings',
    items: [
      { href: '/sms/settings',                  label: 'School profile',  icon: ICON.settings,     permissionKey: 'school.profile.view' },
      { href: '/sms/settings/school-account',   label: 'School account',  icon: ICON.schoolAccount,permissionKey: 'school.account.view' },
      { href: '/sms/users',                     label: 'System users',    icon: ICON.users,        permissionKey: 'school.staff.manage' },
      { href: '/sms/permissions',               label: 'Permissions',     icon: ICON.permissions,  permissionKey: 'permissions.view' },
      { href: '/sms/audit',                     label: 'Audit log',       icon: ICON.audit,        permissionKey: 'school.audit.view' },
      { href: '/sms/settings/subscription',     label: 'Subscription',    icon: ICON.subscription, permissionKey: 'school.subscription.view' }
    ]
  }
];

const DEVFORGE_NAV = [
  {
    key: 'devforge.school',
    label: 'School',
    items: [
      { href: '/devforge/schools',       label: 'Schools',       icon: ICON.schoolAccount, permissionKey: 'devforge.schools.view' },
      { href: '/devforge/users',         label: 'Users',         icon: ICON.users,         permissionKey: 'devforge.users.view' },
      { href: '/devforge/payments',      label: 'Payments',      icon: ICON.payments,      permissionKey: 'devforge.payments.view' },
      { href: '/devforge/faults',        label: 'Faults',        icon: ICON.faults,        permissionKey: 'devforge.faults.view' },
      { href: '/devforge/audit',         label: 'Audit log',     icon: ICON.audit,         permissionKey: 'devforge.audit.view' },
      { href: '/devforge/subscriptions', label: 'Subscriptions', icon: ICON.subscription,  permissionKey: 'devforge.subscriptions.view' }
    ]
  },
  {
    key: 'devforge.kch',
    label: 'Kinder Care Hub',
    items: [
      { href: '/devforge/kch', label: 'Messages', icon: ICON.messages, permissionKey: 'messaging.devforge.use' }
    ]
  },
  {
    key: 'devforge.settings',
    label: 'Settings',
    items: [
      { href: '/devforge/settings', label: 'Settings', icon: ICON.settings, permissionKey: 'devforge.settings.view' }
    ]
  }
];

const PARENT_NAV = [
  {
    key: 'parent.family',
    label: 'My family',
    items: [
      { href: '/parent/invoices',     label: 'Invoices',     icon: ICON.invoices,     permissionKey: 'parent.invoices.view' },
      { href: '/parent/messages',     label: 'Messages',     icon: ICON.messages,     permissionKey: 'messaging.parent.use' },
      { href: '/parent/consent',      label: 'Consent',      icon: ICON.consents,     permissionKey: 'parent.consent.view' },
      { href: '/parent/reenrolment',  label: 'Re-enrolment', icon: ICON.reenrolment,  permissionKey: 'parent.reenrolment.view' }
    ]
  },
  {
    key: 'parent.kch',
    label: 'Kinder Care Hub',
    items: [
      { href: '/parent/kch', label: 'Messages', icon: ICON.messages, permissionKey: 'messaging.parent.use' }
    ]
  }
];

module.exports = { SMS_NAV, DEVFORGE_NAV, PARENT_NAV, ICON };
