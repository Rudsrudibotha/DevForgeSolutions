// Static route registry for the command palette. Loaded per-page via a
// <script> tag and used by the command palette to navigate quickly.
// To add a destination: append to the appropriate portal array.

(function () {
  'use strict';

  const palette = {
    parent: [
      { group: 'Overview',     label: 'Home',         href: '/parent',                       keywords: 'dashboard home family' },
      { group: 'My family',    label: 'Invoices',     href: '/parent/invoices',              keywords: 'billing payments' },
      { group: 'My family',    label: 'Messages',     href: '/parent/messages',              keywords: 'inbox chat conversation' },
      { group: 'My family',    label: 'Consent',      href: '/parent/consent',               keywords: 'permissions outings photos' },
      { group: 'My family',    label: 'Re-enrolment', href: '/parent/reenrolment',           keywords: 'registration renew' },
      { group: 'Account',      label: 'Account',      href: '/account',                      keywords: 'profile settings' }
    ],
    sms: [
      { group: 'Overview',     label: 'Dashboard',    href: '/sms',                          keywords: 'home overview' },
      { group: 'School',       label: 'Students',     href: '/sms/students',                 keywords: 'pupils learners' },
      { group: 'School',       label: 'Families',     href: '/sms/families',                 keywords: 'parents guardians' },
      { group: 'School',       label: 'Classes',      href: '/sms/classes',                  keywords: 'groups grades' },
      { group: 'School',       label: 'Attendance',   href: '/sms/attendance',               keywords: 'register roll' },
      { group: 'Finance',      label: 'Invoices',     href: '/sms/invoices',                 keywords: 'billing statements' },
      { group: 'Finance',      label: 'Payments',     href: '/sms/payments',                 keywords: 'receipts transactions' },
      { group: 'Finance',      label: 'Bank statements', href: '/sms/bank-statements',        keywords: 'reconcile banking' },
      { group: 'People',       label: 'Staff',        href: '/sms/staff',                    keywords: 'employees teachers' },
      { group: 'Reports',      label: 'Reports',      href: '/sms/reports',                  keywords: 'analytics export' },
      { group: 'Configure',    label: 'Settings',     href: '/sms/settings',                 keywords: 'configuration preferences' }
    ],
    devforge: [
      { group: 'Overview',     label: 'Dashboard',    href: '/devforge',                     keywords: 'home overview' },
      { group: 'Business',     label: 'Schools',      href: '/devforge/schools',             keywords: 'tenants customers' },
      { group: 'Business',     label: 'Users',        href: '/devforge/users',               keywords: 'accounts' },
      { group: 'Business',     label: 'Payments',     href: '/devforge/payments',            keywords: 'transactions ledger' },
      { group: 'Business',     label: 'Audit log',    href: '/devforge/audit',               keywords: 'history trail' },
      { group: 'Platform',     label: 'Settings',     href: '/devforge/settings',            keywords: 'config observability health' }
    ]
  };

  // Public actions, always available
  const actions = [
    { group: 'Actions', label: 'Toggle dark mode',   href: 'action:toggle-theme', keywords: 'theme night light mode' },
    { group: 'Actions', label: 'Sign out',           href: 'action:sign-out',    keywords: 'logout' },
    { group: 'Help',    label: 'Keyboard shortcuts', href: 'action:shortcuts',   keywords: 'help hotkeys keys' }
  ];

  window.kchPalette = { palette, actions };
})();
