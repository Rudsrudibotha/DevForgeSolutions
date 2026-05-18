const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' }
];

const CURRENCY_SYMBOL_OVERRIDES = {
  EUR: 'EUR',
  GBP: 'GBP',
  JPY: 'JPY',
  CNY: 'CNY',
  INR: 'INR',
  AED: 'AED',
  SAR: 'SAR',
  PLN: 'PLN',
  TRY: 'TRY'
};

const VIEW_TITLES = {
  overview: 'School Management Dashboard',
  school: 'School Management',
  finance: 'Financial Management',
  reporting: 'Reporting',
  settings: 'Settings',
  classes: 'Class Management',
  staff: 'Staff Management',
  students: 'Student Management',
  parents: 'Parent Management',
  attendance: 'Attendance',
  reenrolment: 'School / Re-Enrolment / Year Rollover',
  consentPermissions: 'Consent and Permissions',
  registerLearner: 'Register Learner',
  bank: 'Bank Reconciliation',
  outstanding: 'Outstanding Fees',
  bankTransactions: 'Bank Transactions',
  bankStatements: 'Bank Statements',
  invoices: 'Invoices',
  billingCategories: 'Billing Categories',
  payslips: 'HR / Payroll',
  financialAdjustments: 'Financial Adjustments',
  refunds: 'Refunds',
  registrationFees: 'Registration / Deposit Fees',
  yearEndClosing: 'Year-End Financial Closing',
  financeAudit: 'Finance Audit',
  studentReports: 'Reporting / Student Reports',
  report: 'Reporting / School Report',
  sendInvoices: 'Reporting / Send Invoices to Parents',
  exportReports: 'Reporting / Export Reports',
  communicationHistory: 'Reporting / Communication History',
  admissionsReport: 'Reporting / Admissions Report',
  reenrolmentReport: 'Reporting / Re-Enrolment Report',
  consentReport: 'Reporting / Consent Report',
  yearEndReport: 'Reporting / Year-End Report'
};

const VIEW_MODULE = {
  classes: 'school',
  staff: 'school',
  students: 'school',
  parents: 'school',
  attendance: 'school',
  reenrolment: 'school',
  consentPermissions: 'school',
  registerLearner: 'school',
  bank: 'finance',
  outstanding: 'finance',
  bankTransactions: 'finance',
  bankStatements: 'finance',
  invoices: 'finance',
  billingCategories: 'finance',
  payslips: 'finance',
  financialAdjustments: 'finance',
  refunds: 'finance',
  registrationFees: 'finance',
  yearEndClosing: 'finance',
  financeAudit: 'finance',
  studentReports: 'reporting',
  report: 'reporting',
  sendInvoices: 'reporting',
  exportReports: 'reporting',
  communicationHistory: 'reporting',
  admissionsReport: 'reporting',
  reenrolmentReport: 'reporting',
  consentReport: 'reporting',
  yearEndReport: 'reporting'
};

const VIEW_ROUTES = {
  overview: '/sms',
  school: '/school',
  finance: '/school/finance',
  reporting: '/school/reporting',
  settings: '/school/settings',
  classes: '/school/classes',
  staff: '/school/staff',
  students: '/school/students',
  parents: '/school/parents',
  attendance: '/school/attendance',
  reenrolment: '/school/re-enrolment-year-rollover',
  consentPermissions: '/school/consent-permissions',
  registerLearner: '/school/register-learner',
  bank: '/school/finance/bank-reconciliation',
  outstanding: '/school/finance/outstanding-fees',
  bankTransactions: '/school/finance/bank-transactions',
  bankStatements: '/school/finance/bank-statements',
  invoices: '/school/finance/invoices',
  billingCategories: '/school/finance/billing-categories',
  payslips: '/school/finance/hr-payroll',
  financialAdjustments: '/school/finance/financial-adjustments',
  refunds: '/school/finance/refunds',
  registrationFees: '/school/finance/registration-deposit-fees',
  yearEndClosing: '/school/finance/year-end-financial-closing',
  financeAudit: '/school/finance/audit',
  studentReports: '/school/reporting/student-reports',
  report: '/school/reporting/school-report',
  sendInvoices: '/school/reporting/send-invoices-to-parents',
  exportReports: '/school/reporting/export-reports',
  communicationHistory: '/school/reporting/communication-history',
  admissionsReport: '/school/reporting/admissions-report',
  reenrolmentReport: '/school/reporting/re-enrolment-report',
  consentReport: '/school/reporting/consent-report',
  yearEndReport: '/school/reporting/year-end-report'
};

const ROUTE_VIEWS = Object.fromEntries(Object.entries(VIEW_ROUTES).map(([view, route]) => [route, view]));

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SCHOOL_LOGIN_PATH = '/school-login';

const ACTION_VIEWS = {
  'open-school': 'school',
  'open-finance': 'finance',
  'open-reporting': 'reporting',
  'open-classes': 'classes',
  'open-staff': 'staff',
  'open-students': 'students',
  'open-parents': 'parents',
  'open-attendance': 'attendance',
  'open-reenrolment': 'reenrolment',
  'open-consent-permissions': 'consentPermissions',
  'open-register-learner': 'registerLearner',
  'open-bank': 'bank',
  'open-outstanding': 'outstanding',
  'open-bank-transactions': 'bankTransactions',
  'open-bank-statements': 'bankStatements',
  'open-invoices': 'invoices',
  'open-billing-categories': 'billingCategories',
  'open-hr-payroll': 'payslips',
  'open-financial-adjustments': 'financialAdjustments',
  'open-refunds': 'refunds',
  'open-registration-fees': 'registrationFees',
  'open-year-end-closing': 'yearEndClosing',
  'open-finance-audit': 'financeAudit',
  'open-student-reports': 'studentReports',
  'open-report': 'report',
  'open-send-invoices': 'sendInvoices',
  'open-export-reports': 'exportReports',
  'open-communication-history': 'communicationHistory',
  'open-admissions-report': 'admissionsReport',
  'open-reenrolment-report': 'reenrolmentReport',
  'open-consent-report': 'consentReport',
  'open-year-end-report': 'yearEndReport'
};

const PERMISSION_ALIAS_MAP = {
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
  ]
};

const PERMISSION_GROUPS = [
  {
    key: 'assigned_classes',
    label: 'Assigned Class Lists',
    area: 'Teacher',
    description: 'View only classes linked to the staff member.',
    permissions: ['classes.view_assigned']
  },
  {
    key: 'assigned_attendance_view',
    label: 'Assigned Attendance View',
    area: 'Teacher',
    description: 'View attendance for assigned classes.',
    permissions: ['attendance.view_assigned']
  },
  {
    key: 'assigned_attendance_capture',
    label: 'Assigned Attendance Capture',
    area: 'Teacher',
    description: 'Capture attendance for assigned classes.',
    permissions: ['attendance.submit_assigned']
  },
  {
    key: 'attendance_all_view',
    label: 'Whole School Attendance View',
    area: 'School Management',
    description: 'View attendance across every class in the school.',
    permissions: ['attendance.view_all']
  },
  {
    key: 'attendance_all_correction',
    label: 'Whole School Attendance Corrections',
    area: 'School Management',
    description: 'Correct or edit attendance across the school.',
    permissions: ['attendance.edit_all', 'attendance.correct']
  },
  {
    key: 'student_view',
    label: 'Student Records View',
    area: 'School Management',
    description: 'View learner profiles without finance permissions.',
    permissions: ['school.students.view']
  },
  {
    key: 'student_manage',
    label: 'Student Records Create and Edit',
    area: 'School Management',
    description: 'Add learners, update details, and manage enrolment status.',
    permissions: ['school.students.manage']
  },
  {
    key: 'parent_view',
    label: 'Parent Records View',
    area: 'School Management',
    description: 'View parent and family contact information.',
    permissions: ['school.parents.view']
  },
  {
    key: 'parent_manage',
    label: 'Parent Records Create and Edit',
    area: 'School Management',
    description: 'Add and update family or parent records.',
    permissions: ['school.parents.manage']
  },
  {
    key: 'class_view',
    label: 'Class Setup View',
    area: 'School Management',
    description: 'View classes and timetables.',
    permissions: ['school.classes.view']
  },
  {
    key: 'class_manage',
    label: 'Class Setup Create and Edit',
    area: 'School Management',
    description: 'Create classes, assign teachers, and maintain timetables.',
    permissions: ['school.classes.manage']
  },
  {
    key: 'consent_view',
    label: 'Consent Responses View',
    area: 'School Management',
    description: 'View consent requests and signed permission slips.',
    permissions: ['school.consent.view']
  },
  {
    key: 'consent_manage',
    label: 'Consent Requests Create and Edit',
    area: 'School Management',
    description: 'Create permission slips and manage response tracking.',
    permissions: ['school.consent.manage']
  },
  {
    key: 'admissions_view',
    label: 'Admissions View',
    area: 'School Management',
    description: 'View applications and supporting admission information.',
    permissions: ['admissions.view']
  },
  {
    key: 'admissions_decisions',
    label: 'Admissions Review and Decisions',
    area: 'School Management',
    description: 'Review, accept, waitlist, or refuse applications.',
    permissions: ['admissions.review', 'admissions.accept', 'admissions.waitlist', 'admissions.refuse']
  },
  {
    key: 'year_rollover_preview',
    label: 'Year Rollover Preview',
    area: 'School Management',
    description: 'Preview re-enrolment, promotions, and year-end movement.',
    permissions: ['school.year_rollover.preview']
  },
  {
    key: 'year_rollover_apply',
    label: 'Year Rollover Apply',
    area: 'School Management',
    description: 'Apply next-year enrolment and promotion changes.',
    permissions: ['school.year_rollover.apply'],
    sensitive: true
  },
  {
    key: 'finance_invoice_view',
    label: 'Student Invoice View',
    area: 'Financial Management',
    description: 'View student invoices and account statements.',
    permissions: ['finance.invoices.view']
  },
  {
    key: 'finance_payment_view',
    label: 'Student Payment View',
    area: 'Financial Management',
    description: 'View receipts, payments, and payment history.',
    permissions: ['finance.payments.view']
  },
  {
    key: 'finance_outstanding_view',
    label: 'Outstanding Fees View',
    area: 'Financial Management',
    description: 'View overdue balances and outstanding payment reports.',
    permissions: ['finance.outstanding_fees.view']
  },
  {
    key: 'finance_invoice_manage',
    label: 'Invoice Create and Edit',
    area: 'Financial Management',
    description: 'Create, edit, and maintain invoices.',
    permissions: ['finance.invoices.create', 'finance.invoices.edit']
  },
  {
    key: 'finance_invoice_delete',
    label: 'Invoice Soft Delete',
    area: 'Financial Management',
    description: 'Cancel or hide invoices through a controlled soft delete.',
    permissions: ['finance.invoices.soft_delete'],
    sensitive: true
  },
  {
    key: 'finance_billing_categories',
    label: 'Billing Categories',
    area: 'Financial Management',
    description: 'Create and update school billing categories.',
    permissions: ['finance.billing_categories.manage']
  },
  {
    key: 'finance_payment_allocate',
    label: 'Receipt and Payment Allocation',
    area: 'Financial Management',
    description: 'Issue receipts and allocate payments to invoices or advance credit.',
    permissions: ['finance.payments.allocate']
  },
  {
    key: 'finance_adjustments',
    label: 'Discounts, Credits, and Adjustments',
    area: 'Financial Management',
    description: 'Apply discounts, credit notes, and accounting adjustments.',
    permissions: ['finance.discounts.manage', 'finance.credit_notes.create', 'finance.credit_notes.approve', 'finance.adjustments.create'],
    sensitive: true
  },
  {
    key: 'finance_registration_fees',
    label: 'Registration Fees',
    area: 'Financial Management',
    description: 'View and manage registration fee payments.',
    permissions: ['finance.registration_fees.view', 'finance.registration_fees.manage', 'finance.registration_fees.mark_paid']
  },
  {
    key: 'bank_reconciliation_view',
    label: 'Bank Statements and Reconciliations View',
    area: 'Financial Management',
    description: 'View uploaded bank statements and completed reconciliations.',
    permissions: ['finance.bank_reconciliation.view']
  },
  {
    key: 'bank_reconciliation_match',
    label: 'Bank Match Approval',
    area: 'Financial Management',
    description: 'Approve suggested matches between bank payments and invoices.',
    permissions: ['finance.bank_reconciliation.approve_match']
  },
  {
    key: 'bank_reconciliation_correct',
    label: 'Bank Reallocation Corrections',
    area: 'Financial Management',
    description: 'Correct allocations through the controlled reallocation workflow.',
    permissions: ['finance.bank_reconciliation.correct'],
    sensitive: true
  },
  {
    key: 'finance_refund_create',
    label: 'Refund Requests',
    area: 'Financial Management',
    description: 'Create refund requests for review.',
    permissions: ['finance.refunds.create']
  },
  {
    key: 'finance_refund_approve',
    label: 'Refund Approval and Completion',
    area: 'Financial Management',
    description: 'Approve and complete refunds.',
    permissions: ['finance.refunds.approve', 'finance.refunds.complete'],
    sensitive: true
  },
  {
    key: 'finance_audit_view',
    label: 'Finance Audit View',
    area: 'Financial Management',
    description: 'View sensitive finance audit activity.',
    permissions: ['finance.audit.view'],
    sensitive: true
  },
  {
    key: 'finance_period_lock',
    label: 'Finance Period Locking',
    area: 'Financial Management',
    description: 'Lock and unlock finance months or year-end periods.',
    permissions: ['finance.period_lock.manage'],
    sensitive: true
  },
  {
    key: 'finance_year_end',
    label: 'Finance Year-End Close and Reopen',
    area: 'Financial Management',
    description: 'Close or reopen financial years.',
    permissions: ['finance.year_end_close', 'finance.year_end_reopen'],
    sensitive: true
  },
  {
    key: 'staff_view',
    label: 'Staff Records View',
    area: 'HR',
    description: 'View staff profiles.',
    permissions: ['school.staff.view']
  },
  {
    key: 'staff_manage',
    label: 'Staff Records Create and Edit',
    area: 'HR',
    description: 'Add employees and update staff profiles.',
    permissions: ['school.staff.manage']
  },
  {
    key: 'leave_view',
    label: 'Leave View',
    area: 'HR',
    description: 'View leave records for staff.',
    permissions: ['leave.view_all']
  },
  {
    key: 'leave_approve',
    label: 'Leave Approval',
    area: 'HR',
    description: 'Approve or decline leave requests.',
    permissions: ['leave.approve', 'leave.decline']
  },
  {
    key: 'leave_setup',
    label: 'Leave Setup and Balances',
    area: 'HR',
    description: 'Manage leave types, balances, and adjustments.',
    permissions: ['leave.manage_types', 'leave.manage_balances', 'leave.adjust_balances']
  },
  {
    key: 'payslip_view',
    label: 'Payslip View',
    area: 'HR',
    description: 'View staff payslips.',
    permissions: ['hr.view_payslips']
  },
  {
    key: 'payslip_manage',
    label: 'Payroll Generate and Finalize',
    area: 'HR',
    description: 'Generate, review, finalize, and view previous payroll runs.',
    permissions: ['hr.manage_payslips', 'payroll.generate', 'payroll.review', 'payroll.finalize', 'payroll.view_previous'],
    sensitive: true
  },
  {
    key: 'payroll_sensitive',
    label: 'Sensitive Payroll Export',
    area: 'HR',
    description: 'View and export sensitive payroll values.',
    permissions: ['sensitive.payroll.view', 'sensitive.payroll.export'],
    sensitive: true
  },
  {
    key: 'reports_general',
    label: 'General Reports View',
    area: 'Reporting',
    description: 'Open the reporting area and view general school stats.',
    permissions: ['reports.view']
  },
  {
    key: 'reports_finance',
    label: 'Finance Reports View',
    area: 'Reporting',
    description: 'View finance reports and reconciliation summaries.',
    permissions: ['reports.finance.view']
  },
  {
    key: 'reports_attendance',
    label: 'Attendance Reports View',
    area: 'Reporting',
    description: 'View attendance reports and trends.',
    permissions: ['reports.attendance.view']
  },
  {
    key: 'reports_demographics',
    label: 'Demographic Reports View',
    area: 'Reporting',
    description: 'View learner demographics and enrolment analysis.',
    permissions: ['reports.demographics.view']
  },
  {
    key: 'reports_year_end',
    label: 'Year-End Reports View',
    area: 'Reporting',
    description: 'View year-end and rollover reports.',
    permissions: ['reports.year_end.view']
  },
  {
    key: 'reports_communication',
    label: 'Communication History View',
    area: 'Reporting',
    description: 'View invoice, consent, and parent communication history.',
    permissions: ['communication.history.view']
  },
  {
    key: 'exports_general',
    label: 'General Exports',
    area: 'Reporting',
    description: 'Export readable school reports.',
    permissions: ['reports.export'],
    sensitive: true
  },
  {
    key: 'exports_finance',
    label: 'Finance Exports',
    area: 'Reporting',
    description: 'Export financial reports and outstanding payment files.',
    permissions: ['reports.finance.export'],
    sensitive: true
  },
  {
    key: 'exports_school',
    label: 'School Report Exports',
    area: 'Reporting',
    description: 'Export attendance, demographics, consent, and year-end reports.',
    permissions: ['reports.attendance.export', 'reports.demographics.export', 'reports.consent.export', 'reports.year_end.export'],
    sensitive: true
  },
  {
    key: 'role_security',
    label: 'Users and Role Security',
    area: 'Security',
    description: 'Manage school users, roles, and permission setup.',
    permissions: ['school.staff.permissions.manage'],
    sensitive: true
  },
  {
    key: 'sensitive_student_medical',
    label: 'Sensitive Medical Information',
    area: 'Security',
    description: 'View sensitive learner medical information.',
    permissions: ['sensitive.student_medical.view'],
    sensitive: true
  },
  {
    key: 'sensitive_student_documents',
    label: 'Sensitive Student Documents',
    area: 'Security',
    description: 'View or upload sensitive learner documents.',
    permissions: ['sensitive.student_documents.view', 'documents.student.view', 'documents.student.upload'],
    sensitive: true
  },
  {
    key: 'sensitive_identity_demographics',
    label: 'Sensitive Identity and Demographics',
    area: 'Security',
    description: 'View ID documents, ethnicity, and protected demographic fields.',
    permissions: ['sensitive.ethnicity.view', 'sensitive.id_documents.view'],
    sensitive: true
  }
];

const ROLE_PERMISSION_TEMPLATES = {
  teacher: {
    roleName: 'Teacher',
    description: 'Classroom teacher permissions: attendance and assigned class access only.',
    allowed: ['assigned_classes', 'assigned_attendance_view', 'assigned_attendance_capture']
  },
  finance: {
    roleName: 'Finance',
    description: 'Financial Management permissions without payroll access.',
    allowed: [
      'finance_invoice_view',
      'finance_payment_view',
      'finance_outstanding_view',
      'finance_invoice_manage',
      'finance_billing_categories',
      'finance_payment_allocate',
      'finance_registration_fees',
      'bank_reconciliation_view',
      'bank_reconciliation_match',
      'bank_reconciliation_correct',
      'finance_audit_view',
      'finance_period_lock',
      'reports_general',
      'reports_finance',
      'exports_finance'
    ]
  },
  hr: {
    roleName: 'HR',
    description: 'HR and payroll permissions without learner finance access.',
    allowed: [
      'staff_view',
      'staff_manage',
      'leave_view',
      'leave_approve',
      'leave_setup',
      'payslip_view',
      'payslip_manage',
      'payroll_sensitive',
      'reports_general'
    ]
  },
  admin: {
    roleName: 'School Admin',
    description: 'School administration permissions for learners, classes, parents, consent, reports, and role setup.',
    allowed: [
      'attendance_all_view',
      'attendance_all_correction',
      'student_view',
      'student_manage',
      'parent_view',
      'parent_manage',
      'class_view',
      'class_manage',
      'consent_view',
      'consent_manage',
      'admissions_view',
      'admissions_decisions',
      'year_rollover_preview',
      'year_rollover_apply',
      'staff_view',
      'staff_manage',
      'reports_general',
      'reports_attendance',
      'reports_demographics',
      'reports_year_end',
      'reports_communication',
      'role_security'
    ]
  }
};

const state = {
  token: localStorage.getItem('smsToken'),
  user: JSON.parse(localStorage.getItem('smsUser') || 'null'),
  schools: [],
  invoices: [],
  families: [],
  students: [],
  billingCategories: [],
  classes: [],
  attendance: [],
  completedAttendance: [],
  employees: [],
  staffRoles: [],
  leaves: [],
  payslips: [],
  payslipStatusMessage: '',
  schoolUsers: [],
  schoolUserRoles: {},
  auditLogs: [],
  financeAuditLogs: [],
  dashboardWarnings: [],
  matchSuggestions: [],
  selectedAccountSchoolId: null,
  selectedSettingsSchoolId: null,
  editingBillingCategoryId: null,
  editingEmployeeId: null,
  selectedPayslip: null,
  studentStatusFilter: 'active',
  selectedDepartureStudentId: null,
  studentSearchQuery: '',
  studentSearchType: 'Student name',
  selectedStudentFinanceId: null,
  selectedStudentFinanceStatement: null,
  parentSearchQuery: '',
  parentSearchType: 'Parent Name',
  parentStatusFilter: 'active',
  editingClassId: null,
  selectedAttendanceClassKey: null,
  attendanceHistoryFrom: '',
  attendanceHistoryTo: '',
  attendanceSearchQuery: '',
  attendanceSearchType: 'Student name',
  attendanceStatusFilter: 'all',
  attendanceClassFilter: 'all',
  attendancePageSize: 9999,
  selectedAttendanceUndoId: null,
  admissions: [],
  reEnrolments: [],
  reEnrolmentPending: [],
  featureRolloverYear: null,
  consentRecords: [],
  missingConsent: [],
  consentListSearchQuery: '',
  consentListSearchType: 'Permission slip',
  consentListStatusFilter: 'all',
  consentListPageSize: 10,
  consentOutstandingSearchQuery: '',
  consentOutstandingSearchType: 'Student name',
  consentOutstandingDueFilter: 'all',
  consentOutstandingPageSize: 10,
  consentSignedSearchQuery: '',
  consentSignedSearchType: 'Parent / guardian',
  consentSignedResponseFilter: 'all',
  consentSignedPageSize: 10,
  consentComposerOpen: false,
  selectedConsentRecordId: null,
  financialAdjustments: [],
  refunds: [],
  registrationFees: [],
  yearEndClosings: [],
  financePeriodLocks: [],
  communicationHistory: [],
  reportPreview: [],
  reportData: null,
  reportStatusMessage: '',
  outstandingFeesData: [],
  outstandingFeesError: '',
  registerLearnerBillingIds: [],
  studentEditBillingIds: [],
  permissionMatrixSearchQuery: '',
  editingStaffRoleId: null,
  permissionDraft: {},
  bankReallocationTransaction: null,
  bankReallocationTargets: [],
  bankReallocationInvoices: [],
  bankReallocationInvoiceId: null
};

function currentCalendarYear() {
  return new Date().getFullYear();
}

function nextCalendarYear() {
  return currentCalendarYear() + 1;
}

const elements = {
  workspace: document.getElementById('workspace'),
  statusPill: document.getElementById('statusPill'),
  sessionLabel: document.getElementById('sessionLabel'),
  logoutButton: document.getElementById('logoutButton'),
  viewTitle: document.getElementById('viewTitle'),
  accountSchoolForm: document.getElementById('accountSchoolForm'),
  accountSchoolSelect: document.getElementById('accountSchoolSelect'),
  accountSchoolSelector: document.getElementById('accountSchoolSelector'),
  accountLogoPreview: document.getElementById('accountLogoPreview'),
  accountLogoUrlInput: document.getElementById('accountLogoUrlInput'),
  accountLogoFileInput: document.getElementById('accountLogoFileInput'),
  logoLinkField: document.getElementById('logoLinkField'),
  logoUploadField: document.getElementById('logoUploadField'),
  accountSchoolStatus: document.getElementById('accountSchoolStatus'),
  schoolUsersPanel: document.getElementById('schoolUsersPanel'),
  schoolUserForm: document.getElementById('schoolUserForm'),
  schoolUserRoleSelect: document.getElementById('schoolUserRoleSelect'),
  schoolUsersTable: document.getElementById('schoolUsersTable'),
  auditPanel: document.getElementById('auditPanel'),
  auditLogsTable: document.getElementById('auditLogsTable'),
  dashboardWarningsPanel: document.getElementById('dashboardWarningsPanel'),
  dashboardWarningsList: document.getElementById('dashboardWarningsList'),
  staffRolePermissionForm: document.getElementById('staffRolePermissionForm'),
  permissionRoleSelect: document.getElementById('permissionRoleSelect'),
  permissionEditorList: document.getElementById('permissionEditorList'),
  permissionMatrixHead: document.getElementById('permissionMatrixHead'),
  permissionMatrixTable: document.getElementById('permissionMatrixTable'),
  permissionMatrixSearchInput: document.getElementById('permissionMatrixSearchInput'),
  clearPermissionMatrixSearchButton: document.getElementById('clearPermissionMatrixSearch'),
  financeAuditTable: document.getElementById('financeAuditTable'),
  financeAuditFromInput: document.getElementById('financeAuditFromInput'),
  financeAuditToInput: document.getElementById('financeAuditToInput'),
  financeAuditEntityFilter: document.getElementById('financeAuditEntityFilter'),
  settingsForm: document.getElementById('settingsForm'),
  settingsSchoolSelect: document.getElementById('settingsSchoolSelect'),
  settingsSchoolSelector: document.getElementById('settingsSchoolSelector'),
  currencySelect: document.getElementById('currencySelect'),
  parentsModulePanel: document.getElementById('parentsModulePanel'),
  parentSearchTypeSelect: document.getElementById('parentSearchTypeSelect'),
  parentSearchInput: document.getElementById('parentSearchInput'),
  parentStatusFilterInput: document.getElementById('parentStatusFilterInput'),
  familyForm: document.getElementById('familyForm'),
  familiesTable: document.getElementById('familiesTable'),
  studentForm: document.getElementById('studentForm'),
  studentFamilySelect: document.getElementById('studentFamilySelect'),
  studentBillingCategorySelect: document.getElementById('studentBillingCategorySelect'),
  studentsTable: document.getElementById('studentsTable'),
  outstandingFeesTable: document.getElementById('outstandingFeesTable'),
  registerLearnerForm: document.getElementById('registerLearnerForm'),
  registerLearnerFamilySelect: document.getElementById('registerLearnerFamilySelect'),
  registerLearnerClassSelect: document.getElementById('registerLearnerClassSelect'),
  registerLearnerParentTypeSelect: document.getElementById('registerLearnerParentTypeSelect'),
  registerResponsiblePayerTypeSelect: document.getElementById('registerResponsiblePayerTypeSelect'),
  registerLearnerBillingSelect: document.getElementById('registerLearnerBillingSelect'),
  registerLearnerBillingAvailable: document.getElementById('registerLearnerBillingAvailable'),
  registerLearnerBillingAssigned: document.getElementById('registerLearnerBillingAssigned'),
  studentEditDialog: document.getElementById('studentEditDialog'),
  studentEditForm: document.getElementById('studentEditForm'),
  studentEditResponsiblePayerTypeSelect: document.getElementById('studentEditResponsiblePayerTypeSelect'),
  studentEditBillingSelect: document.getElementById('studentEditBillingSelect'),
  studentEditBillingAvailable: document.getElementById('studentEditBillingAvailable'),
  studentEditBillingAssigned: document.getElementById('studentEditBillingAssigned'),
  closeStudentEditDialogButton: document.getElementById('closeStudentEditDialogButton'),
  cancelStudentEditButton: document.getElementById('cancelStudentEditButton'),
  familyEditDialog: document.getElementById('familyEditDialog'),
  familyEditForm: document.getElementById('familyEditForm'),
  closeFamilyEditDialogButton: document.getElementById('closeFamilyEditDialogButton'),
  cancelFamilyEditButton: document.getElementById('cancelFamilyEditButton'),
  billingCategoryForm: document.getElementById('billingCategoryForm'),
  billingCategorySchoolField: document.getElementById('billingCategorySchoolField'),
  billingCategorySchoolSelect: document.getElementById('billingCategorySchoolSelect'),
  billingCategorySchoolHint: document.getElementById('billingCategorySchoolHint'),
  billingCategoriesTable: document.getElementById('billingCategoriesTable'),
  cancelBillingCategoryEditButton: document.getElementById('cancelBillingCategoryEditButton'),
  classDialog: document.getElementById('classDialog'),
  classForm: document.getElementById('classForm'),
  classTeacherSelect: document.getElementById('classTeacherSelect'),
  classSearchInput: document.getElementById('classSearchInput'),
  classNameFilterInput: document.getElementById('classNameFilterInput'),
  classTeacherFilterInput: document.getElementById('classTeacherFilterInput'),
  classLearnerFilterInput: document.getElementById('classLearnerFilterInput'),
  classStatusFilterInput: document.getElementById('classStatusFilterInput'),
  classYearFilterInput: document.getElementById('classYearFilterInput'),
  classYearInput: document.getElementById('classYearInput'),
  classesTable: document.getElementById('classesTable'),
  editClassId: document.getElementById('editClassId'),
  openClassDialogButton: document.getElementById('openClassDialogButton'),
  closeClassDialogButton: document.getElementById('closeClassDialogButton'),
  classSubmitButton: document.getElementById('classSubmitButton'),
  cancelClassEditButton: document.getElementById('cancelClassEditButton'),
  attendanceForm: document.getElementById('attendanceForm'),
  attendanceStudentSelect: document.getElementById('attendanceStudentSelect'),
  attendanceDateInput: document.getElementById('attendanceDateInput'),
  attendanceSearchTypeSelect: document.getElementById('attendanceSearchTypeSelect'),
  attendanceSearchInput: document.getElementById('attendanceSearchInput'),
  attendancePageSize: document.getElementById('attendancePageSize'),
  attendanceStatusFilterInput: document.getElementById('attendanceStatusFilterInput'),
  attendanceClassFilterInput: document.getElementById('attendanceClassFilterInput'),
  attendanceTable: document.getElementById('attendanceTable'),
  openAttendanceEditButton: document.getElementById('openAttendanceEditButton'),
  attendanceEditDialog: document.getElementById('attendanceEditDialog'),
  closeAttendanceEditDialogButton: document.getElementById('closeAttendanceEditDialogButton'),
  cancelAttendanceEditButton: document.getElementById('cancelAttendanceEditButton'),
  viewAttendanceButton: document.getElementById('viewAttendanceButton'),
  attendanceDialog: document.getElementById('attendanceDialog'),
  attendanceDialogSubtitle: document.getElementById('attendanceDialogSubtitle'),
  attendanceHistoryFromInput: document.getElementById('attendanceHistoryFromInput'),
  attendanceHistoryToInput: document.getElementById('attendanceHistoryToInput'),
  loadAttendanceHistoryButton: document.getElementById('loadAttendanceHistoryButton'),
  attendanceClassTabs: document.getElementById('attendanceClassTabs'),
  attendanceClassPanels: document.getElementById('attendanceClassPanels'),
  closeAttendanceDialogButton: document.getElementById('closeAttendanceDialogButton'),
  cancelAttendanceDialogButton: document.getElementById('cancelAttendanceDialogButton'),
  attendanceUndoDialog: document.getElementById('attendanceUndoDialog'),
  attendanceUndoDialogText: document.getElementById('attendanceUndoDialogText'),
  closeAttendanceUndoDialogButton: document.getElementById('closeAttendanceUndoDialogButton'),
  undoArrivalButton: document.getElementById('undoArrivalButton'),
  undoDepartureButton: document.getElementById('undoDepartureButton'),
  cancelAttendanceUndoButton: document.getElementById('cancelAttendanceUndoButton'),
  employeeDialog: document.getElementById('employeeDialog'),
  employeeForm: document.getElementById('employeeForm'),
  employeeRoleSelect: document.getElementById('employeeRoleSelect'),
  employeeDepartmentSelect: document.getElementById('employeeDepartmentSelect'),
  closeEmployeeDialogButton: document.getElementById('closeEmployeeDialogButton'),
  cancelEmployeeButton: document.getElementById('cancelEmployeeButton'),
  employeesTable: document.getElementById('employeesTable'),
  staffSearchTypeInput: document.getElementById('staffSearchTypeInput'),
  staffSearchInput: document.getElementById('staffSearchInput'),
  staffStatusFilterInput: document.getElementById('staffStatusFilterInput'),
  staffRoleFilterInput: document.getElementById('staffRoleFilterInput'),
  leaveForm: document.getElementById('leaveForm'),
  leaveEmployeeSelect: document.getElementById('leaveEmployeeSelect'),
  leavesTable: document.getElementById('leavesTable'),
  payslipForm: document.getElementById('payslipForm'),
  payslipEmployeeSelect: document.getElementById('payslipEmployeeSelect'),
  payslipsTable: document.getElementById('payslipsTable'),
  payslipSummary: document.getElementById('payslipSummary'),
  payslipDialog: document.getElementById('payslipDialog'),
  payslipEditForm: document.getElementById('payslipEditForm'),
  payslipDetailPreview: document.getElementById('payslipDetailPreview'),
  payslipEditFields: document.getElementById('payslipEditFields'),
  closePayslipDialogButton: document.getElementById('closePayslipDialogButton'),
  cancelPayslipButton: document.getElementById('cancelPayslipButton'),
  printPayslipButton: document.getElementById('printPayslipButton'),
  savePayslipButton: document.getElementById('savePayslipButton'),
  departureForm: document.getElementById('departureForm'),
  departureStudentName: document.getElementById('departureStudentName'),
  departureReasonSelect: document.getElementById('departureReasonSelect'),
  departureOtherGroup: document.getElementById('departureOtherGroup'),
  cancelDepartureButton: document.getElementById('cancelDepartureButton'),
  invoiceForm: document.getElementById('invoiceForm'),
  invoiceSchool: document.getElementById('invoiceSchool'),
  invoiceStudentSelect: document.getElementById('invoiceStudentSelect'),
  invoiceFilterStudent: document.getElementById('invoiceFilterStudent'),
  invoiceFilterClass: document.getElementById('invoiceFilterClass'),
  invoiceFilterMonth: document.getElementById('invoiceFilterMonth'),
  invoiceFilterYear: document.getElementById('invoiceFilterYear'),
  invoiceFilterStatus: document.getElementById('invoiceFilterStatus'),
  invoicesTable: document.getElementById('invoicesTable'),
  transactionsTable: document.getElementById('transactionsTable'),
  ofxUploadForm: document.getElementById('ofxUploadForm'),
  bankStatementsTable: document.getElementById('bankStatementsTable'),
  reconciliationMonth: document.getElementById('reconciliationMonth'),
  reconciliationYear: document.getElementById('reconciliationYear'),
  reconciliationSearch: document.getElementById('reconciliationSearch'),
  reconciliationStatus: document.getElementById('reconciliationStatus'),
  reconciliationPeriodLabel: document.getElementById('reconciliationPeriodLabel'),
  reconciliationCoverageNote: document.getElementById('reconciliationCoverageNote'),
  reconciliationStatementsTable: document.getElementById('reconciliationStatementsTable'),
  reconciliationTransactionsTable: document.getElementById('reconciliationTransactionsTable'),
  matchSuggestionsTable: document.getElementById('matchSuggestionsTable'),
  bankStatementDetailDialog: document.getElementById('bankStatementDetailDialog'),
  bankStatementDetailSubtitle: document.getElementById('bankStatementDetailSubtitle'),
  bankStatementDetailTransactions: document.getElementById('bankStatementDetailTransactions'),
  bankStatementDetailAllocated: document.getElementById('bankStatementDetailAllocated'),
  bankStatementDetailUnallocated: document.getElementById('bankStatementDetailUnallocated'),
  bankStatementDetailTable: document.getElementById('bankStatementDetailTable'),
  closeBankStatementDetailButton: document.getElementById('closeBankStatementDetailButton'),
  cancelBankStatementDetailButton: document.getElementById('cancelBankStatementDetailButton'),
  bankReallocationDialog: document.getElementById('bankReallocationDialog'),
  bankReallocationForm: document.getElementById('bankReallocationForm'),
  bankReallocationAmount: document.getElementById('bankReallocationAmount'),
  bankReallocationReference: document.getElementById('bankReallocationReference'),
  bankReallocationCurrent: document.getElementById('bankReallocationCurrent'),
  bankReallocationTypeSelect: document.getElementById('bankReallocationTypeSelect'),
  bankReallocationDebtorPanel: document.getElementById('bankReallocationDebtorPanel'),
  bankReallocationCreditorPanel: document.getElementById('bankReallocationCreditorPanel'),
  bankReallocationSearchInput: document.getElementById('bankReallocationSearchInput'),
  bankReallocationTargetsTable: document.getElementById('bankReallocationTargetsTable'),
  bankReallocationInvoicesTable: document.getElementById('bankReallocationInvoicesTable'),
  closeBankReallocationButton: document.getElementById('closeBankReallocationButton'),
  cancelBankReallocationButton: document.getElementById('cancelBankReallocationButton'),
  totalCredits: document.getElementById('totalCredits'),
  totalDebits: document.getElementById('totalDebits'),
  accountBalance: document.getElementById('accountBalance'),
  outstandingAmount: document.getElementById('outstandingAmount'),
  generateMonthlyButton: document.getElementById('generateMonthlyButton'),
  studentFinanceDialog: document.getElementById('studentFinanceDialog'),
  studentReceiptForm: document.getElementById('studentReceiptForm'),
  studentReceiptPayeeTypeSelect: document.getElementById('studentReceiptPayeeTypeSelect'),
  studentReceiptInvoicesTable: document.getElementById('studentReceiptInvoicesTable'),
  studentWalletLedgerTable: document.getElementById('studentWalletLedgerTable'),
  studentReceiptAmountInput: document.getElementById('studentReceiptAmountInput'),
  studentFinanceOutstanding: document.getElementById('studentFinanceOutstanding'),
  studentFinanceWallet: document.getElementById('studentFinanceWallet'),
  studentFinanceInvoiceCount: document.getElementById('studentFinanceInvoiceCount'),
  studentReceiptAdvanceHint: document.getElementById('studentReceiptAdvanceHint'),
  closeStudentFinanceDialogButton: document.getElementById('closeStudentFinanceDialogButton'),
  cancelStudentFinanceButton: document.getElementById('cancelStudentFinanceButton'),
  requiredInfoDialog: document.getElementById('requiredInfoDialog'),
  requiredInfoList: document.getElementById('requiredInfoList'),
  closeRequiredInfoDialogButton: document.getElementById('closeRequiredInfoDialogButton'),
  cancelRequiredInfoDialogButton: document.getElementById('cancelRequiredInfoDialogButton'),
  toast: document.getElementById('toast')
};

let toastTimer = null;
let inactivityTimer = null;
let studentSearchWired = false;
let parentSearchWired = false;
const attendanceAutosaveTimers = new Map();
let bankReallocationSearchTimer = null;

function rememberActivity() {
  if (state.token) {
    localStorage.setItem('smsLastActivity', String(Date.now()));
  }
}

function redirectToLogin(message) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  localStorage.removeItem('smsLastActivity');
  if (message) {
    sessionStorage.setItem('loginNotice', message);
  }
  window.location.href = SCHOOL_LOGIN_PATH;
}

function enforceInactivityTimeout() {
  if (!state.token) {
    return false;
  }

  const lastActivity = Number(localStorage.getItem('smsLastActivity') || Date.now());
  if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
    redirectToLogin('Session expired after 30 minutes of inactivity.');
    return true;
  }

  return false;
}

function startInactivityTimer() {
  if (inactivityTimer) {
    window.clearInterval(inactivityTimer);
  }

  rememberActivity();
  inactivityTimer = window.setInterval(enforceInactivityTimeout, 30000);
}

['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((eventName) => {
  window.addEventListener(eventName, rememberActivity, { passive: true });
});


// === PERMISSION-BASED ICON HIDING ===
function userPermissionSet() {
  return new Set((state.user?.permissions || []).map((permission) => String(permission || '').trim().toLowerCase()));
}

function userCan(permissionExpression) {
  if (!permissionExpression) return true;
  if (state.user?.role === 'admin') return true;
  if (state.user?.role === 'school' && !Array.isArray(state.user.permissions)) return true;
  const permissions = userPermissionSet();
  if (permissions.has('*')) return true;

  return String(permissionExpression)
    .split(/[|,]/)
    .map((permission) => permission.trim().toLowerCase())
    .filter(Boolean)
    .some((permission) => permissions.has(permission));
}

function applyIconPermissions() {
  const user = state.user;
  if (!user) return;
  document.querySelectorAll('[data-permission]').forEach((tile) => {
    const perm = tile.dataset.permission;
    let visible = true;
    if (perm === 'hr' && !user.hasHrPermission) visible = false;
    if (perm === 'admin-only' && user.role !== 'admin') visible = false;
    if (!['hr', 'admin-only'].includes(perm) && !userCan(perm)) visible = false;
    tile.style.display = visible ? '' : 'none';
  });
}

// === OUTSTANDING FEES EXPORT ===
function exportOutstandingFees() {
  const yearInput = document.getElementById('outstandingFeesYear');
  const year = yearInput ? Number(yearInput.value) : new Date().getFullYear();
  const schoolId = currentSchoolId();
  const url = '/api/export/outstanding-fees?year=' + year + (schoolId ? '&schoolId=' + encodeURIComponent(schoolId) : '');
  const token = state.token;
  fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    .then((r) => {
      if (!r.ok) return r.json().then((j) => { throw new Error(j.error || 'Export failed'); });
      return r.blob().then((blob) => ({ blob, response: r }));
    })
    .then(({ blob, response }) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = responseDownloadName(response, 'outstanding-fees-' + year + '.xls');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      showToast('Outstanding fees exported successfully');
    })
    .catch((e) => showToast(e.message || 'Export failed. No data found or permission denied.'));
}

async function downloadExport(exportName) {
  const schoolId = currentSchoolId();
  const query = exportName === 'outstanding-fees' && schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  const url = `/api/export/${encodeURIComponent(exportName)}${query}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (response.status === 401) {
      redirectToLogin('Your login token expired. Please sign in again.');
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Export failed');
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = responseDownloadName(response, `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('Export downloaded');
  } catch (error) {
    showToast(error.message);
  }
}

async function exportStudentStatement(format) {
  const studentId = Number(state.selectedStudentFinanceId || elements.studentReceiptForm?.elements?.studentId?.value || 0);
  if (!studentId) {
    showToast('Open a student statement first');
    return;
  }

  const url = `/api/export/student-statement/${encodeURIComponent(studentId)}/${format}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (response.status === 401) {
      redirectToLogin('Your login token expired. Please sign in again.');
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Statement export failed');
    }

    if (format === 'pdf') {
      const html = await response.text();
      const win = window.open('', '_blank', 'width=960,height=720');
      if (!win) {
        throw new Error('Allow popups to print the statement');
      }
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
      showToast('Statement opened for PDF printing');
      return;
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = responseDownloadName(response, `student-statement-${studentId}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('Statement exported');
  } catch (error) {
    showToast(error.message);
  }
}

function responseDownloadName(response, fallback) {
  const disposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : fallback;
}

// === STUDENT SEARCH WIRING ===
function wireStudentSearch() {
  if (studentSearchWired) return;
  studentSearchWired = true;
  const searchInput = document.getElementById('studentSearchInput');
  const searchTypeSelect = document.getElementById('studentSearchTypeSelect');
  const statusSelect = document.getElementById('studentStatusFilterInput');
  const pageSizeSelect = document.getElementById('studentPageSize');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.studentSearchQuery = searchInput.value;
      renderStudentsTable();
    });
  }
  if (searchTypeSelect) {
    searchTypeSelect.addEventListener('change', () => {
      state.studentSearchType = searchTypeSelect.value;
      renderStudentsTable();
    });
  }
  if (statusSelect) {
    statusSelect.value = state.studentStatusFilter;
    statusSelect.addEventListener('change', async () => {
      state.studentStatusFilter = statusSelect.value;
      hideDepartureForm();
      await refreshData();
    });
  }
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      state.studentPageSize = Number(pageSizeSelect.value);
      renderStudentsTable();
    });
  }
}

function wireParentSearch() {
  if (parentSearchWired) return;
  parentSearchWired = true;
  elements.parentSearchTypeSelect?.addEventListener('change', () => {
    state.parentSearchType = elements.parentSearchTypeSelect.value;
    renderFamiliesTable();
  });
  elements.parentSearchInput?.addEventListener('input', () => {
    state.parentSearchQuery = elements.parentSearchInput.value;
    renderFamiliesTable();
  });
  elements.parentStatusFilterInput?.addEventListener('change', () => {
    state.parentStatusFilter = elements.parentStatusFilterInput.value;
    renderFamiliesTable();
  });
}

function dashboardPath(user) {
  if (user?.role === 'admin') {
    return '/devforge';
  }

  if (user?.role === 'parent') {
    return '/parent';
  }

  return '/sms';
}

function activeViewName() {
  return document.querySelector('.view.active')?.id?.replace(/View$/, '') || 'overview';
}

function viewFromPath() {
  return ROUTE_VIEWS[window.location.pathname] || 'overview';
}

function navViewFor(viewName) {
  return VIEW_MODULE[viewName] || viewName;
}

function isViewAllowed(viewName) {
  return Boolean(document.getElementById(`${viewName}View`)) && viewName !== 'schools';
}

function applyRoleShell() {
  document.body.classList.remove('platform-user');
  document.body.classList.add('school-user');

  if (!isViewAllowed(activeViewName())) {
    switchView('overview');
  }
}

function currencyByCode(code) {
  const currency = CURRENCIES.find((item) => item.code === code) || CURRENCIES[0];
  return {
    ...currency,
    symbol: CURRENCY_SYMBOL_OVERRIDES[currency.code] || currency.symbol
  };
}

function currencyLabel(code) {
  const currency = currencyByCode(code);
  return `${currency.name} - ${currency.symbol}`;
}

function currencySymbol(school) {
  const code = school?.CurrencyCode || 'ZAR';
  return CURRENCY_SYMBOL_OVERRIDES[code] || school?.CurrencySymbol || currencyByCode(code).symbol;
}

function money(value, school) {
  const amount = Number(value || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const symbol = currencySymbol(school);

  return symbol.length > 2 ? `${symbol} ${amount}` : `${symbol}${amount}`;
}

function dateOnly(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-ZA');
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function timeInputValue(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }

  if (typeof value === 'object') {
    const hours = value.hours ?? value.hour ?? value.Hours ?? value.Hour;
    const minutes = value.minutes ?? value.minute ?? value.Minutes ?? value.Minute;
    if (hours !== undefined && minutes !== undefined) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  const raw = String(value);
  // Handle ISO datetime like "1970-01-01T07:30:00.000Z"
  const isoMatch = raw.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }
  // Handle plain time like "07:30" or "07:30:00"
  const plainMatch = raw.match(/^(\d{1,2}):(\d{2})/);
  return plainMatch ? `${String(plainMatch[1]).padStart(2, '0')}:${plainMatch[2]}` : '';
}

async function api(path, options = {}) {
  if (enforceInactivityTimeout()) {
    throw new Error('Session expired');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin('Your login token expired. Please sign in again.');
      throw new Error('Session expired');
    }
    const message = payload?.error?.message || payload?.error || 'Request failed';

    if ([401, 403].includes(response.status) && /token|session/i.test(message)) {
      clearSession();
      throw new Error(message);
    }

    throw new Error(message);
  }

  rememberActivity();
  return payload;
}

function showToast(message) {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  toastTimer = window.setTimeout(() => elements.toast.classList.add('hidden'), 3200);
}

function showFormMessage(element, message, type = 'error') {
  element.textContent = message;
  element.className = `form-message ${type}`;
  element.classList.toggle('hidden', !message);
}

function setFormBusy(form, busy, busyLabel) {
  const submitButton = form.matches?.('button')
    ? form
    : form.querySelector('[type="submit"]');

  if (!submitButton) {
    return;
  }

  if (!submitButton.dataset.defaultText) {
    submitButton.dataset.defaultText = submitButton.textContent;
  }

  form.setAttribute('aria-busy', String(busy));
  submitButton.disabled = busy;
  submitButton.textContent = busy ? busyLabel : submitButton.dataset.defaultText;
}

function setSession(authPayload) {
  state.token = authPayload.token;
  state.user = authPayload.user;
  localStorage.setItem('smsToken', state.token);
  localStorage.setItem('smsUser', JSON.stringify(state.user));
  rememberActivity();
  startInactivityTimer();
  renderShell();
  applyIconPermissions();
  wireStudentSearch();
  wireParentSearch();

}

function clearSession() {
  state.token = null;
  state.user = null;
  state.schools = [];
  state.invoices = [];
  state.families = [];
  state.students = [];
  state.billingCategories = [];
  state.classes = [];
  state.attendance = [];
  state.employees = [];
  state.leaves = [];
  state.payslips = [];
  state.payslipStatusMessage = '';
  state.schoolUsers = [];
  state.auditLogs = [];
  state.matchSuggestions = [];
  state.selectedAccountSchoolId = null;
  state.selectedSettingsSchoolId = null;
  state.editingBillingCategoryId = null;
  state.selectedPayslip = null;
  state.studentStatusFilter = 'active';
  state.selectedDepartureStudentId = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  localStorage.removeItem('smsLastActivity');
  if (inactivityTimer) {
    window.clearInterval(inactivityTimer);
    inactivityTimer = null;
  }
  renderShell();
}

function renderShell() {
  const signedIn = Boolean(state.token && state.user);

  if (!signedIn) {
    window.location.href = '/school-login';
    return;
  }

  if (enforceInactivityTimeout()) {
    return;
  }

  if (state.user.role === 'admin' || state.user.role === 'parent') {
    window.location.href = dashboardPath(state.user);
    return;
  }

  applyRoleShell();
  elements.workspace.classList.remove('hidden');
  elements.logoutButton.classList.remove('hidden');
  elements.sessionLabel.textContent = `${state.user.username || state.user.email} (${state.user.role})`;
  elements.statusPill.textContent = 'Signed in';

  document.getElementById('profileUsername').textContent = state.user.username || '-';
  document.getElementById('profileEmail').textContent = state.user.email;
  document.getElementById('profileRole').textContent = state.user.role;
  document.getElementById('profileSchool').textContent = state.user.schoolId || 'Global';
  document.getElementById('profileSchoolName').textContent = '-';
  switchView(viewFromPath(), { replace: true });
  startInactivityTimer();
  refreshData();
}

async function refreshData() {
  try {
    const [schools, dashboard, invoices, families, students, billingCategories, employees, leaves] = await Promise.all([
      api('/api/schools'),
      userCan('school.students.view|finance.invoices.view|finance.bank_reconciliation.view|reports.view') ? api('/api/dashboard') : Promise.resolve({ warnings: [] }),
      userCan('finance.invoices.view|finance.invoices.create|finance.invoices.edit') ? api('/api/invoices') : Promise.resolve([]),
      userCan('school.parents.view|school.parents.manage') ? api('/api/families') : Promise.resolve([]),
      userCan('school.students.view|school.students.manage|classes.view_assigned|attendance.view_assigned|attendance.submit_assigned') ? api(`/api/students?status=${encodeURIComponent(state.studentStatusFilter)}`) : Promise.resolve([]),
      userCan('finance.billing_categories.manage|finance.invoices.view|finance.invoices.create') ? api('/api/billing-categories') : Promise.resolve([]),
      userCan('school.staff.view|school.staff.manage|school.staff.permissions.manage|hr.view_payslips|hr.manage_payslips|sensitive.payroll.view') ? api('/api/employees') : Promise.resolve([]),
      userCan('leave.view_all|leave.approve|leave.decline') ? api('/api/leaves') : Promise.resolve([])
    ]);

    state.schools = schools;
    state.dashboardWarnings = Array.isArray(dashboard?.warnings) ? dashboard.warnings : [];
    state.invoices = invoices;
    state.families = families;
    state.students = students;
    state.billingCategories = billingCategories;
    state.employees = employees;
    state.leaves = leaves;
    await Promise.all([
      refreshSchoolUsers(),
      refreshAuditLogs(),
      refreshFinanceAuditLogs(),
      refreshMatchSuggestions(),
      refreshClasses(),
      refreshStaffRoles(),
      refreshAttendance(),
      refreshPayslips(),
      refreshFeatureData(),
      refreshReportData()
    ]);
    await refreshOutstandingFees();
    renderData();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshSchoolUsers() {
  const school = getAccountSchool();

  if (!school || !userCan('school.staff.view|school.staff.manage|school.staff.permissions.manage')) {
    state.schoolUsers = [];
    state.schoolUserRoles = {};
    return;
  }

  const query = state.user?.role === 'admin'
    ? `?schoolId=${encodeURIComponent(school.SchoolID)}`
    : '';

  try {
    state.schoolUsers = await api(`/api/users/school-users${query}`);
    state.schoolUserRoles = {};
    if (userCan('school.staff.permissions.manage')) {
      const roleResults = await Promise.allSettled(state.schoolUsers.map((user) => {
        const userId = user.UserID || user.userId;
        return api(`/api/hr/roles/user/${encodeURIComponent(userId)}`);
      }));
      roleResults.forEach((result, index) => {
        const userId = state.schoolUsers[index]?.UserID || state.schoolUsers[index]?.userId;
        state.schoolUserRoles[userId] = result.status === 'fulfilled' ? result.value : [];
      });
    }
  } catch (error) {
    state.schoolUsers = [];
    state.schoolUserRoles = {};
    showToast(error.message);
  }
}

async function refreshAuditLogs() {
  if (!userCan('reports.view|devforge.audit.view')) {
    state.auditLogs = [];
    return;
  }

  try {
    state.auditLogs = await api('/api/audit?limit=20');
  } catch (error) {
    state.auditLogs = [];
  }
}

async function refreshFinanceAuditLogs() {
  if (!userCan('finance.audit.view|finance.year_end_close|reports.view')) {
    state.financeAuditLogs = [];
    return;
  }

  const params = new URLSearchParams({ limit: '100', sensitiveFinance: 'true' });
  if (elements.financeAuditFromInput?.value) params.set('fromDate', elements.financeAuditFromInput.value);
  if (elements.financeAuditToInput?.value) params.set('toDate', elements.financeAuditToInput.value);
  if (elements.financeAuditEntityFilter?.value) params.set('entityName', elements.financeAuditEntityFilter.value);

  try {
    state.financeAuditLogs = await api(`/api/audit?${params.toString()}`);
  } catch (error) {
    state.financeAuditLogs = [];
  }
}

async function refreshMatchSuggestions() {
  if (!userCan('finance.bank_reconciliation.view|finance.bank_reconciliation.approve_match')) {
    state.matchSuggestions = [];
    return;
  }

  try {
    state.matchSuggestions = await api('/api/bank-statements/match-suggestions');
  } catch (error) {
    state.matchSuggestions = [];
  }
}

async function refreshClasses() {
  if (!userCan('school.classes.view|school.classes.manage|classes.view_assigned|attendance.view_assigned|attendance.submit_assigned')) {
    state.classes = [];
    return;
  }

  try {
    state.classes = await api('/api/classes');
  } catch (error) {
    state.classes = [];
  }
}

async function refreshStaffRoles() {
  if (!userCan('school.staff.view|school.staff.manage|school.staff.permissions.manage')) {
    state.staffRoles = [];
    return;
  }

  try {
    state.staffRoles = await api('/api/hr/roles');
  } catch (error) {
    state.staffRoles = [];
  }
}

async function refreshAttendance() {
  if (!userCan('attendance.view_all|attendance.edit_all|attendance.view_assigned|attendance.submit_assigned')) {
    state.attendance = [];
    return;
  }

  const selectedDate = elements.attendanceDateInput?.value || new Date().toISOString().slice(0, 10);

  if (elements.attendanceDateInput && !elements.attendanceDateInput.value) {
    elements.attendanceDateInput.value = selectedDate;
  }

  try {
    state.attendance = await api(`/api/attendance/date/${encodeURIComponent(selectedDate)}`);
  } catch (error) {
    state.attendance = [];
  }
}

async function refreshCompletedAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);
  const defaultFrom = defaultFromDate.toISOString().slice(0, 10);
  const defaultToDate = new Date();
  defaultToDate.setDate(defaultToDate.getDate() - 1);
  const defaultTo = defaultToDate.toISOString().slice(0, 10);

  const from = elements.attendanceHistoryFromInput?.value || state.attendanceHistoryFrom || defaultFrom;
  let to = elements.attendanceHistoryToInput?.value || state.attendanceHistoryTo || defaultTo;

  if (to >= today) {
    to = defaultTo;
  }

  state.attendanceHistoryFrom = from;
  state.attendanceHistoryTo = to;

  if (elements.attendanceHistoryFromInput) {
    elements.attendanceHistoryFromInput.value = from;
  }
  if (elements.attendanceHistoryToInput) {
    elements.attendanceHistoryToInput.value = to;
    elements.attendanceHistoryToInput.max = defaultTo;
  }

  try {
    const query = new URLSearchParams({ from, to }).toString();
    state.completedAttendance = await api(`/api/attendance/range?${query}`);
  } catch (error) {
    state.completedAttendance = [];
    showToast(error.message);
  }
}

async function refreshPayslips() {
  if (!userCan('hr.view_payslips|hr.manage_payslips|sensitive.payroll.view')) {
    state.payslips = [];
    state.payslipStatusMessage = '';
    return;
  }

  try {
    state.payslips = await api('/api/payslips');
    state.payslipStatusMessage = '';
  } catch (error) {
    state.payslips = [];
    state.payslipStatusMessage = error.message;
  }
}

const REPORT_FILTER_PREFIXES = ['studentReport', 'schoolReport', 'admissionsReport', 'reenrolmentReport', 'consentReport', 'yearEndReport'];

function selectedYearEndFinancialYear() {
  const input = document.getElementById('yearEndFinancialYearInput');
  const year = Number(input?.value || new Date().getFullYear());
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear();
}

function selectedYearEndRolloverYear() {
  return selectedYearEndFinancialYear() + 1;
}

function setReenrolmentYear(year) {
  const input = document.getElementById('reenrolmentYearInput');
  if (input && Number(input.value) !== Number(year)) {
    input.value = String(year);
  }
}

function featureRolloverYearForFetch() {
  if (activeViewName() === 'yearEndClosing') {
    const year = selectedYearEndRolloverYear();
    setReenrolmentYear(year);
    return year;
  }

  if (activeViewName() === 'yearEndReport') {
    const reportYear = Number(document.getElementById('yearEndReportYearInput')?.value || nextCalendarYear());
    return Number.isInteger(reportYear) && reportYear >= 2000 && reportYear <= 2100 ? reportYear : nextCalendarYear();
  }

  return reenrolmentTargetYear();
}

function activeReportPrefix() {
  const view = activeViewName();
  if (view === 'studentReports') return 'studentReport';
  if (view === 'report') return 'schoolReport';
  if (view === 'admissionsReport') return 'admissionsReport';
  if (view === 'reenrolmentReport') return 'reenrolmentReport';
  if (view === 'consentReport') return 'consentReport';
  if (view === 'yearEndReport') return 'yearEndReport';
  return 'schoolReport';
}

function reportFilterValues(prefix = activeReportPrefix()) {
  const yearInput = document.getElementById(`${prefix}YearFilter`);
  const classInput = document.getElementById(`${prefix}ClassFilter`);
  const year = Number(yearInput?.value || new Date().getFullYear());
  return {
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear(),
    className: classInput?.value || ''
  };
}

async function refreshReportData(prefix = activeReportPrefix()) {
  if (!userCan('reports.view|reports.finance.view|reports.attendance.view|reports.demographics.view|reports.year_end.view|school.consent.view')) {
    state.reportData = null;
    state.reportStatusMessage = '';
    return;
  }

  const filters = reportFilterValues(prefix);
  const params = new URLSearchParams({ year: String(filters.year) });
  if (filters.className) params.set('className', filters.className);

  try {
    state.reportData = await api(`/api/reports/school?${params.toString()}`);
    state.reportStatusMessage = '';
  } catch (error) {
    state.reportData = null;
    state.reportStatusMessage = error.message;
  }
}

async function refreshFeatureData() {
  const year = featureRolloverYearForFetch();
  state.featureRolloverYear = year;
  const calls = [
    ['admissions', '/api/school-features/admissions', 'admissions.view|admissions.review'],
    ['consentRecords', '/api/school-features/consent', 'school.consent.view|school.consent.manage'],
    ['missingConsent', '/api/school-features/consent/missing', 'school.consent.view|school.consent.manage'],
    ['financialAdjustments', '/api/school-features/adjustments', 'finance.adjustments.create|finance.invoices.view'],
    ['refunds', '/api/school-features/refunds', 'finance.refunds.create|finance.refunds.approve|finance.refunds.complete'],
    ['registrationFees', '/api/school-features/registration-fees', 'finance.registration_fees.view|finance.registration_fees.manage'],
    ['yearEndClosings', '/api/hr/year-end', 'finance.year_end_close|finance.year_end_reopen|reports.year_end.view'],
    ['financePeriodLocks', '/api/school-features/finance-period-locks', 'finance.period_lock.manage|finance.year_end_close|finance.year_end_reopen|reports.year_end.view'],
    ['communicationHistory', '/api/features/communication-history', 'communication.history.view|reports.view'],
    ['reEnrolments', `/api/platform/re-enrolment/${encodeURIComponent(year)}`, 'school.year_rollover.preview|school.year_rollover.apply|reports.year_end.view'],
    ['reEnrolmentPending', `/api/platform/re-enrolment/${encodeURIComponent(year)}/pending`, 'school.year_rollover.preview|school.year_rollover.apply']
  ];

  const results = await Promise.allSettled(calls.map(([, path, permission]) => (
    userCan(permission) ? api(path) : Promise.resolve([])
  )));
  results.forEach((result, index) => {
    const [key] = calls[index];
    state[key] = result.status === 'fulfilled' ? result.value : [];
  });
}

function renderData() {
  applyRoleShell();
  renderMetrics();
  renderSchoolOptions();
  renderBillingCategorySchoolControls();
  renderBillingCategories();
  renderBillingCategoryOptions();
  renderClassOptions();
  renderInvoiceFilters();
  renderInvoicesTable();
  renderRecentLists();
  renderFamilyOptions();
  renderFamiliesTable();
  renderStudentsTable();
  renderStudentStatusFilter();
  renderRegisterLearnerOptions();
  renderClasses();
  renderAttendance();
  renderTransactions();
  renderReconciliation();
  renderEmployees();
  renderLeaveEmployeeOptions();
  renderLeaves();
  renderPayslips();
  renderAccount();
  renderSchoolUsers();
  renderAuditLogs();
  renderFinanceAuditLogs();
  renderPermissionMatrix();
  renderDashboardWarnings();
  renderMatchSuggestions();
  renderSettings();
  renderAdminControls();
  installFeaturePanels();
  renderFeaturePages();
  applyIconPermissions();
}

function studentLabel(student) {
  return `${student.FirstName || ''} ${student.LastName || ''}`.trim() || `Student ${student.StudentID}`;
}

function familyLabel(family) {
  return family.FamilyName || family.FamilyCode || `Family ${family.FamilyID}`;
}

function optionsFor(items, idKey, labelFn, emptyLabel = 'Select') {
  return `<option value="">${emptyLabel}</option>` + items.map((item) => (
    `<option value="${item[idKey]}">${escapeHtml(labelFn(item))}</option>`
  )).join('');
}

function defaultPermissionSlipBody() {
  return 'I confirm that I am the parent or legal guardian of the learner named on this permission slip. I have read and understood the school request, activity details, risks, transport arrangements, supervision notes, and emergency procedures where applicable. I grant or decline permission for my child to participate as indicated below. I understand that the school will take reasonable care of learners and will contact me using the contact details on record if an emergency arises.';
}

function uniqueClassNames() {
  const names = new Set();
  state.classes.forEach((item) => {
    if (item.ClassName) names.add(String(item.ClassName).trim());
  });
  state.students.forEach((item) => {
    if (item.ClassName) names.add(String(item.ClassName).trim());
  });
  return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function gradeNameFromClassName(className) {
  const value = String(className || '').trim();
  if (!value) return '';
  const gradeMatch = value.match(/^(grade\s*\d+|gr\s*\d+|grade\s*r|gr\s*r|pre[-\s]?r|rr|r)\b/i);
  if (gradeMatch) return gradeMatch[0].replace(/\s+/g, ' ').trim();
  const sectionMatch = value.match(/^(.+?)(?:\s*[-/]\s*[A-Z0-9]+|\s+[A-Z])$/i);
  return (sectionMatch?.[1] || value).trim();
}

function uniqueGradeNames() {
  const names = new Set();
  uniqueClassNames().forEach((className) => {
    const gradeName = gradeNameFromClassName(className);
    if (gradeName) names.add(gradeName);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function matchingConsentStudents(scope, targetValue, studentId) {
  const activeStudents = state.students.filter((student) => student.IsActive !== false);
  if (scope === 'Student') {
    return activeStudents.filter((student) => Number(student.StudentID) === Number(studentId));
  }
  if (scope === 'Class') {
    return activeStudents.filter((student) => String(student.ClassName || '').trim() === String(targetValue || '').trim());
  }
  if (scope === 'Grade') {
    const grade = String(targetValue || '').trim();
    return activeStudents.filter((student) => {
      const className = String(student.ClassName || '').trim();
      return className === grade || className.startsWith(grade);
    });
  }
  return activeStudents;
}

function renderConsentTargetInputs() {
  const scopeSelect = document.getElementById('consentTargetScope');
  const targetWrap = document.getElementById('consentTargetValueWrap');
  const targetSelect = document.getElementById('consentTargetValueSelect');
  const studentWrap = document.getElementById('consentStudentWrap');
  const studentSelect = document.getElementById('consentStudentSelect');
  const summary = document.getElementById('consentTargetSummary');
  if (!scopeSelect) return;

  const scope = scopeSelect.value || 'School';
  const needsTarget = scope === 'Class' || scope === 'Grade';
  const needsStudent = scope === 'Student';

  if (targetWrap) targetWrap.hidden = !needsTarget;
  if (targetSelect) {
    targetSelect.disabled = !needsTarget;
    const options = scope === 'Grade'
      ? uniqueGradeNames().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')
      : uniqueClassNames().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    const empty = scope === 'Grade' ? '<option value="">Select grade</option>' : '<option value="">Select class</option>';
    const nextOptions = empty + options;
    if (targetSelect.dataset.lastOptions !== nextOptions) {
      targetSelect.innerHTML = nextOptions;
      targetSelect.dataset.lastOptions = nextOptions;
    }
  }

  if (studentWrap) studentWrap.hidden = !needsStudent;
  if (studentSelect) studentSelect.disabled = !needsStudent;

  const selectedStudents = matchingConsentStudents(scope, targetSelect?.value, studentSelect?.value);
  if (summary) {
    const label = selectedStudents.length === 1 ? 'learner' : 'learners';
    summary.textContent = `This will create pending legal permission slips for ${selectedStudents.length} ${label}.`;
  }
  updateConsentDocumentPreview();
}

function updateConsentDocumentPreview() {
  const preview = document.getElementById('consentDocumentPreview');
  if (!preview) return;

  const title = document.getElementById('consentTitleInput')?.value || 'Permission Slip';
  const consentType = document.getElementById('consentTypeSelect')?.value || 'General Permission';
  const activityDate = document.getElementById('consentActivityDateInput')?.value || '-';
  const dueDate = document.getElementById('consentDueDateInput')?.value || '-';
  const location = document.getElementById('consentLocationInput')?.value || '-';
  const body = document.getElementById('consentDocumentBodyInput')?.value || defaultPermissionSlipBody();
  const riskNotes = document.getElementById('consentRiskNotesInput')?.value || 'None recorded';
  const medicalInstructions = document.getElementById('consentMedicalInstructionsInput')?.value || 'Use learner emergency details on record.';

  preview.innerHTML = `
    <div class="permission-slip-document">
      <div class="permission-slip-heading">
        <span>Legal Permission Slip</span>
        <strong>${escapeHtml(title)}</strong>
      </div>
      <div class="permission-slip-grid">
        <div><span>Type</span><strong>${escapeHtml(consentType)}</strong></div>
        <div><span>Activity date</span><strong>${escapeHtml(activityDate)}</strong></div>
        <div><span>Response due</span><strong>${escapeHtml(dueDate)}</strong></div>
        <div><span>Location</span><strong>${escapeHtml(location)}</strong></div>
      </div>
      <p>${escapeHtml(body).replaceAll('\n', '<br>')}</p>
      <div class="permission-slip-clause"><span>Risk / transport / supervision notes</span><p>${escapeHtml(riskNotes).replaceAll('\n', '<br>')}</p></div>
      <div class="permission-slip-clause"><span>Medical / emergency instructions</span><p>${escapeHtml(medicalInstructions).replaceAll('\n', '<br>')}</p></div>
      <div class="permission-slip-signature-row">
        <span>Parent/guardian signature</span>
        <span>Date</span>
      </div>
    </div>
  `;
}

function setPanel(viewId, content) {
  const panel = document.querySelector(`#${viewId} .page-table-panel`);
  if (panel && !panel.dataset.wiredFeature) {
    panel.dataset.wiredFeature = 'true';
    panel.innerHTML = content;
  }
}

function consentFilterStripMarkup({ heading, searchTypeId, searchInputId, pageSizeId, filterId, filterLabel, filterOptions, placeholder, defaultSearchType = 'Permission slip' }) {
  const searchTypes = ['Permission slip', 'Student name', 'Class', 'Parent / guardian'];
  const pageSizes = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '40', label: '40' },
    { value: '80', label: '80' },
    { value: '160', label: '160' },
    { value: '9999', label: 'All' }
  ];

  return `
    <section class="consent-filter-strip">
      <div class="class-filter-heading">
        <span class="filter-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M4 6h16l-6 7v5l-4 2v-7L4 6z"></path>
          </svg>
        </span>
        <span>${heading}</span>
      </div>
      <div class="class-filter-grid student-filter-grid">
        <label>
          Search Type
          <select id="${searchTypeId}" class="thin-input">
            ${searchTypes.map((type) => `<option${type === defaultSearchType ? ' selected' : ''}>${type}</option>`).join('')}
          </select>
        </label>
        <label>
          Search Value
          <input id="${searchInputId}" class="thin-input" type="search" placeholder="${placeholder}">
        </label>
        <label>
          Show
          <select id="${pageSizeId}" class="thin-input">
            ${pageSizes.map((item) => `<option value="${item.value}"${item.value === '10' ? ' selected' : ''}>${item.label}</option>`).join('')}
          </select>
        </label>
        <label>
          ${filterLabel}
          <select id="${filterId}" class="thin-input">
            ${filterOptions.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
          </select>
        </label>
      </div>
    </section>
  `;
}

function reportFilterMarkup(prefix, title, options = {}) {
  const currentYear = new Date().getFullYear();
  return `
    <section class="table-panel report-filter-panel">
      <div class="report-filter-heading">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(options.subtitle || 'Filter by reporting year and class. Results are scoped to the logged-in school.')}</p>
        </div>
        <button class="secondary-button compact-button" data-action="print-report" data-report-prefix="${prefix}" data-report-title="${escapeHtml(title)}" type="button">Print / PDF</button>
      </div>
      <div class="form-grid report-filter-grid">
        <label>Year<input id="${prefix}YearFilter" type="number" min="2000" max="2100" value="${options.year || currentYear}"></label>
        <label>Class<select id="${prefix}ClassFilter"><option value="">All classes</option></select></label>
        ${options.typeFilter ? `<label>Report type<select id="${prefix}TypeFilter">${options.typeFilter}</select></label>` : ''}
      </div>
    </section>
  `;
}

function reportPrintArea(prefix, inner = '') {
  return `<section id="${prefix}PrintArea" class="report-print-area">${inner}</section>`;
}

function installFeaturePanels() {
  setPanel('reenrolmentView', `
    <div class="panel-header"><div><h3>Re-Enrolment / Year Rollover</h3><p>Move learners into classes already created for the next academic year.</p></div></div>
    <div id="reenrolmentSummaryMetrics" class="metrics-grid section-spacer"></div>
    <div id="reenrolmentClassNotice" class="form-message info section-spacer"></div>
    <form id="reenrolmentForm" class="module-form flush-form">
      <div class="form-grid">
        <label>Next academic year<input id="reenrolmentYearInput" name="academicYear" type="number" min="2000" max="2100" value="${nextCalendarYear()}"></label>
        <label>Student<select name="studentId" id="reenrolmentStudentSelect" required></select></label>
        <label>Next-year class<select name="newClassName" id="reenrolmentNewClassSelect"></select></label>
        <label>Action<select name="action"><option>Promoted</option><option>Retained</option><option>Left</option><option>Pending</option></select></label>
      </div>
      <button class="primary-button compact-button" data-permission="school.year_rollover.apply" type="submit">Process Student</button>
    </form>
    <div class="panel-header compact-panel-header section-spacer"><div><h3>Learners Still Pending</h3></div></div>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Learner</th><th>Current class</th><th>Next-year class</th><th>Actions</th></tr></thead><tbody id="reenrolmentPendingTable"></tbody></table></div>
    <div class="panel-header compact-panel-header section-spacer"><div><h3>Processed Learners</h3></div></div>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Student</th><th>Previous year</th><th>Previous class</th><th>New class</th><th>Action</th><th>Balance BF</th><th>Advance BF</th></tr></thead><tbody id="reenrolmentTable"></tbody></table></div>
  `);

  setPanel('consentPermissionsView', `
    <div class="consent-page-layout">
      <div class="panel-header compact-panel-header">
        <div>
          <h3>Permission Slip List</h3>
        </div>
      </div>
      <div id="consentRequestSummaryMetrics" class="metrics-grid section-spacer"></div>
      ${consentFilterStripMarkup({
        heading: 'Filter permission slips',
        searchTypeId: 'consentListSearchTypeSelect',
        searchInputId: 'consentListSearchInput',
        pageSizeId: 'consentListPageSize',
        filterId: 'consentListStatusFilterInput',
        filterLabel: 'Status',
        placeholder: 'Search permission slips...',
        defaultSearchType: 'Permission slip',
        filterOptions: [
          { value: 'all', label: 'All' },
          { value: 'Pending', label: 'Pending' },
          { value: 'Accepted', label: 'Accepted' },
          { value: 'Declined', label: 'Declined' }
        ]
      })}
      <div class="table-wrap section-spacer"><table><thead><tr><th>Permission slip</th><th>Student</th><th>Target</th><th>Response</th><th>Due</th><th>Signed by</th><th>Actions</th></tr></thead><tbody id="consentTable"></tbody></table></div>
      <div class="panel-header compact-panel-header section-spacer">
        <div>
          <h3>Outstanding Responses</h3>
        </div>
      </div>
      ${consentFilterStripMarkup({
        heading: 'Filter outstanding responses',
        searchTypeId: 'consentOutstandingSearchTypeSelect',
        searchInputId: 'consentOutstandingSearchInput',
        pageSizeId: 'consentOutstandingPageSize',
        filterId: 'consentOutstandingDueFilterInput',
        filterLabel: 'Due',
        placeholder: 'Search outstanding responses...',
        defaultSearchType: 'Student name',
        filterOptions: [
          { value: 'all', label: 'All' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'no-date', label: 'No due date' }
        ]
      })}
      <div class="table-wrap section-spacer"><table><thead><tr><th>Permission slip</th><th>Learner</th><th>Class</th><th>Parent / family</th><th>Contact</th><th>Due</th><th>Actions</th></tr></thead><tbody id="outstandingConsentTable"></tbody></table></div>
      <div class="panel-header compact-panel-header section-spacer">
        <div>
          <h3>Signed Permission Slips</h3>
        </div>
      </div>
      ${consentFilterStripMarkup({
        heading: 'Filter signed permission slips',
        searchTypeId: 'consentSignedSearchTypeSelect',
        searchInputId: 'consentSignedSearchInput',
        pageSizeId: 'consentSignedPageSize',
        filterId: 'consentSignedResponseFilterInput',
        filterLabel: 'Response',
        placeholder: 'Search signed permission slips...',
        defaultSearchType: 'Parent / guardian',
        filterOptions: [
          { value: 'all', label: 'All' },
          { value: 'Accepted', label: 'Accepted' },
          { value: 'Declined', label: 'Declined' }
        ]
      })}
      <div class="table-wrap section-spacer"><table><thead><tr><th>Permission slip</th><th>Learner</th><th>Parent / guardian</th><th>Relationship</th><th>Response</th><th>Signed date</th><th>Notes</th><th>Actions</th></tr></thead><tbody id="signedConsentTable"></tbody></table></div>
      <div class="section-spacer actions">
        <button id="openConsentComposerButton" class="primary-button compact-button" data-action="open-consent-composer" data-permission="school.consent.manage" type="button">New Permission Slip</button>
      </div>
    </div>
  `);

  setPanel('financialAdjustmentsView', `
    <div class="panel-header"><div><h3>Financial Adjustments</h3><p>Audit-safe write-offs, reversals, and corrections.</p></div></div>
    <form id="adjustmentForm" class="module-form flush-form">
      <div class="form-grid">
        <label>Student<select name="studentId" id="adjustmentStudentSelect"></select></label>
        <label>Family<select name="familyId" id="adjustmentFamilySelect"></select></label>
        <label>Invoice<select name="invoiceId" id="adjustmentInvoiceSelect"></select></label>
        <label>Type<select name="adjustmentType" required><option>Write-off</option><option>Reversal</option><option>Credit Correction</option><option>Debit Correction</option><option>Fee Correction</option></select></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label>
        <label class="wide">Reason<textarea name="reason" rows="2" required></textarea></label>
      </div>
      <button class="primary-button compact-button" type="submit">Create Adjustment</button>
    </form>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Date</th><th>Student</th><th>Invoice</th><th>Type</th><th>Amount</th><th>Reason</th></tr></thead><tbody id="adjustmentsTable"></tbody></table></div>
  `);

  setPanel('refundsView', `
    <div class="panel-header"><div><h3>Refunds</h3><p>Refund requests, approvals, and completion.</p></div></div>
    <form id="refundForm" class="module-form flush-form">
      <div class="form-grid">
        <label>Family<select name="familyId" id="refundFamilySelect" required></select></label>
        <label>Student<select name="studentId" id="refundStudentSelect"></select></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label>
        <label class="wide">Reason<textarea name="reason" rows="2" required></textarea></label>
      </div>
      <button class="primary-button compact-button" type="submit">Create Refund</button>
    </form>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Family</th><th>Student</th><th>Amount</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead><tbody id="refundsTable"></tbody></table></div>
  `);

  setPanel('registrationFeesView', `
    <div class="panel-header"><div><h3>Registration / Deposit Fees</h3><p>Once-off fees separate from monthly billing.</p></div></div>
    <form id="registrationFeeForm" class="module-form flush-form">
      <div class="form-grid">
        <label>Student<select name="studentId" id="registrationFeeStudentSelect"></select></label>
        <label>Family<select name="familyId" id="registrationFeeFamilySelect"></select></label>
        <label>Fee type<input name="feeType" type="text" required></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label>
        <label>Refundable<select name="isRefundable"><option value="false">No</option><option value="true">Yes</option></select></label>
        <label class="wide">Notes<textarea name="notes" rows="2"></textarea></label>
      </div>
      <button class="primary-button compact-button" type="submit">Create Fee</button>
    </form>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Student</th><th>Family</th><th>Type</th><th>Amount</th><th>Refundable</th><th>Paid</th><th>Actions</th></tr></thead><tbody id="registrationFeesTable"></tbody></table></div>
  `);

  setPanel('yearEndClosingView', `
    <div class="panel-header"><div><h3>Year-End Financial Closing</h3><p>Close the financial year only after next-year learner promotions and enrolments are verified.</p></div></div>
    <form id="yearEndClosingForm" class="module-form flush-form">
      <div class="form-grid">
        <label>Financial year<input id="yearEndFinancialYearInput" name="financialYear" type="number" min="2000" max="2100" value="${new Date().getFullYear()}" required></label>
        <label>Status<select name="status"><option>Open</option><option>In Review</option><option>Ready to Close</option><option>Closed</option></select></label>
      </div>
      <button class="primary-button compact-button" type="submit">Create Year-End Record</button>
    </form>
    <div id="yearEndRolloverNotice" class="form-message info section-spacer"></div>
    <div id="yearEndRolloverMetrics" class="metrics-grid section-spacer"></div>
    <div class="actions section-spacer">
      <button class="secondary-button compact-button" data-action="open-year-end-rollover" data-permission="school.year_rollover.preview|school.year_rollover.apply" type="button">Open Next-Year Rollover</button>
    </div>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Year</th><th>Status</th><th>Closed</th><th>Reopened</th><th>Actions</th></tr></thead><tbody id="yearEndClosingTable"></tbody></table></div>
    <div class="panel-header compact-panel-header section-spacer"><div><h3>Finance Period Locking</h3><p>Lock closed months or years. Corrections require a reopen reason.</p></div></div>
    <form id="financePeriodLockForm" class="module-form flush-form">
      <div class="form-grid">
        <label>Period type<select name="lockType" id="financePeriodLockType"><option>Month</option><option>Year</option><option>Custom</option></select></label>
        <label>Month<select name="month" id="financePeriodLockMonth">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${new Date(2026, i, 1).toLocaleString('en-ZA', { month: 'long' })}</option>`).join('')}</select></label>
        <label>Year<input name="year" type="number" min="2000" max="2100" value="${new Date().getFullYear()}"></label>
        <label>Custom start<input name="periodStart" type="date"></label>
        <label>Custom end<input name="periodEnd" type="date"></label>
        <label class="wide">Reason<textarea name="reason" rows="2" required></textarea></label>
      </div>
      <button class="primary-button compact-button" data-permission="finance.period_lock.manage|finance.year_end_close" type="submit">Lock Period</button>
    </form>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Period</th><th>Type</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead><tbody id="financePeriodLocksTable"></tbody></table></div>
  `);

  setPanel('studentReportsView', `
    ${reportFilterMarkup('studentReport', 'Student Reports', { subtitle: 'Birthdays, demographics, enrolment movement, and class counts.' })}
    ${reportPrintArea('studentReport', `
      <div id="studentReportSummary" class="metrics-grid section-spacer"></div>
      <div id="studentReportCharts" class="report-chart-grid section-spacer"></div>
      <div class="report-table-grid section-spacer">
        <section class="table-panel">
          <div class="panel-header compact-panel-header"><div><h3>Birthday Register</h3></div></div>
          <div class="table-wrap"><table><thead><tr><th>Learner</th><th>Class</th><th>Date of birth</th><th>Age this year</th></tr></thead><tbody id="studentBirthdaysTable"></tbody></table></div>
        </section>
        <section class="table-panel">
          <div class="panel-header compact-panel-header"><div><h3>Enrolment Detail</h3></div></div>
          <div class="table-wrap"><table><thead><tr><th>Learner</th><th>Class</th><th>Enrolled</th><th>Status</th></tr></thead><tbody id="studentReportsTable"></tbody></table></div>
        </section>
      </div>
    `)}
  `);

  setPanel('reportView', `
    ${reportFilterMarkup('schoolReport', 'School Report', {
      subtitle: 'Whole-school view of learners, attendance, finance, admissions, consent, and year-end readiness.',
      typeFilter: '<option value="overview">Overview</option><option value="learners">Learners</option><option value="finance">Financial Management</option><option value="attendance">Attendance</option>'
    })}
    ${reportPrintArea('schoolReport', `
      <div id="schoolReportSummary" class="metrics-grid section-spacer"></div>
      <div id="schoolReportCharts" class="report-chart-grid section-spacer"></div>
      <div class="table-panel section-spacer">
        <div class="panel-header compact-panel-header"><div><h3>Class Finance and Attendance</h3></div></div>
        <div class="table-wrap"><table><thead><tr><th>Class</th><th>Learners</th><th>Attendance</th><th>Invoiced</th><th>Paid</th><th>Outstanding</th><th>Collection</th></tr></thead><tbody id="schoolReportClassTable"></tbody></table></div>
      </div>
      <div class="table-panel section-spacer">
        <div class="panel-header compact-panel-header"><div><h3>Outstanding Fees Detail</h3></div></div>
        <div class="table-wrap"><table><thead><tr><th>Learner</th><th>Class</th><th>Invoice</th><th>Status</th><th>Outstanding</th><th>Due</th></tr></thead><tbody id="schoolReportOutstandingTable"></tbody></table></div>
      </div>
    `)}
  `);

  setPanel('exportReportsView', `
    <div class="panel-header"><div><h3>Export Reports</h3><p>Readable exports scoped to the signed-in school.</p></div></div>
    <div class="actions">
      <button class="primary-button compact-button" data-action="download-export" data-export="students" type="button">Students CSV</button>
      <button class="primary-button compact-button" data-action="download-export" data-export="invoices" type="button">Invoices CSV</button>
      <button class="primary-button compact-button" data-action="download-export" data-export="transactions" type="button">Payments CSV</button>
      <button class="primary-button compact-button" data-action="download-export" data-export="employees" type="button">Employees CSV</button>
      <button class="primary-button compact-button" data-action="download-export" data-export="outstanding-fees" type="button">Outstanding Fees Excel</button>
      <button class="secondary-button compact-button" data-action="print-report" data-report-prefix="schoolReport" data-report-title="School Report" type="button">Print Current Report</button>
    </div>
  `);

  setPanel('communicationHistoryView', `
    <div class="panel-header"><div><h3>Communication History</h3><p>Invoices, statements, reminders, and delivery statuses.</p></div></div>
    <div class="form-grid"><label>Type<input id="communicationTypeFilter" type="search" placeholder="Invoice, Statement, Reminder"></label><label>Status<input id="communicationStatusFilter" type="search" placeholder="Sent, Delivered, Failed"></label></div>
    <div class="table-wrap section-spacer"><table><thead><tr><th>Date</th><th>Type</th><th>Subject</th><th>Status</th><th>Delivery</th></tr></thead><tbody id="communicationHistoryTable"></tbody></table></div>
  `);

  setPanel('admissionsReportView', `
    ${reportFilterMarkup('admissionsReport', 'Admissions Report', { subtitle: 'Application status, conversion, and monthly admissions movement.' })}
    ${reportPrintArea('admissionsReport', `
      <div id="admissionsReportSummary" class="metrics-grid section-spacer"></div>
      <div id="admissionsReportCharts" class="report-chart-grid section-spacer"></div>
      <div class="table-panel section-spacer"><div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Status</th><th>Class</th><th>Applied</th><th>Enrolled</th></tr></thead><tbody id="admissionsReportTable"></tbody></table></div></div>
    `)}
  `);

  setPanel('reenrolmentReportView', `
    ${reportFilterMarkup('reenrolmentReport', 'Re-Enrolment Report', { subtitle: 'Promoted, retained, left, and pending learners for the selected academic year.' })}
    ${reportPrintArea('reenrolmentReport', `
      <div id="reenrolmentReportSummary" class="metrics-grid section-spacer"></div>
      <div id="reenrolmentReportCharts" class="report-chart-grid section-spacer"></div>
      <div class="table-panel section-spacer"><div class="table-wrap"><table><thead><tr><th>Learner</th><th>Previous</th><th>New</th><th>Action</th><th>Balance BF</th><th>Advance BF</th></tr></thead><tbody id="reenrolmentReportTable"></tbody></table></div></div>
    `)}
  `);

  setPanel('consentReportView', `
    ${reportFilterMarkup('consentReport', 'Consent Report', { subtitle: 'Permission slip responses, outstanding records, and signed response tracking.' })}
    ${reportPrintArea('consentReport', `
      <div id="consentReportSummary" class="metrics-grid section-spacer"></div>
      <div id="consentReportCharts" class="report-chart-grid section-spacer"></div>
      <div class="table-panel section-spacer"><div class="table-wrap"><table><thead><tr><th>Learner</th><th>Class</th><th>Permission slip</th><th>Response</th><th>Signed by</th><th>Date</th></tr></thead><tbody id="consentReportTable"></tbody></table></div></div>
    `)}
  `);

  setPanel('yearEndReportView', `
    ${reportFilterMarkup('yearEndReport', 'Year-End Report', { subtitle: 'Financial closing, balances brought forward, and next-year rollover summary.' })}
    ${reportPrintArea('yearEndReport', `
      <div id="yearEndReportSummary" class="metrics-grid section-spacer"></div>
      <div id="yearEndReportCharts" class="report-chart-grid section-spacer"></div>
      <div class="report-table-grid section-spacer">
        <section class="table-panel">
          <div class="panel-header compact-panel-header"><div><h3>Rollover Records</h3></div></div>
          <div class="table-wrap"><table><thead><tr><th>Learner</th><th>Action</th><th>Balance BF</th><th>Advance BF</th></tr></thead><tbody id="yearEndReportTable"></tbody></table></div>
        </section>
        <section class="table-panel">
          <div class="panel-header compact-panel-header"><div><h3>Balance Forward Detail</h3></div></div>
          <div class="table-wrap"><table><thead><tr><th>Learner</th><th>Class</th><th>From</th><th>To</th><th>Outstanding</th><th>Advance</th></tr></thead><tbody id="yearEndBalanceForwardTable"></tbody></table></div>
        </section>
      </div>
    `)}
  `);

  wireFeatureForms();
}

function wireFeatureForms() {
  const bind = (id, event, handler) => {
    const element = document.getElementById(id);
    if (!element || element.dataset.boundFeature) return;
    element.dataset.boundFeature = 'true';
    element.addEventListener(event, handler);
  };

  bind('reenrolmentForm', 'submit', async (event) => {
    event.preventDefault();
    const action = event.currentTarget.elements.action?.value;
    const newClassName = event.currentTarget.elements.newClassName?.value;
    const year = event.currentTarget.elements.academicYear?.value || reenrolmentTargetYear();
    if (['Promoted', 'Retained'].includes(action) && !newClassName) {
      showToast(`Select a class created for ${year}`);
      return;
    }
    if (action === 'Left' && !window.confirm('Mark this learner as left during year rollover?')) {
      return;
    }
    await submitFeatureForm(event.currentTarget, '/api/platform/re-enrolment', 'Re-enrolment processed');
  });

  bind('reenrolmentYearInput', 'change', async () => {
    await refreshFeatureData();
    renderFeaturePages();
  });

  bind('consentForm', 'submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFormBusy(form, true, 'Sending...');
    try {
      const data = normalizeFeaturePayload(formData(form));
      const result = await api('/api/school-features/consent', { method: 'POST', body: JSON.stringify(data) });
      form.reset();
      closeConsentDialog();
      await refreshFeatureData();
      renderFeaturePages();
      showToast(`Permission slip sent to ${result.createdCount || 0} learners`);
    } catch (error) {
      showToast(error.message);
    } finally {
      setFormBusy(form, false);
    }
  });

  bind('consentTargetScope', 'change', renderConsentTargetInputs);
  bind('consentTargetValueSelect', 'change', renderConsentTargetInputs);
  bind('consentStudentSelect', 'change', renderConsentTargetInputs);
  bind('consentListSearchInput', 'input', (event) => {
    state.consentListSearchQuery = event.target.value;
    renderConsentFeature();
  });
  bind('consentListSearchTypeSelect', 'change', (event) => {
    state.consentListSearchType = event.target.value;
    renderConsentFeature();
  });
  bind('consentListStatusFilterInput', 'change', (event) => {
    state.consentListStatusFilter = event.target.value;
    renderConsentFeature();
  });
  bind('consentListPageSize', 'change', (event) => {
    state.consentListPageSize = Number(event.target.value) || 10;
    renderConsentFeature();
  });
  bind('consentOutstandingSearchInput', 'input', (event) => {
    state.consentOutstandingSearchQuery = event.target.value;
    renderConsentFeature();
  });
  bind('consentOutstandingSearchTypeSelect', 'change', (event) => {
    state.consentOutstandingSearchType = event.target.value;
    renderConsentFeature();
  });
  bind('consentOutstandingDueFilterInput', 'change', (event) => {
    state.consentOutstandingDueFilter = event.target.value;
    renderConsentFeature();
  });
  bind('consentOutstandingPageSize', 'change', (event) => {
    state.consentOutstandingPageSize = Number(event.target.value) || 10;
    renderConsentFeature();
  });
  bind('consentSignedSearchInput', 'input', (event) => {
    state.consentSignedSearchQuery = event.target.value;
    renderConsentFeature();
  });
  bind('consentSignedSearchTypeSelect', 'change', (event) => {
    state.consentSignedSearchType = event.target.value;
    renderConsentFeature();
  });
  bind('consentSignedResponseFilterInput', 'change', (event) => {
    state.consentSignedResponseFilter = event.target.value;
    renderConsentFeature();
  });
  bind('consentSignedPageSize', 'change', (event) => {
    state.consentSignedPageSize = Number(event.target.value) || 10;
    renderConsentFeature();
  });
  bind('consentTitleInput', 'input', updateConsentDocumentPreview);
  bind('consentTypeSelect', 'change', updateConsentDocumentPreview);
  bind('consentActivityDateInput', 'input', updateConsentDocumentPreview);
  bind('consentDueDateInput', 'input', updateConsentDocumentPreview);
  bind('consentLocationInput', 'input', updateConsentDocumentPreview);
  bind('consentDocumentBodyInput', 'input', updateConsentDocumentPreview);
  bind('consentRiskNotesInput', 'input', updateConsentDocumentPreview);
  bind('consentMedicalInstructionsInput', 'input', updateConsentDocumentPreview);

  bind('adjustmentForm', 'submit', async (event) => {
    event.preventDefault();
    await submitFeatureForm(event.currentTarget, '/api/school-features/adjustments', 'Financial adjustment created');
  });

  bind('refundForm', 'submit', async (event) => {
    event.preventDefault();
    await submitFeatureForm(event.currentTarget, '/api/school-features/refunds', 'Refund created');
  });

  bind('registrationFeeForm', 'submit', async (event) => {
    event.preventDefault();
    await submitFeatureForm(event.currentTarget, '/api/school-features/registration-fees', 'Registration fee created');
  });

  bind('yearEndClosingForm', 'submit', async (event) => {
    event.preventDefault();
    setReenrolmentYear(selectedYearEndRolloverYear());
    await submitFeatureForm(event.currentTarget, '/api/hr/year-end', 'Year-end record created');
  });

  bind('yearEndFinancialYearInput', 'change', async () => {
    setReenrolmentYear(selectedYearEndRolloverYear());
    await refreshFeatureData();
    renderFeaturePages();
  });

  bind('financePeriodLockForm', 'submit', async (event) => {
    event.preventDefault();
    await submitFeatureForm(event.currentTarget, '/api/school-features/finance-period-locks', 'Finance period locked');
  });

  bind('financePeriodLockType', 'change', () => {
    const type = document.getElementById('financePeriodLockType')?.value || 'Month';
    document.getElementById('financePeriodLockMonth')?.closest('label')?.classList.toggle('hidden', type !== 'Month');
  });

  REPORT_FILTER_PREFIXES.forEach((prefix) => {
    bind(`${prefix}YearFilter`, 'change', async () => {
      await refreshReportData(prefix);
      renderReportingFeatureTables();
    });
    bind(`${prefix}ClassFilter`, 'change', async () => {
      await refreshReportData(prefix);
      renderReportingFeatureTables();
    });
  });
  bind('schoolReportTypeFilter', 'change', renderReportingFeatureTables);
  bind('communicationTypeFilter', 'input', renderFeaturePages);
  bind('communicationStatusFilter', 'input', renderFeaturePages);
  bind('statementYearInput', 'input', renderFeaturePages);
  bind('statementSendOption', 'change', renderFeaturePages);
}

async function submitFeatureForm(form, path, successMessage) {
  setFormBusy(form, true, 'Saving...');
  try {
    const data = normalizeFeaturePayload(formData(form));
    await api(path, { method: 'POST', body: JSON.stringify(data) });
    form.reset();
    await refreshFeatureData();
    renderFeaturePages();
    showToast(successMessage);
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(form, false);
  }
}

function normalizeFeaturePayload(data) {
  const normalized = { ...data };
  ['studentId', 'familyId', 'invoiceId', 'billingCategoryId', 'academicYear', 'financialYear'].forEach((key) => {
    if (normalized[key] === '') {
      delete normalized[key];
    } else if (normalized[key] !== undefined) {
      normalized[key] = Number(normalized[key]);
    }
  });
  ['amount', 'balanceCarriedForward', 'advanceCreditCarriedForward'].forEach((key) => {
    if (normalized[key] === '') {
      delete normalized[key];
    } else if (normalized[key] !== undefined) {
      normalized[key] = Number(normalized[key]);
    }
  });
  if (normalized.isRefundable !== undefined) {
    normalized.isRefundable = normalized.isRefundable === true || normalized.isRefundable === 'true';
  }
  return normalized;
}

function renderFeatureSelects() {
  const studentOptions = optionsFor(state.students, 'StudentID', studentLabel, 'Select student');
  const familyOptions = optionsFor(state.families, 'FamilyID', familyLabel, 'Select family');
  const invoiceOptions = optionsFor(state.invoices, 'InvoiceID', (invoice) => `${invoice.InvoiceNumber || invoice.InvoiceID} - ${studentLabel(invoice)} - ${money(invoice.Amount || 0)}`, 'Select invoice');
  const pendingOptions = optionsFor(state.reEnrolmentPending.length ? state.reEnrolmentPending : state.students, 'StudentID', studentLabel, 'Select student');

  [
    ['consentStudentSelect', studentOptions],
    ['adjustmentStudentSelect', studentOptions],
    ['adjustmentFamilySelect', familyOptions],
    ['adjustmentInvoiceSelect', invoiceOptions],
    ['refundFamilySelect', familyOptions],
    ['refundStudentSelect', studentOptions],
    ['registrationFeeStudentSelect', studentOptions],
    ['registrationFeeFamilySelect', familyOptions],
    ['reenrolmentStudentSelect', pendingOptions]
  ].forEach(([id, options]) => {
    const select = document.getElementById(id);
    if (select && select.dataset.lastOptions !== options) {
      select.innerHTML = options;
      select.dataset.lastOptions = options;
    }
  });

  renderReenrolmentClassSelect();
  renderConsentTargetInputs();
}

function reenrolmentTargetYear() {
  const input = document.getElementById('reenrolmentYearInput');
  const year = Number(input?.value || nextCalendarYear());
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : nextCalendarYear();
}

function classesForAcademicYear(year) {
  return state.classes
    .filter((item) => item.IsActive !== false && classYear(item) === year)
    .sort((a, b) => String(a.ClassName || '').localeCompare(String(b.ClassName || '')));
}

function academicYearForClassName(className, fallback = currentCalendarYear()) {
  const normalized = String(className || '').trim();
  const currentYear = currentCalendarYear();
  const matches = state.classes
    .filter((item) => item.IsActive !== false && String(item.ClassName || '').trim() === normalized)
    .sort((a, b) => Math.abs(classYear(a) - currentYear) - Math.abs(classYear(b) - currentYear));
  return matches.length ? classYear(matches[0]) : fallback;
}

function reenrolmentClassOptions(selectedClass = '') {
  const targetYear = reenrolmentTargetYear();
  const selected = String(selectedClass || '').trim();
  const classes = classesForAcademicYear(targetYear);

  return classes.map((item) => {
    const className = item.ClassName || '';
    return `<option value="${escapeHtml(className)}" ${className === selected ? 'selected' : ''}>${escapeHtml(className)}</option>`;
  }).join('');
}

function renderReenrolmentClassSelect(selectedClass = '') {
  const select = document.getElementById('reenrolmentNewClassSelect');
  if (!select) return;
  const options = reenrolmentClassOptions(selectedClass);
  select.innerHTML = options || '<option value="">Create next-year classes first</option>';
  select.disabled = !options;
}

function metricCard(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function renderFeaturePages() {
  renderFeatureSelects();
  renderReenrolmentFeature();
  renderConsentFeature();
  renderFinanceFeatureTables();
  renderReportingFeatureTables();
  applyIconPermissions();
}

function renderReenrolmentFeature() {
  const targetYear = reenrolmentTargetYear();
  const nextYearClasses = classesForAcademicYear(targetYear);
  const notice = document.getElementById('reenrolmentClassNotice');
  if (notice) {
    notice.textContent = nextYearClasses.length
      ? `${nextYearClasses.length} active class${nextYearClasses.length === 1 ? '' : 'es'} available for ${targetYear}.`
      : `Create classes for ${targetYear} in Classes before processing promoted or retained learners.`;
    notice.classList.toggle('warn', !nextYearClasses.length);
  }

  const summary = document.getElementById('reenrolmentSummaryMetrics');
  if (summary) {
    summary.innerHTML = [
      metricCard('Target year', targetYear),
      metricCard('Next-year classes', nextYearClasses.length),
      metricCard('Pending', state.reEnrolmentPending.length),
      metricCard('Processed', state.reEnrolments.length),
      metricCard('Promoted', state.reEnrolments.filter((item) => item.Action === 'Promoted').length),
      metricCard('Left', state.reEnrolments.filter((item) => item.Action === 'Left').length)
    ].join('');
  }

  const pendingRows = state.reEnrolmentPending.map((student) => {
    const currentClass = student.ClassName || student.CurrentClassName || '-';
    const suggestedClass = suggestedNextClassName(currentClass);
    const selectedClass = classOptionExists(nextYearClasses, suggestedClass)
      ? suggestedClass
      : classOptionExists(nextYearClasses, currentClass)
        ? currentClass
        : '';
    const options = reenrolmentClassOptions(selectedClass);
    const currentYear = student.CurrentAcademicYear || currentCalendarYear();
    return `
      <tr>
        <td>
          <strong>${escapeHtml(studentLabel(student))}</strong>
          <span class="table-subtext">Current year: ${escapeHtml(String(currentYear))}</span>
        </td>
        <td>${escapeHtml(currentClass)}</td>
        <td>
          ${options
            ? `<select class="thin-input" data-reenrolment-row-class>${options}</select>`
            : `<span class="badge warn">No ${targetYear} classes</span>`}
        </td>
        <td>
          <button class="secondary-button compact-button" data-action="fill-reenrolment" data-permission="school.year_rollover.apply" data-id="${student.StudentID}" data-use-row-class="true" data-rollover-action="Promoted" type="button" ${options ? '' : 'disabled'}>Promote</button>
          <button class="secondary-button compact-button" data-action="fill-reenrolment" data-permission="school.year_rollover.apply" data-id="${student.StudentID}" data-use-row-class="true" data-rollover-action="Retained" type="button" ${options ? '' : 'disabled'}>Retain</button>
          <button class="ghost-button compact-button" data-action="fill-reenrolment" data-permission="school.year_rollover.apply" data-id="${student.StudentID}" data-next-class="" data-rollover-action="Left" type="button">Mark Left</button>
        </td>
      </tr>
    `;
  }).join('');
  setTable('reenrolmentPendingTable', pendingRows, 4, 'No pending learners found for the selected year.');

  const rows = state.reEnrolments.map((item) => `
    <tr>
      <td>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim())}</td>
      <td>${escapeHtml(String(item.CurrentAcademicYear || Number(item.AcademicYear || 0) - 1 || '-'))}</td>
      <td>${escapeHtml(item.PreviousClassName || item.CurrentClassName || '-')}</td>
      <td>${escapeHtml(item.NewClassName || '-')}</td>
      <td><span class="badge">${escapeHtml(item.Action || 'Pending')}</span></td>
      <td>${money(item.BalanceCarriedForward || 0)}</td>
      <td>${money(item.AdvanceCreditCarriedForward || 0)}</td>
    </tr>
  `).join('');
  setTable('reenrolmentTable', rows, 7, 'No re-enrolment records found for the selected year.');
}

function classOptionExists(classes, className) {
  const normalized = String(className || '').trim();
  return normalized && classes.some((item) => String(item.ClassName || '').trim() === normalized);
}

function suggestedNextClassName(className) {
  const value = String(className || '').trim();
  const gradeNumber = value.match(/grade\s*(\d+)|gr\s*(\d+)/i);
  if (gradeNumber) {
    const current = Number(gradeNumber[1] || gradeNumber[2]);
    if (Number.isInteger(current)) {
      return value.replace(/(grade\s*|gr\s*)\d+/i, (match) => match.replace(/\d+/, String(current + 1)));
    }
  }
  if (/grade\s*r|gr\s*r|\br\b/i.test(value)) {
    return value.replace(/grade\s*r|gr\s*r|\br\b/i, 'Grade 1');
  }
  return '';
}

function renderConsentComposerState() {
  const dialog = document.getElementById('consentDialog');
  if (dialog) {
    dialog.classList.toggle('hidden', !state.consentComposerOpen);
  }
  if (state.consentComposerOpen) {
    document.body.classList.add('modal-open');
  } else if (!Array.from(document.querySelectorAll('.modal-backdrop')).some((item) => item.id !== 'consentDialog' && !item.classList.contains('hidden'))) {
    document.body.classList.remove('modal-open');
  }
  if (state.consentComposerOpen) {
    updateConsentDocumentPreview();
  }
}

function openConsentDialog() {
  const form = document.getElementById('consentForm');
  if (form) {
    form.reset();
  }
  state.consentComposerOpen = true;
  renderConsentComposerState();
  renderConsentTargetInputs();
  window.setTimeout(() => document.getElementById('consentTitleInput')?.focus(), 0);
}

function closeConsentDialog() {
  state.consentComposerOpen = false;
  renderConsentComposerState();
}

function consentRequestKey(item) {
  return item?.ConsentRequestID ? `request-${item.ConsentRequestID}` : `record-${item?.ConsentID}`;
}

function consentGroupForRecord(record) {
  const key = consentRequestKey(record);
  return state.consentRecords.filter((item) => consentRequestKey(item) === key);
}

function closeConsentDetailDialog() {
  state.selectedConsentRecordId = null;
  const dialog = document.getElementById('consentDetailDialog');
  dialog?.classList.add('hidden');
  if (!Array.from(document.querySelectorAll('.modal-backdrop')).some((item) => !item.classList.contains('hidden'))) {
    document.body.classList.remove('modal-open');
  }
}

function renderConsentDetailDialog() {
  const content = document.getElementById('consentDetailContent');
  const record = state.consentRecords.find((item) => Number(item.ConsentID) === Number(state.selectedConsentRecordId));
  if (!content || !record) {
    return;
  }

  const records = consentGroupForRecord(record);
  const pending = records.filter((item) => (item.Response || 'Pending') === 'Pending').length;
  const accepted = records.filter((item) => item.Response === 'Accepted').length;
  const declined = records.filter((item) => item.Response === 'Declined').length;
  const targetLabel = record.TargetScope === 'School'
    ? 'Entire student body'
    : record.TargetValue || record.ClassName || '-';

  const recipientRows = records.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim())}</strong>
        <span class="table-subtext">${escapeHtml(item.ClassName || '-')}</span>
      </td>
      <td>
        <strong>${escapeHtml(item.FamilyName || '-')}</strong>
        <span class="table-subtext">${escapeHtml(item.PrimaryParentName || '')}</span>
      </td>
      <td>
        <strong>${escapeHtml(item.PrimaryParentEmail || '-')}</strong>
        <span class="table-subtext">${escapeHtml(item.PrimaryParentPhone || '')}</span>
      </td>
      <td><span class="badge ${item.Response === 'Declined' ? 'danger' : (item.Response === 'Pending' || !item.Response) ? 'warn' : ''}">${escapeHtml(item.Response || 'Pending')}</span></td>
      <td>
        <strong>${escapeHtml(item.SignatureName || '-')}</strong>
        <span class="table-subtext">${escapeHtml(item.SignatureRelationship || '')}</span>
      </td>
      <td>${dateOnly(item.ResponseDate)}</td>
    </tr>
  `).join('');

  content.innerHTML = `
    <div class="permission-slip-detail-layout">
      <section class="permission-slip-document">
        <div class="permission-slip-heading">
          <span>${escapeHtml(record.ConsentType || 'Permission slip')}</span>
          <strong>${escapeHtml(record.RequestTitle || `${record.ConsentType || 'Consent'} request`)}</strong>
        </div>
        <div class="permission-slip-grid">
          <div><span>Target</span><strong>${escapeHtml(targetLabel)}</strong></div>
          <div><span>Activity date</span><strong>${dateOnly(record.ActivityDate)}</strong></div>
          <div><span>Response due</span><strong>${dateOnly(record.DueDate)}</strong></div>
          <div><span>Location</span><strong>${escapeHtml(record.Location || '-')}</strong></div>
        </div>
        <p>${escapeHtml(record.DocumentBody || record.Notes || 'No permission slip details were supplied.').replaceAll('\n', '<br>')}</p>
        <div class="permission-slip-clause"><span>Risk / transport / supervision notes</span><p>${escapeHtml(record.RiskNotes || 'None recorded').replaceAll('\n', '<br>')}</p></div>
        <div class="permission-slip-clause"><span>Medical / emergency instructions</span><p>${escapeHtml(record.MedicalInstructions || 'Use learner emergency details on record.').replaceAll('\n', '<br>')}</p></div>
      </section>
      <section>
        <div class="metrics-grid permission-slip-detail-metrics">
          ${metricCard('Recipients', records.length)}
          ${metricCard('Pending', pending)}
          ${metricCard('Accepted', accepted)}
          ${metricCard('Declined', declined)}
        </div>
        <div class="table-wrap section-spacer">
          <table>
            <thead><tr><th>Learner</th><th>Family</th><th>Contact</th><th>Response</th><th>Signed by</th><th>Signed date</th></tr></thead>
            <tbody>${recipientRows || '<tr><td colspan="6">No recipients found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function openConsentDetailDialog(consentId) {
  state.selectedConsentRecordId = Number(consentId);
  renderConsentDetailDialog();
  document.getElementById('consentDetailDialog')?.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function consentDateKey(value) {
  if (!value) {
    return '';
  }

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : localDateKey(date);
}

function consentSearchText(item, searchType) {
  const parentValues = [
    item.SignatureName,
    item.SignatureRelationship,
    item.FamilyName,
    item.PrimaryParentName,
    item.PrimaryParentEmail,
    item.PrimaryParentPhone
  ];
  const values = {
    'Permission slip': [item.RequestTitle, item.ConsentType, item.DocumentBody, item.RiskNotes, item.MedicalInstructions].join(' '),
    'Student name': [item.FirstName, item.LastName].join(' '),
    Class: [item.ClassName, item.TargetValue, item.TargetScope].join(' '),
    'Parent / guardian': parentValues.join(' '),
    'Parent / family': parentValues.join(' ')
  };

  return String(values[searchType] || values['Permission slip'] || '');
}

function filterConsentRecords({ query = '', searchType = 'Permission slip', status = 'all', dueFilter = 'all' } = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const today = localDateKey();

  return state.consentRecords.filter((item) => {
    const response = item.Response || 'Pending';
    if (status !== 'all' && response !== status) {
      return false;
    }

    if (dueFilter !== 'all') {
      const dueDate = consentDateKey(item.DueDate);
      if (dueFilter === 'no-date' && dueDate) {
        return false;
      }
      if (dueFilter === 'overdue' && (!dueDate || dueDate >= today)) {
        return false;
      }
      if (dueFilter === 'upcoming' && (!dueDate || dueDate < today)) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    return consentSearchText(item, searchType).toLowerCase().includes(normalizedQuery);
  });
}

function renderConsentFeature() {
  renderConsentComposerState();

  const metrics = document.getElementById('consentRequestSummaryMetrics');
  if (metrics) {
    const pending = state.consentRecords.filter((item) => (item.Response || 'Pending') === 'Pending').length;
    const accepted = state.consentRecords.filter((item) => item.Response === 'Accepted').length;
    const declined = state.consentRecords.filter((item) => item.Response === 'Declined').length;
    const signed = accepted + declined;
    const requestIds = new Set(state.consentRecords.map((item) => item.ConsentRequestID || `legacy-${item.ConsentID}`));
    metrics.innerHTML = metricCard('Permission slips', requestIds.size) + metricCard('Pending', pending) + metricCard('Signed', signed) + metricCard('Accepted', accepted) + metricCard('Declined', declined);
  }

  const filtered = filterConsentRecords({
    query: state.consentListSearchQuery,
    searchType: state.consentListSearchType,
    status: state.consentListStatusFilter
  });
  const pageSize = state.consentListPageSize || 10;
  const limited = filtered.slice(0, pageSize);

  const rows = limited.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.RequestTitle || `${item.ConsentType || 'Consent'} request`)}</strong>
        <span class="table-subtext">${escapeHtml(item.ConsentType || '-')}</span>
      </td>
      <td>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim())}</td>
      <td>${escapeHtml(item.TargetScope === 'School' ? 'Entire student body' : item.TargetValue || item.ClassName || '-')}</td>
      <td><span class="badge ${item.Response === 'Declined' ? 'danger' : (item.Response === 'Pending' || !item.Response) ? 'warn' : ''}">${escapeHtml(item.Response || 'Pending')}</span></td>
      <td>${dateOnly(item.DueDate || item.CreatedDate)}</td>
      <td>
        <strong>${escapeHtml(item.SignatureName || 'Awaiting signature')}</strong>
        <span class="table-subtext">${escapeHtml(item.SignatureRelationship || '')} ${item.ResponseDate ? dateOnly(item.ResponseDate) : ''}</span>
      </td>
      <td><button class="ghost-button" data-action="view-consent-detail" data-id="${item.ConsentID}" type="button">View</button></td>
    </tr>
  `).join('');
  setTable('consentTable', rows, 7, 'No consent records found.');

  const outstandingFiltered = filterConsentRecords({
    query: state.consentOutstandingSearchQuery,
    searchType: state.consentOutstandingSearchType,
    status: 'Pending',
    dueFilter: state.consentOutstandingDueFilter
  });
  const outstandingRows = outstandingFiltered
    .slice(0, state.consentOutstandingPageSize || 10)
    .map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.RequestTitle || `${item.ConsentType || 'Consent'} request`)}</strong>
          <span class="table-subtext">${escapeHtml(item.ConsentType || '-')}</span>
        </td>
        <td>
          <strong>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim())}</strong>
          <span class="table-subtext">${escapeHtml(item.FamilyName || '-')}</span>
        </td>
        <td>${escapeHtml(item.ClassName || '-')}</td>
        <td>
          <strong>${escapeHtml(item.PrimaryParentName || '-')}</strong>
          <span class="table-subtext">${escapeHtml(item.FamilyName || '')}</span>
        </td>
        <td>
          <strong>${escapeHtml(item.PrimaryParentEmail || '-')}</strong>
          <span class="table-subtext">${escapeHtml(item.PrimaryParentPhone || '')}</span>
        </td>
        <td>${dateOnly(item.DueDate || item.CreatedDate)}</td>
        <td><button class="ghost-button" data-action="view-consent-detail" data-id="${item.ConsentID}" type="button">View</button></td>
      </tr>
    `).join('');
  setTable('outstandingConsentTable', outstandingRows, 7, 'No outstanding responses match the current filters.');

  const signedFiltered = filterConsentRecords({
    query: state.consentSignedSearchQuery,
    searchType: state.consentSignedSearchType,
    status: state.consentSignedResponseFilter
  }).filter((item) => (item.Response || 'Pending') !== 'Pending');
  const signedRows = signedFiltered
    .slice(0, state.consentSignedPageSize || 10)
    .map((item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.RequestTitle || `${item.ConsentType || 'Consent'} request`)}</strong>
          <span class="table-subtext">${escapeHtml(item.ConsentType || '-')}</span>
        </td>
        <td>
          <strong>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim())}</strong>
          <span class="table-subtext">${escapeHtml(item.ClassName || '-')}</span>
        </td>
        <td>
          <strong>${escapeHtml(item.SignatureName || item.PrimaryParentName || '-')}</strong>
          <span class="table-subtext">${escapeHtml(item.PrimaryParentEmail || item.FamilyName || '')}</span>
        </td>
        <td>${escapeHtml(item.SignatureRelationship || '-')}</td>
        <td><span class="badge ${item.Response === 'Declined' ? 'danger' : ''}">${escapeHtml(item.Response || '-')}</span></td>
        <td>${dateOnly(item.ResponseDate)}</td>
        <td>${escapeHtml(item.ResponseNotes || '-')}</td>
        <td><button class="ghost-button" data-action="view-consent-detail" data-id="${item.ConsentID}" type="button">View</button></td>
      </tr>
    `).join('');
  setTable('signedConsentTable', signedRows, 8, 'No signed permission slips match the current filters.');
}

function pendingRolloverStudentIds() {
  const pendingIds = new Set();
  state.reEnrolmentPending.forEach((student) => pendingIds.add(Number(student.StudentID)));
  state.reEnrolments
    .filter((item) => item.Action === 'Pending')
    .forEach((item) => pendingIds.add(Number(item.StudentID)));
  pendingIds.delete(0);
  pendingIds.delete(NaN);
  return pendingIds;
}

function renderYearEndRolloverReadiness() {
  const notice = document.getElementById('yearEndRolloverNotice');
  const metrics = document.getElementById('yearEndRolloverMetrics');
  if (!notice || !metrics) {
    return;
  }

  const financialYear = selectedYearEndFinancialYear();
  const rolloverYear = financialYear + 1;
  const loadedYear = Number(state.featureRolloverYear || rolloverYear);
  const nextYearClasses = classesForAcademicYear(rolloverYear);
  const pendingIds = pendingRolloverStudentIds();
  const processedFinal = state.reEnrolments.filter((item) => item.Action && item.Action !== 'Pending').length;
  const loadedForSelectedYear = loadedYear === rolloverYear;
  const ready = loadedForSelectedYear && pendingIds.size === 0;

  notice.textContent = loadedForSelectedYear
    ? ready
      ? `Next-year enrolment and promotions for ${rolloverYear} are verified. ${financialYear} can be closed when finance is ready.`
      : `${pendingIds.size} learner${pendingIds.size === 1 ? '' : 's'} still need a promoted, retained, or left decision for ${rolloverYear} before ${financialYear} can be closed.`
    : `Load the ${rolloverYear} rollover check before closing ${financialYear}.`;
  notice.classList.toggle('warn', !ready);

  metrics.innerHTML = [
    metricCard('Financial year', financialYear),
    metricCard('Rollover year', rolloverYear),
    metricCard('Next-year classes', nextYearClasses.length),
    metricCard('Still pending', pendingIds.size),
    metricCard('Verified records', processedFinal),
    metricCard('Ready to close', ready ? 'Yes' : 'No')
  ].join('');
}

function renderFinanceFeatureTables() {
  setTable('adjustmentsTable', state.financialAdjustments.map((item) => `
    <tr><td>${dateOnly(item.CreatedDate)}</td><td>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim() || '-')}</td><td>${escapeHtml(item.InvoiceNumber || '-')}</td><td>${escapeHtml(item.AdjustmentType || '-')}</td><td>${money(item.Amount || 0)}</td><td>${escapeHtml(item.Reason || '-')}</td></tr>
  `).join(''), 6, 'No financial adjustments found.');

  setTable('refundsTable', state.refunds.map((item) => `
    <tr><td>${escapeHtml(item.FamilyName || '-')}</td><td>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim() || '-')}</td><td>${money(item.Amount || 0)}</td><td><span class="badge">${escapeHtml(item.Status || 'Pending')}</span></td><td>${escapeHtml(item.Reason || '-')}</td><td><div class="actions">${item.Status === 'Pending' ? `<button class="ghost-button" data-action="refund-approve" data-id="${item.RefundID}" type="button">Approve</button>` : ''}${item.Status === 'Approved' ? `<button class="ghost-button" data-action="refund-complete" data-id="${item.RefundID}" type="button">Complete</button>` : ''}</div></td></tr>
  `).join(''), 6, 'No refund records found.');

  setTable('registrationFeesTable', state.registrationFees.map((item) => `
    <tr><td>${escapeHtml(`${item.FirstName || ''} ${item.LastName || ''}`.trim() || '-')}</td><td>${escapeHtml(item.FamilyName || '-')}</td><td>${escapeHtml(item.FeeType || '-')}</td><td>${money(item.Amount || 0)}</td><td>${item.IsRefundable ? 'Yes' : 'No'}</td><td>${item.IsPaid ? dateOnly(item.PaidDate) : 'Unpaid'}</td><td>${item.IsPaid ? '' : `<button class="ghost-button" data-action="registration-fee-paid" data-id="${item.RegistrationFeeID}" type="button">Mark Paid</button>`}</td></tr>
  `).join(''), 7, 'No registration or deposit fees found.');

  renderYearEndRolloverReadiness();

  setTable('yearEndClosingTable', state.yearEndClosings.map((item) => `
    <tr><td>${escapeHtml(String(item.FinancialYear || '-'))}</td><td><span class="badge">${escapeHtml(item.Status || 'Open')}</span><span class="table-subtext">Rollover year: ${escapeHtml(String(Number(item.FinancialYear || 0) + 1 || '-'))}</span></td><td>${dateOnly(item.ClosedDate)}</td><td>${dateOnly(item.ReopenedDate)}</td><td><div class="actions"><button class="ghost-button" data-action="year-end-status" data-id="${item.ClosingID}" data-financial-year="${item.FinancialYear}" data-status="In Review" type="button">Review</button><button class="ghost-button" data-action="year-end-status" data-id="${item.ClosingID}" data-financial-year="${item.FinancialYear}" data-status="Ready to Close" type="button">Ready</button><button class="danger-button" data-action="year-end-status" data-id="${item.ClosingID}" data-financial-year="${item.FinancialYear}" data-status="Closed" type="button">Close</button></div></td></tr>
  `).join(''), 5, 'No year-end closing records found.');

  setTable('financePeriodLocksTable', state.financePeriodLocks.map((item) => `
    <tr>
      <td>
        <strong>${dateOnly(item.PeriodStart)} to ${dateOnly(item.PeriodEnd)}</strong>
        <span class="table-subtext">${escapeHtml(item.LockedByEmail || '')} ${dateOnly(item.LockedDate)}</span>
      </td>
      <td>${escapeHtml(item.LockType || '-')}</td>
      <td><span class="badge ${item.Status === 'Locked' ? 'warn' : ''}">${escapeHtml(item.Status || '-')}</span></td>
      <td>
        ${escapeHtml(item.Status === 'Locked' ? item.Reason || '-' : item.ReopenReason || item.Reason || '-')}
      </td>
      <td>
        ${item.Status === 'Locked'
          ? `<button class="ghost-button" data-action="reopen-finance-period" data-id="${item.FinancePeriodLockID}" type="button">Reopen for correction</button>`
          : '<span class="table-subtext">Reopened</span>'}
      </td>
    </tr>
  `).join(''), 5, 'No locked finance periods found.');
}

function renderReportingFeatureTables() {
  renderStudentReports();
  renderSchoolReportSummary();
  renderStatementPreview();
  renderAdmissionsReport();
  renderReenrolmentReport();
  renderConsentReport();
  renderCommunicationHistory();
  renderYearEndReport();
}

function statementPreviewRows() {
  const year = Number(document.getElementById('statementYearInput')?.value || new Date().getFullYear());
  const option = document.getElementById('statementSendOption')?.value || 'Send only to outstanding';
  const invoices = state.invoices.filter((invoice) => {
    const issueDate = invoice.IssueDate || invoice.DueDate;
    const invoiceYear = issueDate ? new Date(issueDate).getFullYear() : year;
    return invoiceYear === year;
  });

  return state.families.map((family) => {
    const familyStudents = state.students.filter((student) => Number(student.FamilyID) === Number(family.FamilyID));
    const studentIds = new Set(familyStudents.map((student) => Number(student.StudentID)));
    const familyInvoices = invoices.filter((invoice) => studentIds.has(Number(invoice.StudentID)));
    const totalInvoiced = familyInvoices.reduce((sum, invoice) => sum + Number(invoice.Amount || 0), 0);
    const totalPaid = familyInvoices.reduce((sum, invoice) => sum + Number(invoice.AmountPaid || 0), 0);
    const advanceCredit = familyInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.AmountPaid || 0) - Number(invoice.Amount || 0)), 0);
    const outstanding = familyInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)), 0);

    return {
      family,
      students: familyStudents,
      invoices: familyInvoices,
      year,
      option,
      totalInvoiced,
      totalPaid,
      advanceCredit,
      outstanding,
      balanceBroughtForward: 0
    };
  }).filter((row) => {
    if (option === 'Send only to outstanding') {
      return row.outstanding > 0;
    }
    return row.students.length > 0;
  });
}

function reportData() {
  return state.reportData || {};
}

function reportSchool() {
  return reportData().school || getSettingsSchool() || {};
}

function reportPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function reportRowsMessage() {
  return state.reportStatusMessage || 'No report data found for the selected filters.';
}

function reportStudentName(row) {
  return `${row.FirstName || ''} ${row.LastName || ''}`.trim() || `Learner ${row.StudentID || ''}`.trim();
}

function renderReportFilterOptions() {
  const classes = reportData().classOptions || [];
  REPORT_FILTER_PREFIXES.forEach((prefix) => {
    const select = document.getElementById(`${prefix}ClassFilter`);
    if (!select) return;
    const selected = select.value;
    const options = '<option value="">All classes</option>' + classes.map((className) => (
      `<option value="${escapeHtml(className)}" ${className === selected ? 'selected' : ''}>${escapeHtml(className)}</option>`
    )).join('');
    if (select.dataset.lastOptions !== options) {
      select.innerHTML = options;
      select.dataset.lastOptions = options;
      if (classes.includes(selected)) {
        select.value = selected;
      }
    }
  });
}

function chartBars(title, rows, options = {}) {
  const list = Array.isArray(rows) ? rows : Object.entries(rows || {}).map(([label, value]) => ({ label, value }));
  const max = Math.max(1, ...list.map((item) => Number(item[options.valueKey || 'value'] || 0)));
  const format = options.format || ((value) => escapeHtml(String(value)));
  return `
    <section class="report-chart-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="report-bars">
        ${list.map((item) => {
          const label = item[options.labelKey || 'label'];
          const value = Number(item[options.valueKey || 'value'] || 0);
          const width = Math.max(2, Math.min(100, (value / max) * 100));
          return `
            <div class="report-bar-row">
              <span>${escapeHtml(label || '-')}</span>
              <div class="report-bar-track"><div class="report-bar-fill" style="width:${width}%"></div></div>
              <strong>${format(value)}</strong>
            </div>
          `;
        }).join('') || '<p class="table-subtext">No chart data for this filter.</p>'}
      </div>
    </section>
  `;
}

function metricCardsFrom(items) {
  return items.map(([label, value]) => metricCard(label, value)).join('');
}

function renderSchoolReportSummary() {
  renderReportFilterOptions();
  const report = reportData();
  const finance = report.finance || { stats: {}, monthly: [], byClass: [], overdueRows: [] };
  const students = report.students || { stats: {}, byClass: {} };
  const attendance = report.attendance || { stats: {}, monthly: [], byClass: [] };
  const admissions = report.admissions || { stats: {}, byStatus: {} };
  const consent = report.consent || { stats: {}, byResponse: {} };
  const type = document.getElementById('schoolReportTypeFilter')?.value || 'overview';
  const summary = document.getElementById('schoolReportSummary');
  const charts = document.getElementById('schoolReportCharts');

  if (summary) {
    summary.innerHTML = metricCardsFrom([
      ['Learners', students.stats?.total || 0],
      ['Attendance rate', reportPercent(attendance.stats?.attendanceRate)],
      ['Collection rate', reportPercent(finance.stats?.collectionRate)],
      ['Outstanding', money(finance.stats?.outstanding || 0, reportSchool())],
      ['Admissions', admissions.stats?.total || 0],
      ['Consent pending', consent.stats?.pending || 0]
    ]);
  }

  if (charts) {
    const chartSet = type === 'finance'
      ? [
        chartBars('Monthly Invoiced', finance.monthly || [], { valueKey: 'invoiced', format: (value) => money(value, reportSchool()) }),
        chartBars('Class Outstanding', finance.byClass || [], { valueKey: 'outstanding', format: (value) => money(value, reportSchool()) })
      ]
      : type === 'attendance'
        ? [
          chartBars('Monthly Attendance Rate', attendance.monthly || [], { valueKey: 'attendanceRate', format: reportPercent }),
          chartBars('Attendance by Status', attendance.byStatus || {})
        ]
        : type === 'learners'
          ? [
            chartBars('Learners by Class', students.byClass || {}),
            chartBars('Learners by Age Band', students.byAgeBand || {})
          ]
          : [
            chartBars('Learners by Class', students.byClass || {}),
            chartBars('Monthly Collection Rate', finance.monthly || [], { valueKey: 'collectionRate', format: reportPercent }),
            chartBars('Attendance by Status', attendance.byStatus || {}),
            chartBars('Consent Responses', consent.byResponse || {})
          ];
    charts.innerHTML = chartSet.join('');
  }

  const classRows = (finance.byClass || []).map((financeClass) => {
    const attendanceClass = (attendance.byClass || []).find((item) => item.label === financeClass.label) || {};
    const learnerCount = Number((students.byClass || {})[financeClass.label] || 0);
    return `
      <tr>
        <td>${escapeHtml(financeClass.label || '-')}</td>
        <td>${learnerCount}</td>
        <td>${reportPercent(attendanceClass.attendanceRate || 0)}</td>
        <td>${money(financeClass.invoiced || 0, reportSchool())}</td>
        <td>${money(financeClass.paid || 0, reportSchool())}</td>
        <td>${money(financeClass.outstanding || 0, reportSchool())}</td>
        <td>${reportPercent(financeClass.collectionRate || 0)}</td>
      </tr>
    `;
  }).join('');
  setTable('schoolReportClassTable', classRows, 7, reportRowsMessage());

  const outstandingRows = (finance.overdueRows || []).slice(0, 80).map((invoice) => {
    const outstanding = Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0));
    return `<tr><td>${escapeHtml(reportStudentName(invoice))}</td><td>${escapeHtml(invoice.ClassName || '-')}</td><td>${escapeHtml(invoice.InvoiceNumber || '-')}</td><td><span class="badge warn">${escapeHtml(invoice.Status || '-')}</span></td><td>${money(outstanding, reportSchool())}</td><td>${dateOnly(invoice.DueDate)}</td></tr>`;
  }).join('');
  setTable('schoolReportOutstandingTable', outstandingRows, 6, 'No outstanding fees found for the selected filters.');
}

function renderStatementPreview() {
  const summaryPanel = document.querySelector('#sendInvoicesView .summary-panel');
  const resultPanel = document.querySelector('#sendInvoicesView .page-table-panel');
  if (!summaryPanel || !resultPanel) return;

  const rows = statementPreviewRows();
  const totals = rows.reduce((acc, row) => {
    acc.invoiced += row.totalInvoiced;
    acc.paid += row.totalPaid;
    acc.outstanding += row.outstanding;
    acc.advance += row.advanceCredit;
    return acc;
  }, { invoiced: 0, paid: 0, outstanding: 0, advance: 0 });

  summaryPanel.innerHTML = `
    <div class="panel-header"><div><h3>Statement Summary</h3><p>Preview statements before sending.</p></div></div>
    <div class="metrics-grid">
      ${metricCard('Families', rows.length)}
      ${metricCard('Invoiced', money(totals.invoiced))}
      ${metricCard('Paid', money(totals.paid))}
      ${metricCard('Outstanding', money(totals.outstanding))}
      ${metricCard('Advance credit', money(totals.advance))}
    </div>
  `;

  resultPanel.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Family</th><th>Students</th><th>Invoices</th><th>Paid</th><th>Outstanding</th><th>Advance Credit</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr>
            <td>${escapeHtml(familyLabel(row.family))}</td>
            <td>${escapeHtml(row.students.map(studentLabel).join(', ') || '-')}</td>
            <td>${money(row.totalInvoiced)}</td>
            <td>${money(row.totalPaid)}</td>
            <td>${money(row.outstanding)}</td>
            <td>${money(row.advanceCredit)}</td>
          </tr>
        `).join('') || '<tr><td colspan="6">No statements match the selected send option.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function renderStudentReports() {
  renderReportFilterOptions();
  const studentReport = reportData().students || { rows: [], birthdays: [], stats: {}, byClass: {}, byGender: {}, byAgeBand: {}, enrolmentByMonth: [] };
  const summary = document.getElementById('studentReportSummary');
  if (summary) {
    summary.innerHTML = metricCardsFrom([
      ['Learners', studentReport.stats?.total || 0],
      ['Active', studentReport.stats?.active || 0],
      ['New enrolments', studentReport.stats?.newEnrolments || 0],
      ['Left', studentReport.stats?.left || 0],
      ['Classes', Object.keys(studentReport.byClass || {}).length]
    ]);
  }

  const charts = document.getElementById('studentReportCharts');
  if (charts) {
    charts.innerHTML = [
      chartBars('Learners by Class', studentReport.byClass || {}),
      chartBars('Gender', studentReport.byGender || {}),
      chartBars('Age Bands', studentReport.byAgeBand || {}),
      chartBars('New Enrolments by Month', studentReport.enrolmentByMonth || [], { valueKey: 'count' })
    ].join('');
  }

  setTable('studentBirthdaysTable', (studentReport.birthdays || []).map((student) => (
    `<tr><td>${escapeHtml(reportStudentName(student))}</td><td>${escapeHtml(student.ClassName || '-')}</td><td>${dateOnly(student.DateOfBirth)}</td><td>${escapeHtml(String(student.AgeThisYear ?? '-'))}</td></tr>`
  )).join(''), 4, 'No birthdays found for the selected filters.');

  setTable('studentReportsTable', (studentReport.rows || []).map((student) => {
    const active = student.IsActive !== false && student.IsActive !== 0;
    return `<tr><td>${escapeHtml(reportStudentName(student))}</td><td>${escapeHtml(student.ClassName || '-')}</td><td>${dateOnly(student.EnrolledDate)}</td><td><span class="badge ${active ? '' : 'warn'}">${active ? 'Active' : 'Inactive'}</span></td></tr>`;
  }).join(''), 4, 'No students match the selected report filters.');
}

function renderAdmissionsReport() {
  renderReportFilterOptions();
  const admissions = reportData().admissions || { rows: [], stats: {}, byStatus: {}, monthly: [] };
  const summary = document.getElementById('admissionsReportSummary');
  if (summary) {
    summary.innerHTML = metricCardsFrom([
      ['Applications', admissions.stats?.total || 0],
      ['Accepted', admissions.stats?.accepted || 0],
      ['Enrolled', admissions.stats?.enrolled || 0],
      ['Waitlisted', admissions.stats?.waitlisted || 0],
      ['Refused', admissions.stats?.refused || 0]
    ]);
  }
  const charts = document.getElementById('admissionsReportCharts');
  if (charts) {
    charts.innerHTML = [
      chartBars('Admissions by Status', admissions.byStatus || {}),
      chartBars('Applications by Month', admissions.monthly || [], { valueKey: 'count' })
    ].join('');
  }
  setTable('admissionsReportTable', (admissions.rows || []).map((item) => `<tr><td>${escapeHtml(reportStudentName(item))}</td><td><span class="badge">${escapeHtml(item.Status || 'New')}</span></td><td>${escapeHtml(item.ClassName || '-')}</td><td>${dateOnly(item.AppliedDate)}</td><td>${dateOnly(item.EnrolledDate)}</td></tr>`).join(''), 5, 'No admissions records found.');
}

function renderReenrolmentReport() {
  renderReportFilterOptions();
  const reEnrolment = reportData().reEnrolment || { rows: [], stats: {}, byAction: {} };
  const summary = document.getElementById('reenrolmentReportSummary');
  if (summary) {
    summary.innerHTML = metricCardsFrom([
      ['Records', reEnrolment.stats?.total || 0],
      ['Promoted', reEnrolment.stats?.promoted || 0],
      ['Retained', reEnrolment.stats?.retained || 0],
      ['Left', reEnrolment.stats?.left || 0],
      ['Pending', reEnrolment.stats?.pending || 0]
    ]);
  }
  const charts = document.getElementById('reenrolmentReportCharts');
  if (charts) {
    charts.innerHTML = chartBars('Rollover Actions', reEnrolment.byAction || {});
  }
  setTable('reenrolmentReportTable', (reEnrolment.rows || []).map((item) => `<tr><td>${escapeHtml(reportStudentName(item))}</td><td>${escapeHtml(item.PreviousClassName || '-')}</td><td>${escapeHtml(item.NewClassName || '-')}</td><td><span class="badge ${item.Action === 'Pending' ? 'warn' : ''}">${escapeHtml(item.Action || 'Pending')}</span></td><td>${money(item.BalanceCarriedForward || 0, reportSchool())}</td><td>${money(item.AdvanceCreditCarriedForward || 0, reportSchool())}</td></tr>`).join(''), 6, 'No re-enrolment records found.');
}

function renderConsentReport() {
  renderReportFilterOptions();
  const consent = reportData().consent || { rows: [], stats: {}, byResponse: {}, byClass: {} };
  const summary = document.getElementById('consentReportSummary');
  if (summary) {
    summary.innerHTML = metricCardsFrom([
      ['Permission records', consent.stats?.total || 0],
      ['Pending', consent.stats?.pending || 0],
      ['Signed', Number(consent.stats?.accepted || 0) + Number(consent.stats?.declined || 0)],
      ['Accepted', consent.stats?.accepted || 0],
      ['Declined', consent.stats?.declined || 0]
    ]);
  }
  const charts = document.getElementById('consentReportCharts');
  if (charts) {
    charts.innerHTML = [
      chartBars('Response Status', consent.byResponse || {}),
      chartBars('Records by Class', consent.byClass || {})
    ].join('');
  }
  setTable('consentReportTable', (consent.rows || []).map((item) => `<tr><td>${escapeHtml(reportStudentName(item))}</td><td>${escapeHtml(item.ClassName || '-')}</td><td>${escapeHtml(item.RequestTitle || item.ConsentType || '-')}</td><td><span class="badge ${item.Response === 'Declined' ? 'danger' : (item.Response === 'Pending' || !item.Response) ? 'warn' : ''}">${escapeHtml(item.Response || 'Pending')}</span></td><td>${escapeHtml(item.SignatureName || '-')}</td><td>${dateOnly(item.ResponseDate || item.DueDate || item.CreatedDate)}</td></tr>`).join(''), 6, 'No consent records found.');
}

function renderCommunicationHistory() {
  const typeFilter = String(document.getElementById('communicationTypeFilter')?.value || '').toLowerCase();
  const statusFilter = String(document.getElementById('communicationStatusFilter')?.value || '').toLowerCase();
  const rows = state.communicationHistory.filter((item) => {
    const typeOk = !typeFilter || String(item.CommunicationType || '').toLowerCase().includes(typeFilter);
    const statusOk = !statusFilter || String(item.Status || item.DeliveryStatus || '').toLowerCase().includes(statusFilter);
    return typeOk && statusOk;
  }).map((item) => `<tr><td>${dateOnly(item.SentDate)}</td><td>${escapeHtml(item.CommunicationType || '-')}</td><td>${escapeHtml(item.Subject || '-')}</td><td>${escapeHtml(item.Status || '-')}</td><td>${escapeHtml(item.DeliveryStatus || '-')}</td></tr>`).join('');
  setTable('communicationHistoryTable', rows, 5, 'No communication history found.');
}

function renderYearEndReport() {
  renderReportFilterOptions();
  const report = reportData();
  const yearEnd = report.yearEnd || { rows: [], balancesForward: [], stats: {} };
  const reEnrolment = report.reEnrolment || { rows: [], stats: {}, byAction: {} };
  const finance = report.finance || { stats: {}, monthly: [] };
  const summary = document.getElementById('yearEndReportSummary');
  if (summary) {
    summary.innerHTML = metricCardsFrom([
      ['Total invoiced', money(finance.stats?.totalInvoiced || yearEnd.stats?.totalInvoiced || 0, reportSchool())],
      ['Total paid', money(finance.stats?.totalPaid || yearEnd.stats?.totalPaid || 0, reportSchool())],
      ['Outstanding', money(finance.stats?.outstanding || yearEnd.stats?.totalOutstanding || 0, reportSchool())],
      ['Advance credit', money(finance.stats?.advance || yearEnd.stats?.totalAdvanceCredit || 0, reportSchool())],
      ['Rollover records', reEnrolment.stats?.total || 0]
    ]);
  }
  const charts = document.getElementById('yearEndReportCharts');
  if (charts) {
    charts.innerHTML = [
      chartBars('Rollover Actions', reEnrolment.byAction || {}),
      chartBars('Monthly Outstanding', finance.monthly || [], { valueKey: 'outstanding', format: (value) => money(value, reportSchool()) })
    ].join('');
  }
  setTable('yearEndReportTable', (reEnrolment.rows || []).map((item) => `<tr><td>${escapeHtml(reportStudentName(item))}</td><td><span class="badge">${escapeHtml(item.Action || '-')}</span></td><td>${money(item.BalanceCarriedForward || 0, reportSchool())}</td><td>${money(item.AdvanceCreditCarriedForward || 0, reportSchool())}</td></tr>`).join(''), 4, 'No year-end rollover records found.');
  setTable('yearEndBalanceForwardTable', (yearEnd.balancesForward || []).map((item) => `<tr><td>${escapeHtml(reportStudentName(item))}</td><td>${escapeHtml(item.ClassName || '-')}</td><td>${escapeHtml(String(item.FromYear || '-'))}</td><td>${escapeHtml(String(item.ToYear || '-'))}</td><td>${money(item.OutstandingAmount || 0, reportSchool())}</td><td>${money(item.AdvanceCreditAmount || 0, reportSchool())}</td></tr>`).join(''), 6, 'No balance-forward records found.');
}

function setTable(id, rows, colspan, emptyText) {
  const body = document.getElementById(id);
  if (body) {
    body.innerHTML = rows || `<tr><td colspan="${colspan}">${escapeHtml(emptyText)}</td></tr>`;
  }
}

function renderMetrics() {
  const primaryMetricLabel = document.getElementById('primaryMetricLabel');
  const schoolCount = document.getElementById('schoolCount');
  const invoiceCount = document.getElementById('invoiceCount');
  const pendingValue = document.getElementById('pendingValue');
  const paidValue = document.getElementById('paidValue');

  if (!primaryMetricLabel || !schoolCount || !invoiceCount || !pendingValue || !paidValue) {
    return;
  }

  const displaySchool = getSettingsSchool();
  const activeStudents = state.students.filter((student) => student.IsActive !== false).length;
  const pending = state.invoices
    .filter((invoice) => ['Pending', 'Partial', 'Overdue'].includes(invoice.Status))
    .reduce((total, invoice) => total + Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)), 0);

  const paid = state.invoices
    .reduce((total, invoice) => total + Number(invoice.AmountPaid || 0), 0);

  primaryMetricLabel.textContent = 'Students';
  schoolCount.textContent = activeStudents;
  invoiceCount.textContent = state.invoices.length;
  pendingValue.textContent = money(pending, displaySchool);
  paidValue.textContent = money(paid, displaySchool);
}

function renderSchoolOptions() {
  if (!elements.invoiceSchool) return;
  elements.invoiceSchool.innerHTML = state.schools.length
    ? state.schools
        .map((school) => `<option value="${school.SchoolID}">${escapeHtml(school.SchoolName)}</option>`)
        .join('')
    : '<option value="">No schools available</option>';
  elements.invoiceSchool.disabled = !state.schools.length;
}

function currentSchoolBillingCategories() {
  const schoolId = Number(currentSchoolId());

  if (!schoolId) {
    return [];
  }

  return state.billingCategories.filter((category) => Number(category.SchoolID) === schoolId);
}

function renderBillingCategorySchoolControls() {
  const school = getSettingsSchool();
  const isAdmin = state.user?.role === 'admin';

  elements.billingCategorySchoolField?.classList.toggle('hidden', !isAdmin);

  if (elements.billingCategorySchoolSelect) {
    elements.billingCategorySchoolSelect.innerHTML = state.schools.length
      ? state.schools.map((item) => `
          <option value="${item.SchoolID}">${escapeHtml(item.SchoolName)}</option>
        `).join('')
      : '<option value="">No schools available</option>';
    elements.billingCategorySchoolSelect.disabled = !state.schools.length || Boolean(state.editingBillingCategoryId);

    if (school) {
      elements.billingCategorySchoolSelect.value = String(school.SchoolID);
    }
  }

  if (elements.billingCategorySchoolHint) {
    elements.billingCategorySchoolHint.textContent = school
      ? `Billing categories created here belong to ${school.SchoolName} only.`
      : 'Select or create a school before adding billing categories.';
  }
}

function renderBillingCategoryOptions() {
  const categories = activeBillingCategories();
  const options = categories.length
    ? categories.map((category) => `
        <option value="${category.BillingCategoryID}">${escapeHtml(category.CategoryName)} - ${money(category.BaseAmount, getSettingsSchool())}</option>
      `).join('')
    : '<option value="">Add a billing category first</option>';

  if (elements.studentBillingCategorySelect) {
    elements.studentBillingCategorySelect.innerHTML = options;
    elements.studentBillingCategorySelect.disabled = !categories.length;
  }

  if (elements.invoiceStudentSelect) {
    const billableStudents = state.students.filter((student) => student.IsActive !== false && student.BillingCategoryID);
    elements.invoiceStudentSelect.innerHTML = billableStudents.length
      ? billableStudents.map((student) => `
          <option value="${student.StudentID}">${escapeHtml(`${student.FirstName} ${student.LastName}`)} - ${escapeHtml(student.CategoryName || 'No category')}</option>
        `).join('')
      : '<option value="">Assign billing categories to students first</option>';
    elements.invoiceStudentSelect.disabled = !billableStudents.length;
  }
}

function renderClassOptions() {
  if (elements.classTeacherSelect) {
    const teacherOptions = state.employees
      .filter((employee) => employee.IsActive !== false)
      .map((employee) => `
        <option value="${employee.EmployeeID}">${escapeHtml(`${employee.FirstName || ''} ${employee.LastName || ''}`.trim())}</option>
      `).join('');
    elements.classTeacherSelect.innerHTML = `<option value="">No teacher assigned</option>${teacherOptions}`;
  }

  if (elements.attendanceStudentSelect) {
    const studentOptions = state.students
      .filter((student) => student.IsActive !== false)
      .map((student) => `
        <option value="${student.StudentID}">${escapeHtml(`${student.FirstName || ''} ${student.LastName || ''}`.trim())}</option>
      `).join('');
    elements.attendanceStudentSelect.innerHTML = studentOptions || '<option value="">No current students</option>';
    elements.attendanceStudentSelect.disabled = !studentOptions;
  }
}

function renderInvoiceFilters() {
  if (!elements.invoiceFilterStudent || !elements.invoiceFilterClass) {
    return;
  }

  const studentOptions = state.students.map((student) => `
    <option value="${student.StudentID}">${escapeHtml(`${student.FirstName} ${student.LastName}`)}</option>
  `).join('');
  elements.invoiceFilterStudent.innerHTML = `<option value="">All students</option>${studentOptions}`;

  const classNames = [...new Set(state.students.map((student) => student.ClassName).filter(Boolean))].sort();
  elements.invoiceFilterClass.innerHTML = '<option value="">All classes</option>' + classNames.map((className) => `
    <option value="${escapeHtml(className)}">${escapeHtml(className)}</option>
  `).join('');
}

function filteredInvoices() {
  const studentId = Number(elements.invoiceFilterStudent?.value || 0);
  const className = elements.invoiceFilterClass?.value || '';
  const month = Number(elements.invoiceFilterMonth?.value || 0);
  const year = Number(elements.invoiceFilterYear?.value || 0);
  const status = elements.invoiceFilterStatus?.value || '';

  return state.invoices.filter((invoice) => {
    const issueDate = invoice.IssueDate ? new Date(invoice.IssueDate) : null;

    return (!studentId || Number(invoice.StudentID) === studentId)
      && (!className || invoice.ClassName === className)
      && (!month || (issueDate && issueDate.getMonth() + 1 === month))
      && (!year || (issueDate && issueDate.getFullYear() === year))
      && (!status || invoice.Status === status);
  });
}

function renderInvoicesTable() {
  if (!elements.invoicesTable) return;
  elements.invoicesTable.innerHTML = filteredInvoices().map((invoice) => {
    const school = state.schools.find((item) => item.SchoolID === invoice.SchoolID);
    const statusClass = invoice.Status === 'Paid' ? 'badge' : invoice.Status === 'Overdue' ? 'badge danger' : 'badge warn';
    const amountPaid = Number(invoice.AmountPaid || 0);
    const remaining = Math.max(0, Number(invoice.Amount || 0) - amountPaid);
    const studentName = [invoice.FirstName, invoice.LastName].filter(Boolean).join(' ') || '-';
    const actions = invoice.StudentID
      ? `
            <button class="ghost-button" data-action="view-student-finance" data-id="${invoice.StudentID}" type="button">View invoices</button>
            <button class="ghost-button" data-action="issue-student-receipt" data-id="${invoice.StudentID}" type="button">Issue receipt</button>
        `
      : `
            <span class="table-subtext">No learner linked</span>
        `;

    return `
      <tr>
        <td>${escapeHtml(invoice.InvoiceNumber)}</td>
        <td>${escapeHtml(studentName)}</td>
        <td>${escapeHtml(invoice.ClassName || '-')}</td>
        <td>${escapeHtml(invoice.CategoryName || '-')}</td>
        <td>${money(invoice.Amount, school)}</td>
        <td>${money(amountPaid, school)}</td>
        <td>${dateOnly(invoice.PaidDate) || '-'}</td>
        <td><span class="${statusClass}">${escapeHtml(invoice.Status)}</span></td>
        <td>${dateOnly(invoice.DueDate)}</td>
        <td>
          <div class="actions">
            ${actions}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="10">No invoices found.</td></tr>';
}

function renderRecentLists() {
  const recentInvoicesEl = document.getElementById('recentInvoices');
  if (!recentInvoicesEl) return;
  recentInvoicesEl.innerHTML = state.invoices.slice(0, 5).map((invoice) => {
    const school = state.schools.find((item) => item.SchoolID === invoice.SchoolID);

    return `
    <div class="compact-item">
      <div>
        <strong>${escapeHtml(invoice.InvoiceNumber)}</strong>
        <span>${dateOnly(invoice.DueDate)}</span>
      </div>
      <span>${money(invoice.Amount, school)}</span>
    </div>
  `;
  }).join('') || '<p>No invoices yet.</p>';
}

function renderBillingCategories() {
  if (!elements.billingCategoriesTable) {
    return;
  }

  const categories = currentSchoolBillingCategories();

  elements.billingCategoriesTable.innerHTML = categories.map((category) => {
    const isActive = category.IsActive !== false && category.IsActive !== 0;

    return `
      <tr>
        <td>
          <strong>${escapeHtml(category.CategoryName)}</strong>
          <span class="table-subtext">${escapeHtml(category.Description || '')}</span>
        </td>
        <td>${money(category.BaseAmount, getSettingsSchool())}</td>
        <td>${escapeHtml(category.Frequency || 'Monthly')}</td>
        <td><span class="${isActive ? 'badge' : 'badge danger'}">${isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="edit-billing-category" data-id="${category.BillingCategoryID}" type="button">Edit</button>
            <button class="danger-button" data-action="deactivate-billing-category" data-id="${category.BillingCategoryID}" type="button">Deactivate</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5">No billing categories found.</td></tr>';
}

function editBillingCategory(categoryId) {
  const category = currentSchoolBillingCategories().find((item) => item.BillingCategoryID === Number(categoryId));

  if (!category) {
    showToast('Billing category not found');
    return;
  }

  state.editingBillingCategoryId = category.BillingCategoryID;
  elements.billingCategoryForm.elements.billingCategoryId.value = category.BillingCategoryID;
  elements.billingCategoryForm.elements.categoryName.value = category.CategoryName || '';
  elements.billingCategoryForm.elements.baseAmount.value = Number(category.BaseAmount || 0).toFixed(2);
  elements.billingCategoryForm.elements.frequency.value = category.Frequency || '';
  elements.billingCategoryForm.elements.description.value = category.Description || '';
  elements.cancelBillingCategoryEditButton.classList.remove('hidden');
  renderBillingCategorySchoolControls();
  elements.billingCategoryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetBillingCategoryForm() {
  state.editingBillingCategoryId = null;
  elements.billingCategoryForm.reset();
  elements.billingCategoryForm.elements.billingCategoryId.value = '';
  elements.cancelBillingCategoryEditButton.classList.add('hidden');
  renderBillingCategorySchoolControls();
}

function currentSchoolId() {
  if (state.user?.role !== 'admin') {
    return state.user?.schoolId;
  }

  return getSettingsSchool()?.SchoolID || state.schools[0]?.SchoolID;
}

function currentSchoolFamilies() {
  const schoolId = Number(currentSchoolId());

  if (!schoolId) {
    return [];
  }

  return state.families.filter((family) => family.SchoolID === schoolId);
}

function renderFamilyOptions() {
  if (!elements.studentFamilySelect) {
    return;
  }

  const families = currentSchoolFamilies();

  elements.studentFamilySelect.innerHTML = families.length
    ? families.map((family) => `
        <option value="${family.FamilyID}">${escapeHtml(family.FamilyName)}</option>
      `).join('')
    : '<option value="">Add a family first</option>';
  elements.studentFamilySelect.disabled = !families.length;
}

function billingCategoryIdsForStudent(student) {
  if (student?.BillingCategoriesJson) {
    try {
      const ids = JSON.parse(student.BillingCategoriesJson)
        .map((category) => Number(category.BillingCategoryID))
        .filter((id) => Number.isInteger(id) && id > 0);
      if (ids.length) {
        return ids;
      }
    } catch (error) {
      return student.BillingCategoryID ? [Number(student.BillingCategoryID)] : [];
    }
  }

  return student?.BillingCategoryID ? [Number(student.BillingCategoryID)] : [];
}

function billingCategoryNamesForStudent(student) {
  if (student?.BillingCategoriesJson) {
    try {
      const names = JSON.parse(student.BillingCategoriesJson)
        .map((category) => category.CategoryName)
        .filter(Boolean);
      if (names.length) {
        return names.join(', ');
      }
    } catch (error) {
      return student.CategoryName || '-';
    }
  }

  return student?.CategoryName || '-';
}

function populateBillingSelect(select, selectedIds = []) {
  if (!select) {
    return;
  }

  const selected = new Set(selectedIds.map((id) => String(id)));
  const categories = activeBillingCategories();
  select.innerHTML = categories.map((category) => `
    <option value="${category.BillingCategoryID}" ${selected.has(String(category.BillingCategoryID)) ? 'selected' : ''}>
      ${escapeHtml(category.CategoryName)} (${money(category.BaseAmount)})
    </option>
  `).join('');
  select.disabled = !categories.length;
}

function activeBillingCategories() {
  return currentSchoolBillingCategories().filter((category) => category.IsActive !== false && category.IsActive !== 0);
}

function billingCard(category, zone) {
  return `
    <button class="billing-card" draggable="true" data-billing-id="${category.BillingCategoryID}" data-billing-card="${zone}" type="button">
      <strong>${escapeHtml(category.CategoryName)}</strong>
      <span>${money(category.BaseAmount)} ${escapeHtml(category.Frequency || '')}</span>
    </button>
  `;
}

function syncRegisterLearnerBillingSelect() {
  if (!elements.registerLearnerBillingSelect) return;
  const selected = new Set(state.registerLearnerBillingIds.map((id) => String(id)));
  elements.registerLearnerBillingSelect.innerHTML = activeBillingCategories().map((category) => `
    <option value="${category.BillingCategoryID}" ${selected.has(String(category.BillingCategoryID)) ? 'selected' : ''}>
      ${escapeHtml(category.CategoryName)}
    </option>
  `).join('');
}

function renderRegisterLearnerBillingPicker() {
  if (!elements.registerLearnerBillingAvailable || !elements.registerLearnerBillingAssigned) return;
  const validIds = new Set(activeBillingCategories().map((category) => Number(category.BillingCategoryID)));
  state.registerLearnerBillingIds = state.registerLearnerBillingIds.filter((id) => validIds.has(Number(id)));
  const selected = new Set(state.registerLearnerBillingIds.map((id) => String(id)));
  const categories = activeBillingCategories();
  const available = categories.filter((category) => !selected.has(String(category.BillingCategoryID)));
  const assigned = categories.filter((category) => selected.has(String(category.BillingCategoryID)));

  elements.registerLearnerBillingAvailable.innerHTML = available.length
    ? available.map((category) => billingCard(category, 'available')).join('')
    : '<p class="drop-zone-empty">All active billing categories are assigned.</p>';
  elements.registerLearnerBillingAssigned.innerHTML = assigned.length
    ? assigned.map((category) => billingCard(category, 'assigned')).join('')
    : '<p class="drop-zone-empty">Drag billing categories here.</p>';
  syncRegisterLearnerBillingSelect();
}

function assignRegisterLearnerBilling(categoryId) {
  const parsedId = Number(categoryId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return;
  if (!state.registerLearnerBillingIds.includes(parsedId)) {
    state.registerLearnerBillingIds.push(parsedId);
  }
  renderRegisterLearnerBillingPicker();
}

function unassignRegisterLearnerBilling(categoryId) {
  const parsedId = Number(categoryId);
  state.registerLearnerBillingIds = state.registerLearnerBillingIds.filter((id) => id !== parsedId);
  renderRegisterLearnerBillingPicker();
}

function syncStudentEditBillingSelect() {
  if (!elements.studentEditBillingSelect) return;
  const selected = new Set(state.studentEditBillingIds.map((id) => String(id)));
  elements.studentEditBillingSelect.innerHTML = activeBillingCategories().map((category) => `
    <option value="${category.BillingCategoryID}" ${selected.has(String(category.BillingCategoryID)) ? 'selected' : ''}>
      ${escapeHtml(category.CategoryName)}
    </option>
  `).join('');
}

function renderStudentEditBillingPicker() {
  if (!elements.studentEditBillingAvailable || !elements.studentEditBillingAssigned) return;
  const validIds = new Set(activeBillingCategories().map((category) => Number(category.BillingCategoryID)));
  state.studentEditBillingIds = state.studentEditBillingIds.filter((id) => validIds.has(Number(id)));
  const selected = new Set(state.studentEditBillingIds.map((id) => String(id)));
  const categories = activeBillingCategories();
  const available = categories.filter((category) => !selected.has(String(category.BillingCategoryID)));
  const assigned = categories.filter((category) => selected.has(String(category.BillingCategoryID)));

  elements.studentEditBillingAvailable.innerHTML = available.length
    ? available.map((category) => billingCard(category, 'edit-available')).join('')
    : '<p class="drop-zone-empty">All active billing categories are assigned.</p>';
  elements.studentEditBillingAssigned.innerHTML = assigned.length
    ? assigned.map((category) => billingCard(category, 'edit-assigned')).join('')
    : '<p class="drop-zone-empty">Drag billing categories here.</p>';
  syncStudentEditBillingSelect();
}

function assignStudentEditBilling(categoryId) {
  const parsedId = Number(categoryId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) return;
  if (!state.studentEditBillingIds.includes(parsedId)) {
    state.studentEditBillingIds.push(parsedId);
  }
  renderStudentEditBillingPicker();
}

function unassignStudentEditBilling(categoryId) {
  const parsedId = Number(categoryId);
  state.studentEditBillingIds = state.studentEditBillingIds.filter((id) => id !== parsedId);
  renderStudentEditBillingPicker();
}

function selectedValues(select) {
  return Array.from(select?.selectedOptions || [])
    .map((option) => Number(option.value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function familyPayloadFromForm(form) {
  const data = formData(form);
  return {
    familyName: data.familyName,
    primaryParentName: data.primaryParentName,
    primaryParentIdNumber: data.primaryParentIdNumber,
    primaryParentPhone: data.primaryParentPhone,
    primaryParentEmail: data.primaryParentEmail,
    secondaryParentName: data.secondaryParentName,
    secondaryParentIdNumber: data.secondaryParentIdNumber,
    secondaryParentPhone: data.secondaryParentPhone,
    secondaryParentEmail: data.secondaryParentEmail,
    homeAddress: data.familyHomeAddress || data.homeAddress,
    emergencyContactName: data.emergencyContactName,
    emergencyContactPhone: data.emergencyContactPhone,
    familyDoctor: data.familyDoctor,
    medicalAidName: data.medicalAidName,
    medicalAidNumber: data.medicalAidNumber
  };
}

function setFormValue(form, name, value) {
  if (form?.elements?.[name]) {
    form.elements[name].value = value ?? '';
  }
}

function fillFamilyForm(form, family = {}) {
  setFormValue(form, 'familyId', family.FamilyID);
  setFormValue(form, 'familyName', family.FamilyName);
  setFormValue(form, 'primaryParentName', family.PrimaryParentName);
  setFormValue(form, 'primaryParentIdNumber', family.PrimaryParentIdNumber);
  setFormValue(form, 'primaryParentPhone', family.PrimaryParentPhone);
  setFormValue(form, 'primaryParentEmail', family.PrimaryParentEmail);
  setFormValue(form, 'secondaryParentName', family.SecondaryParentName);
  setFormValue(form, 'secondaryParentIdNumber', family.SecondaryParentIdNumber);
  setFormValue(form, 'secondaryParentPhone', family.SecondaryParentPhone);
  setFormValue(form, 'secondaryParentEmail', family.SecondaryParentEmail);
  setFormValue(form, 'parentType', family.SecondaryParentName ? 'Both' : 'Mother');
  setFormValue(form, 'familyHomeAddress', family.HomeAddress || family.FamilyHomeAddress);
  setFormValue(form, 'emergencyContactName', family.EmergencyContactName);
  setFormValue(form, 'emergencyContactPhone', family.EmergencyContactPhone);
  setFormValue(form, 'familyDoctor', family.FamilyDoctor);
  setFormValue(form, 'medicalAidName', family.MedicalAidName);
  setFormValue(form, 'medicalAidNumber', family.MedicalAidNumber);
  if (form === elements.registerLearnerForm) {
    updateRegisterLearnerParentFields();
    syncResponsiblePayerFields(form, { preserveOther: true });
  }
}

function normalizeResponsiblePayerType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['secondary', 'secondary parent', 'father'].includes(normalized)) return 'Secondary parent';
  if (['other', 'custom', 'guardian'].includes(normalized)) return 'Other';
  return 'Primary parent';
}

function normalizeReceiptPayeeType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['primary', 'primary parent', 'mother'].includes(normalized)) return 'Primary parent';
  if (['secondary', 'secondary parent', 'father'].includes(normalized)) return 'Secondary parent';
  if (['other', 'custom', 'guardian'].includes(normalized)) return 'Other';
  return 'Responsible payer';
}

function parentContactFromForm(form, type) {
  if (type === 'Secondary parent') {
    return {
      name: formValue(form, 'secondaryParentName'),
      phone: formValue(form, 'secondaryParentPhone'),
      email: formValue(form, 'secondaryParentEmail')
    };
  }

  return {
    name: formValue(form, 'primaryParentName'),
    phone: formValue(form, 'primaryParentPhone'),
    email: formValue(form, 'primaryParentEmail')
  };
}

function setPayerFields(form, prefix, contact = {}) {
  setFormValue(form, `${prefix}Name`, contact.name || '');
  setFormValue(form, `${prefix}Phone`, contact.phone || '');
  setFormValue(form, `${prefix}Email`, contact.email || '');
}

function syncResponsiblePayerFields(form, options = {}) {
  if (!form?.elements?.responsiblePayerType) return;
  const type = normalizeResponsiblePayerType(form.elements.responsiblePayerType.value);
  form.elements.responsiblePayerType.value = type;

  if (type === 'Other') {
    if (!options.preserveOther) {
      setPayerFields(form, 'responsiblePayer', {});
    }
    return;
  }

  setPayerFields(form, 'responsiblePayer', parentContactFromForm(form, type));
}

function setResponsiblePayerFromStudent(form, student = {}) {
  const type = normalizeResponsiblePayerType(student.ResponsiblePayerType || 'Primary parent');
  setFormValue(form, 'responsiblePayerType', type);
  setPayerFields(form, 'responsiblePayer', {
    name: student.ResponsiblePayerName || (type === 'Secondary parent' ? student.SecondaryParentName : student.PrimaryParentName),
    phone: student.ResponsiblePayerPhone || (type === 'Secondary parent' ? student.SecondaryParentPhone : student.PrimaryParentPhone),
    email: student.ResponsiblePayerEmail || (type === 'Secondary parent' ? student.SecondaryParentEmail : student.PrimaryParentEmail)
  });
}

function studentPayeeContact(student = {}, type = 'Responsible payer') {
  if (type === 'Primary parent') {
    return {
      name: student.PrimaryParentName,
      phone: student.PrimaryParentPhone,
      email: student.PrimaryParentEmail
    };
  }

  if (type === 'Secondary parent') {
    return {
      name: student.SecondaryParentName,
      phone: student.SecondaryParentPhone,
      email: student.SecondaryParentEmail
    };
  }

  if (type === 'Responsible payer') {
    return {
      name: student.ResponsiblePayerName || student.PrimaryParentName,
      phone: student.ResponsiblePayerPhone || student.PrimaryParentPhone,
      email: student.ResponsiblePayerEmail || student.PrimaryParentEmail
    };
  }

  return {};
}

function syncReceiptPayeeFields(options = {}) {
  const form = elements.studentReceiptForm;
  if (!form?.elements?.payeeType) return;
  const student = state.selectedStudentFinanceStatement?.student
    || state.students.find((item) => Number(item.StudentID) === Number(state.selectedStudentFinanceId))
    || {};
  const type = normalizeReceiptPayeeType(form.elements.payeeType.value);
  form.elements.payeeType.value = type;

  if (type === 'Other') {
    if (!options.preserveOther) {
      setPayerFields(form, 'payee', {});
    }
    return;
  }

  setPayerFields(form, 'payee', studentPayeeContact(student, type));
}

function renderFamiliesTable() {
  const families = filteredFamilies();

  elements.familiesTable.innerHTML = families.map((family) => `
    <tr>
      <td>
        <strong>${escapeHtml(family.FamilyName)}</strong>
        <span class="table-subtext">${escapeHtml(family.HomeAddress || '')}</span>
      </td>
      <td>
        <strong>${escapeHtml(family.PrimaryParentName)}</strong>
        <span class="table-subtext">${escapeHtml(family.PrimaryParentPhone || family.PrimaryParentEmail || '')}</span>
      </td>
      <td>
        <strong>${escapeHtml(family.SecondaryParentName || '-')}</strong>
        <span class="table-subtext">${escapeHtml(family.SecondaryParentPhone || family.SecondaryParentEmail || '')}</span>
      </td>
      <td>
        <strong>${escapeHtml(family.EmergencyContactName || '-')}</strong>
        <span class="table-subtext">${escapeHtml(family.EmergencyContactPhone || '')}</span>
      </td>
      <td>
        <button class="ghost-button" data-action="edit-family" data-id="${family.FamilyID}" type="button">Edit</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No families yet.</td></tr>';
}

function familyIsArchived(family) {
  return family.IsArchived === true
    || family.IsArchived === 1
    || family.IsActive === false
    || family.IsActive === 0
    || Boolean(family.ArchivedDate);
}

function familyStudentSearchText(family) {
  return state.students
    .filter((student) => Number(student.FamilyID) === Number(family.FamilyID))
    .map((student) => `${student.FirstName || ''} ${student.LastName || ''}`)
    .join(' ');
}

function filteredFamilies() {
  const query = String(state.parentSearchQuery || '').trim().toLowerCase();
  const searchType = state.parentSearchType || 'Parent Name';
  const status = state.parentStatusFilter || 'active';

  return currentSchoolFamilies()
    .filter((family) => {
      if (status === 'all') return true;
      const archived = familyIsArchived(family);
      return status === 'archived' ? archived : !archived;
    })
    .filter((family) => {
      if (!query) return true;
      const values = {
        'Parent Name': [family.PrimaryParentName, family.SecondaryParentName].join(' '),
        'Student Name': familyStudentSearchText(family),
        'Family Code': [family.FamilyCode, family.FamilyName].join(' '),
        'ID Number': [family.PrimaryParentIdNumber, family.SecondaryParentIdNumber].join(' '),
        'Passport Number': [family.PrimaryParentIdNumber, family.SecondaryParentIdNumber].join(' ')
      };
      return String(values[searchType] || '').toLowerCase().includes(query);
    });
}

function renderStudentsTable() {
  const q = (state.studentSearchQuery || '').toLowerCase();
  const searchType = state.studentSearchType || 'Student name';
  const filtered = state.students.filter((s) => {
    if (!q) return true;
    switch (searchType) {
      case 'Student name': return (s.FirstName || '').toLowerCase().includes(q);
      case 'Student surname': return (s.LastName || '').toLowerCase().includes(q);
      case 'Parent name': return [s.FamilyName, s.PrimaryParentName, s.SecondaryParentName].join(' ').toLowerCase().includes(q);
      case 'Family code': return (s.FamilyName || '').toLowerCase().includes(q);
      default: return (s.FirstName + ' ' + s.LastName + ' ' + (s.FamilyName || '')).toLowerCase().includes(q);
    }
  });
  const pageSize = state.studentPageSize || 10;
  const limited = filtered.slice(0, pageSize);
  elements.studentsTable.innerHTML = limited.map((student) => {
    const isActive = Boolean(student.IsActive);
    const statusClass = isActive ? 'badge' : 'badge danger';
    const fullName = `${student.FirstName} ${student.LastName}`;

    return `
      <tr>
        <td>
          <strong>${escapeHtml(fullName)}</strong>
          <span class="table-subtext">${escapeHtml(student.ClassName || 'No class assigned')}</span>
          <span class="table-subtext">Academic year: ${escapeHtml(String(student.CurrentAcademicYear || currentCalendarYear()))}</span>
        </td>
        <td>${escapeHtml(student.FamilyName || '-')}</td>
        <td>${dateOnly(student.EnrolledDate)}</td>
        <td>
          <span class="${statusClass}">${isActive ? 'Active' : 'Inactive'}</span>
          ${!isActive ? `<span class="table-subtext">${escapeHtml(student.DepartureReason || '')} ${dateOnly(student.DepartureDate)}</span>` : ''}
        </td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="edit-student" data-id="${student.StudentID}" type="button">Edit</button>
            ${isActive ? `<button class="ghost-button" data-action="inactivate-student" data-id="${student.StudentID}" type="button">Mark inactive</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5">No students found.</td></tr>';
}


function openClassDialog() {
  const currentYear = new Date().getFullYear();
  state.editingClassId = null;
  elements.editClassId.value = '';
  elements.classForm.reset();
  if (elements.classYearInput) {
    elements.classYearInput.value = currentYear;
  }
  elements.classSubmitButton.textContent = 'Add Class';
  document.getElementById('classDialogTitle').textContent = 'Add class';
  document.getElementById('classDialogSubtitle').textContent = 'Class setup and teacher assignment.';
  elements.classDialog?.classList.remove('hidden');
  elements.classForm.elements.className?.focus();
}

function editClass(classId) {
  const cls = state.classes.find((c) => c.ClassID === classId);
  if (!cls) return;
  state.editingClassId = classId;
  elements.editClassId.value = classId;
  elements.classForm.elements.className.value = cls.ClassName || '';
  elements.classForm.elements.capacity.value = cls.Capacity || '';
  if (elements.classYearInput) {
    elements.classYearInput.value = classYear(cls);
  }
  // Set teacher dropdown
  if (elements.classTeacherSelect) {
    elements.classTeacherSelect.value = cls.TeacherID || '';
  }
  elements.classSubmitButton.textContent = 'Save Class';
  document.getElementById('classDialogTitle').textContent = 'Edit class';
  document.getElementById('classDialogSubtitle').textContent = 'Update class setup and teacher assignment.';
  elements.classDialog?.classList.remove('hidden');
  elements.classForm.elements.className?.focus();
}

function resetClassForm() {
  state.editingClassId = null;
  elements.editClassId.value = '';
  elements.classForm.reset();
  elements.classSubmitButton.textContent = 'Add Class';
  elements.classDialog?.classList.add('hidden');
}

async function openAttendanceDialog() {
  await refreshCompletedAttendance();
  renderAttendance();
  elements.attendanceDialog?.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeAttendanceDialog() {
  elements.attendanceDialog?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function openAttendanceEditDialog() {
  elements.attendanceEditDialog?.classList.remove('hidden');
  document.body.classList.add('modal-open');
  elements.attendanceStudentSelect?.focus();
}

function closeAttendanceEditDialog() {
  elements.attendanceEditDialog?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function closeAttendanceUndoDialog() {
  state.selectedAttendanceUndoId = null;
  elements.attendanceUndoDialog?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function undoAttendanceTime(field) {
  if (!state.selectedAttendanceUndoId) {
    return;
  }

  try {
    await api(`/api/attendance/${state.selectedAttendanceUndoId}/undo`, {
      method: 'PATCH',
      body: JSON.stringify({ field })
    });
    await refreshAttendance();
    renderAttendance();
    closeAttendanceUndoDialog();
    showToast(field === 'arrival' ? 'Arrival undone' : 'Departure undone');
  } catch (error) {
    showToast(error.message);
  }
}

function attendancePayloadForStudent(student, row, overrides = {}) {
  const selectedDate = elements.attendanceDateInput?.value || new Date().toISOString().slice(0, 10);
  const studentClass = student.ClassName
    ? state.classes.find((item) => String(item.ClassName || '').trim().toLowerCase() === String(student.ClassName).trim().toLowerCase())
    : null;
  const existingRecord = attendanceRecordForStudent(student.StudentID);
  const status = row?.querySelector('[data-attendance-field="status"]')?.value || 'Present';
  const arrivalInput = row?.querySelector('[data-attendance-field="arrivalTime"]')?.value || '';
  const departureInput = row?.querySelector('[data-attendance-field="departureTime"]')?.value || '';

  const clearTimes = status === 'Absent';

  const payload = {
    studentId: student.StudentID,
    attendanceDate: selectedDate,
    status,
    arrivalTime: clearTimes ? '' : (arrivalInput || timeInputValue(existingRecord?.ArrivalTimeDisplay || existingRecord?.ArrivalTime)),
    departureTime: clearTimes ? '' : (departureInput || timeInputValue(existingRecord?.DepartureTimeDisplay || existingRecord?.DepartureTime)),
    notes: row?.querySelector('[data-attendance-field="notes"]')?.value || '',
    ...overrides
  };

  if (studentClass?.ClassID) {
    payload.classId = studentClass.ClassID;
  }

  return payload;
}

async function saveAttendanceRow(row) {
  const studentId = Number(row?.dataset.attendanceStudent);
  const student = state.students.find((item) => Number(item.StudentID) === studentId);
  if (!student) {
    showToast('Student record not found');
    return;
  }

  const saveBtn = row?.querySelector('[data-action="save-attendance-row"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

  try {
    const saved = await api('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(attendancePayloadForStudent(student, row))
    });

    // Update local state without re-fetching all records
    const idx = state.attendance.findIndex((r) => Number(r.StudentID) === studentId);
    const merged = { ...saved, FirstName: student.FirstName, LastName: student.LastName, ClassName: student.ClassName };
    if (idx >= 0) {
      state.attendance[idx] = merged;
    } else {
      state.attendance.push(merged);
    }

    // Update just this row's visual state
    if (row) {
      row.classList.add('attendance-recorded-row');
      row.dataset.attendanceRecord = String(saved.AttendanceID || '');
    }

    showToast('Attendance saved');
  } catch (error) {
    showToast(error.message);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  }
}

function classYear(item) {
  return Number(item.AcademicYear || item.ActiveYear || item.ClassYear || item.Year || new Date().getFullYear());
}

function filteredClasses() {
  const search = String(elements.classSearchInput?.value || '').trim().toLowerCase();
  const classNameSort = String(elements.classNameFilterInput?.value || '');
  const teacherSort = String(elements.classTeacherFilterInput?.value || '');
  const learnerSort = String(elements.classLearnerFilterInput?.value || '');
  const status = String(elements.classStatusFilterInput?.value || '');
  const year = elements.classYearFilterInput?.value === '' ? null : Number(elements.classYearFilterInput?.value);

  const rows = state.classes.filter((item) => [
    item.ClassName,
    item.TeacherFirstName,
    item.TeacherLastName
  ].some((value) => String(value || '').toLowerCase().includes(search)))
    .filter((item) => !status || (status === 'active' ? item.IsActive !== false : item.IsActive === false))
    .filter((item) => year === null || classYear(item) === year);

  return rows.sort((a, b) => {
    if (classNameSort) {
      return String(a.ClassName || '').localeCompare(String(b.ClassName || '')) * (classNameSort === 'za' ? -1 : 1);
    }

    if (teacherSort) {
      const teacherA = `${a.TeacherFirstName || ''} ${a.TeacherLastName || ''}`.trim();
      const teacherB = `${b.TeacherFirstName || ''} ${b.TeacherLastName || ''}`.trim();
      return teacherA.localeCompare(teacherB) * (teacherSort === 'za' ? -1 : 1);
    }

    if (learnerSort) {
      return (Number(a.StudentCount || 0) - Number(b.StudentCount || 0)) * (learnerSort === 'desc' ? -1 : 1);
    }

    return 0;
  });
}

function renderClasses() {
  if (!elements.classesTable) {
    return;
  }

  elements.classesTable.innerHTML = filteredClasses().map((item, index) => {
    const teacherName = `${item.TeacherFirstName || ''} ${item.TeacherLastName || ''}`.trim() || '-';
    const isActive = item.IsActive !== false;
    const year = classYear(item);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.ClassName || '-')}</td>
        <td>${escapeHtml(teacherName)}</td>
        <td>${escapeHtml(year)}</td>
        <td>${escapeHtml(item.StudentCount ?? 0)}${item.Capacity ? ` / ${escapeHtml(item.Capacity)}` : ''}</td>
        <td><span class="${isActive ? 'badge' : 'badge danger'}">${isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="edit-class" data-id="${item.ClassID}" type="button">Edit</button>
            ${isActive
              ? `<button class="ghost-button" data-action="deactivate-class" data-id="${item.ClassID}" type="button">Deactivate</button>`
              : `<button class="ghost-button" data-action="activate-class" data-id="${item.ClassID}" type="button">Activate</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7">No class records found.</td></tr>';
}

function attendanceClassKey(value) {
  return String(value || 'unassigned')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unassigned';
}

function attendanceStatusClass(status) {
  if (status === 'Present') return 'badge';
  if (status === 'Absent') return 'badge danger';
  return 'badge';
}

function attendanceClassGroups(records = state.completedAttendance) {
  const classes = state.classes
    .map((item) => ({
      key: attendanceClassKey(item.ClassName || item.ClassID),
      name: item.ClassName || `Class ${item.ClassID}`,
      records: []
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups = new Map(classes.map((item) => [item.key, item]));

  records.forEach((record) => {
    const className = record.ClassName || 'Unassigned';
    const key = attendanceClassKey(className);
    if (!groups.has(key)) {
      groups.set(key, { key, name: className, records: [] });
    }
    groups.get(key).records.push(record);
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (a.name === 'Unassigned') return 1;
    if (b.name === 'Unassigned') return -1;
    return a.name.localeCompare(b.name);
  });
}

function attendanceRecordForStudent(studentId) {
  return state.attendance.find((record) => Number(record.StudentID) === Number(studentId));
}

function attendanceRegisterRows() {
  return state.students
    .filter((student) => student.IsActive !== false)
    .map((student) => ({
      student,
      record: attendanceRecordForStudent(student.StudentID)
    }));
}

function filteredAttendanceRegisterRows() {
  const query = String(state.attendanceSearchQuery || '').trim().toLowerCase();
  const searchType = state.attendanceSearchType || 'Student name';
  const statusFilter = state.attendanceStatusFilter || 'all';
  const classFilter = state.attendanceClassFilter || 'all';

  return attendanceRegisterRows()
    .filter(({ student }) => {
      if (classFilter === 'all') return true;
      return String(student.ClassName || '').trim().toLowerCase() === classFilter.toLowerCase();
    })
    .filter(({ record }) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return Boolean(record);
      if (statusFilter === 'incomplete') return !record;
      return record?.Status === statusFilter;
    })
    .filter(({ student, record }) => {
      if (!query) return true;
      const values = {
        'Student name': student.FirstName || '',
        'Student surname': student.LastName || '',
        Class: student.ClassName || '',
        Status: record?.Status || 'Not Recorded'
      };
      return String(values[searchType] || '').toLowerCase().includes(query);
    })
    .slice(0, Number(state.attendancePageSize || 9999));
}

function renderAttendanceRegister() {
  if (!elements.attendanceTable) {
    return;
  }

  // Populate class filter dropdown
  if (elements.attendanceClassFilterInput) {
    const classNames = [...new Set(state.students.filter(s => s.IsActive !== false).map(s => s.ClassName).filter(Boolean))].sort();
    const currentVal = state.attendanceClassFilter || 'all';
    elements.attendanceClassFilterInput.innerHTML = '<option value="all">All classes</option>' +
      classNames.map(name => `<option value="${escapeHtml(name)}" ${currentVal === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
    elements.attendanceClassFilterInput.value = currentVal;
  }

  const selectedDate = elements.attendanceDateInput?.value || new Date().toISOString().slice(0, 10);
  const rows = filteredAttendanceRegisterRows();

  elements.attendanceTable.innerHTML = rows.map(({ student, record }) => {
    const studentName = `${student.FirstName || ''} ${student.LastName || ''}`.trim() || `Student ${student.StudentID}`;
    const status = record?.Status || 'Present';
    const rowId = record?.AttendanceID || '';
    const arrival = timeInputValue(record?.ArrivalTimeDisplay || record?.ArrivalTime);
    const departure = timeInputValue(record?.DepartureTimeDisplay || record?.DepartureTime);
    const isRecorded = Boolean(record);
    const selected = (value) => status === value ? 'selected' : '';

    return `
      <tr class="${isRecorded ? 'attendance-recorded-row' : ''}" data-attendance-student="${student.StudentID}" data-attendance-record="${escapeHtml(rowId)}">
        <td>
          <strong>${escapeHtml(studentName)}</strong>
        </td>
        <td>${escapeHtml(student.ClassName || 'No class assigned')}</td>
        <td>
          <select class="thin-input" data-attendance-field="status">
            <option value="Present" ${selected('Present')}>Present</option>
            <option value="Absent" ${selected('Absent')}>Absent</option>
          </select>
        </td>
        <td>
          <input class="thin-input ${arrival ? 'time-filled' : ''}" data-attendance-field="arrivalTime" type="time" value="${escapeHtml(arrival)}" ${status === 'Absent' ? 'disabled' : ''}>
        </td>
        <td>
          <input class="thin-input ${departure ? 'time-filled' : ''}" data-attendance-field="departureTime" type="time" value="${escapeHtml(departure)}" ${status === 'Absent' ? 'disabled' : ''}>
        </td>
        <td>
          <input class="thin-input" data-attendance-field="notes" type="text" value="${escapeHtml(record?.Notes || '')}">
          ${record?.Notes ? `<span class="attendance-field-value">${escapeHtml(record.Notes)}</span>` : ''}
        </td>
        <td>
          <button class="primary-button compact-button" data-action="save-attendance-row" type="button">Save</button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7">No students found for attendance.</td></tr>';
}

function renderAttendance() {
  renderAttendanceRegister();

  if (!elements.attendanceClassTabs || !elements.attendanceClassPanels) {
    return;
  }

  const groups = attendanceClassGroups(state.completedAttendance);

  if (!groups.length) {
    state.selectedAttendanceClassKey = null;
    elements.attendanceClassTabs.innerHTML = '';
    elements.attendanceClassPanels.innerHTML = '<p class="empty-state">No classes found for this school.</p>';
    return;
  }

  if (!state.selectedAttendanceClassKey || !groups.some((group) => group.key === state.selectedAttendanceClassKey)) {
    state.selectedAttendanceClassKey = groups[0].key;
  }

  if (elements.attendanceDialogSubtitle) {
    elements.attendanceDialogSubtitle.textContent = `Past attendance from ${dateOnly(state.attendanceHistoryFrom)} to ${dateOnly(state.attendanceHistoryTo)}, grouped by class.`;
  }

  elements.attendanceClassTabs.innerHTML = groups.map((group) => `
    <button class="form-tab ${group.key === state.selectedAttendanceClassKey ? 'active' : ''}" data-attendance-class="${escapeHtml(group.key)}" type="button">
      ${escapeHtml(group.name)}
    </button>
  `).join('');

  elements.attendanceClassPanels.innerHTML = groups.map((group) => {
    const rows = group.records.map((record) => {
      const studentName = `${record.FirstName || ''} ${record.LastName || ''}`.trim() || `Student ${record.StudentID}`;

      return `
        <tr>
          <td>${dateOnly(record.AttendanceDate)}</td>
          <td>${escapeHtml(studentName)}</td>
          <td><span class="${attendanceStatusClass(record.Status)}">${escapeHtml(record.Status || '-')}</span></td>
          <td>${escapeHtml(record.Notes || '-')}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4">No past attendance found for this class in the selected date range.</td></tr>';

    return `
      <section class="form-tab-panel ${group.key === state.selectedAttendanceClassKey ? 'active' : ''}" data-attendance-panel="${escapeHtml(group.key)}">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `;
  }).join('');
}

function filteredEmployees() {
  const searchType = String(elements.staffSearchTypeInput?.value || 'Name');
  const search = String(elements.staffSearchInput?.value || '').trim().toLowerCase();
  const status = String(elements.staffStatusFilterInput?.value || '');
  const role = String(elements.staffRoleFilterInput?.value || 'All roles');

  return state.employees
    .filter((employee) => {
      if (!search) return true;
      const employeeNumber = employee.EmployeeNumber || (employee.EmployeeID ? `S${String(employee.EmployeeID).padStart(3, '0')}` : '');
      const values = {
        Name: `${employee.FirstName || ''} ${employee.LastName || ''}`,
        'Staff number': employeeNumber,
        Email: employee.Email || ''
      };
      return String(values[searchType] || '').toLowerCase().includes(search);
    })
    .filter((employee) => {
      if (!status) return true;
      const isActive = employee.IsActive !== false;
      return status === 'Active' ? isActive : !isActive;
    })
    .filter((employee) => {
      if (!role || role === 'All roles') return true;
      const jobTitle = String(employee.JobTitle || employee.Department || '').toLowerCase();
      return jobTitle.includes(role.toLowerCase());
    });
}

function renderEmployees() {
  if (!elements.employeesTable) {
    return;
  }

  const canManageStaff = userCan('school.staff.manage');
  elements.employeesTable.innerHTML = filteredEmployees().map((employee, index) => {
    const isActive = employee.IsActive !== false;
    const employeeNumber = employee.EmployeeNumber || (employee.EmployeeID ? `S${String(employee.EmployeeID).padStart(3, '0')}` : '-');

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(`${employee.FirstName || ''} ${employee.LastName || ''}`.trim())}</td>
        <td>${escapeHtml(employeeNumber)}</td>
        <td>${escapeHtml(employee.JobTitle || employee.Department || '-')}</td>
        <td>${escapeHtml(employee.Phone || '-')}</td>
        <td>${escapeHtml(employee.Email || '-')}</td>
        <td>${canManageStaff ? `<button class="ghost-button" data-action="edit-employee" data-id="${employee.EmployeeID}" type="button">Edit</button>` : '-'}</td>
        <td><span class="${isActive ? 'badge' : 'badge danger'}">${isActive ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="8">No staff records found.</td></tr>';

  renderPayslipEmployeeOptions();
}

function renderEmployeeRoleOptions(selectedRole = '') {
  if (!elements.employeeRoleSelect) {
    return;
  }

  const roleNames = [...new Set(state.staffRoles
    .map((role) => String(role.RoleName || '').trim())
    .filter(Boolean))];

  if (selectedRole && !roleNames.includes(selectedRole)) {
    roleNames.push(selectedRole);
  }

  elements.employeeRoleSelect.innerHTML = roleNames.length
    ? '<option value="">Select role</option>' + roleNames.map((roleName) => `<option value="${escapeHtml(roleName)}">${escapeHtml(roleName)}</option>`).join('')
    : '<option value="">No roles configured</option>';
  elements.employeeRoleSelect.disabled = roleNames.length === 0;
  elements.employeeRoleSelect.value = selectedRole || '';
}

function renderEmployeeDepartmentOptions(selectedDepartment = '') {
  if (!elements.employeeDepartmentSelect) {
    return;
  }

  const departments = ['Pre-School', 'Primary'];
  if (selectedDepartment && !departments.includes(selectedDepartment)) {
    departments.push(selectedDepartment);
  }

  elements.employeeDepartmentSelect.innerHTML = '<option value="">Select department</option>'
    + departments.map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`).join('');
  elements.employeeDepartmentSelect.value = selectedDepartment || '';
}

function renderPayslipEmployeeOptions() {
  if (!elements.payslipEmployeeSelect) {
    return;
  }

  const activeEmployees = state.employees.filter((employee) => employee.IsActive !== false);
  elements.payslipEmployeeSelect.innerHTML = activeEmployees.length
    ? activeEmployees.map((employee) => `
      <option value="${employee.EmployeeID}">${escapeHtml(`${employee.FirstName || ''} ${employee.LastName || ''}`.trim())}</option>
    `).join('')
    : '<option value="">Add staff first</option>';
  elements.payslipEmployeeSelect.disabled = !activeEmployees.length;
}

function renderLeaveEmployeeOptions() {
  if (!elements.leaveEmployeeSelect) {
    return;
  }

  const activeEmployees = state.employees.filter((employee) => employee.IsActive !== false);
  elements.leaveEmployeeSelect.innerHTML = activeEmployees.length
    ? activeEmployees.map((employee) => `
      <option value="${employee.EmployeeID}">${escapeHtml(`${employee.FirstName || ''} ${employee.LastName || ''}`.trim())}</option>
    `).join('')
    : '<option value="">Add staff first</option>';
  elements.leaveEmployeeSelect.disabled = !activeEmployees.length;
}

function applySelectedEmployeePayrollDefaults() {
  if (!elements.payslipForm || !elements.payslipEmployeeSelect?.value) return;
  const employee = state.employees.find((item) => item.EmployeeID === Number(elements.payslipEmployeeSelect.value));
  if (!employee) return;
  setFormValue(elements.payslipForm, 'basicSalary', Number(employee.Salary || 0).toFixed(2));
  setFormValue(elements.payslipForm, 'allowances', Number(employee.StandardAllowances || 0).toFixed(2));
  setFormValue(elements.payslipForm, 'taxPaye', Number(employee.TaxPaye || 0).toFixed(2));
  setFormValue(elements.payslipForm, 'uifDeduction', Number(employee.UifDeduction || 0).toFixed(2));
  setFormValue(elements.payslipForm, 'otherDeductions', Number(employee.StandardDeductions || 0).toFixed(2));
}

function renderLeaves() {
  if (!elements.leavesTable) {
    return;
  }

  elements.leavesTable.innerHTML = state.leaves.map((leave) => {
    const status = leave.Status || 'Pending';
    const statusClass = status === 'Approved' ? 'badge' : status === 'Rejected' ? 'badge danger' : 'badge warn';
    const employeeName = `${leave.FirstName || ''} ${leave.LastName || ''}`.trim() || `Employee ${leave.EmployeeID}`;

    return `
      <tr>
        <td>${escapeHtml(employeeName)}</td>
        <td>${escapeHtml(leave.LeaveType || '-')}</td>
        <td>
          ${dateOnly(leave.StartDate)} to ${dateOnly(leave.EndDate)}
          <span class="table-subtext">${escapeHtml(leave.Days || 0)} days</span>
        </td>
        <td>
          <span class="${statusClass}">${escapeHtml(status)}</span>
          ${status === 'Pending'
            ? `<div class="actions stacked-actions">
                <button class="ghost-button" data-action="approve-leave" data-id="${leave.LeaveRequestID}" type="button">Approve</button>
                <button class="danger-button" data-action="reject-leave" data-id="${leave.LeaveRequestID}" type="button">Reject</button>
              </div>`
            : ''}
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4">No leave records found.</td></tr>';
}

function renderPayslips() {
  if (!elements.payslipsTable) {
    return;
  }

  if (state.payslipStatusMessage && state.payslips.length === 0) {
    elements.payslipsTable.innerHTML = `<tr><td colspan="7">${escapeHtml(state.payslipStatusMessage)}</td></tr>`;
    if (elements.payslipSummary) {
      elements.payslipSummary.innerHTML = '';
    }
    return;
  }

  const school = getSettingsSchool();
  const totals = state.payslips.reduce((summary, payslip) => {
    summary.gross += Number(payslip.GrossAmount || 0);
    summary.deductions += Number(payslip.Deductions || 0);
    summary.net += Number(payslip.NetAmount || 0);
    return summary;
  }, { gross: 0, deductions: 0, net: 0 });

  if (elements.payslipSummary) {
    elements.payslipSummary.innerHTML = `
      <div class="metric"><span>Total gross</span><strong>${money(totals.gross, school)}</strong></div>
      <div class="metric"><span>Total deductions</span><strong>${money(totals.deductions, school)}</strong></div>
      <div class="metric"><span>Total net pay</span><strong>${money(totals.net, school)}</strong></div>
    `;
  }

  elements.payslipsTable.innerHTML = state.payslips.map((payslip) => {
    const employeeName = `${payslip.FirstName || ''} ${payslip.LastName || ''}`.trim() || `Employee ${payslip.EmployeeID}`;
    const employee = state.employees.find((item) => item.EmployeeID === payslip.EmployeeID);
    const isFinalized = payslip.IsFinalized === true || payslip.IsFinalized === 1 || payslip.Status === 'Finalized';
    const canManagePayroll = userCan('hr.manage_payslips|payroll.review|payroll.finalize');
    const status = payslipStatus(payslip);
    const statusClass = isFinalized ? 'badge' : 'badge warn';

    return `
      <tr>
        <td>${escapeHtml(employeeName)}</td>
        <td>${escapeHtml(payslip.PayPeriod || '-')}</td>
        <td>${money(payslip.GrossAmount || 0, school || employee)}</td>
        <td>${money(payslip.Deductions || 0, school || employee)}</td>
        <td>${money(payslip.NetAmount || 0, school || employee)}</td>
        <td><span class="${statusClass}">${escapeHtml(status)}</span></td>
        <td>
          <div class="actions stacked-actions">
            <button class="ghost-button" data-action="view-payslip" data-id="${payslip.PayslipID}" type="button">View</button>
            ${isFinalized || !canManagePayroll ? '' : `<button class="ghost-button" data-action="edit-payslip" data-id="${payslip.PayslipID}" type="button">Edit</button>`}
            ${isFinalized || !canManagePayroll ? '' : `<button class="secondary-button" data-action="finalize-payslip" data-id="${payslip.PayslipID}" type="button">Finalize</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7">No payslip records found.</td></tr>';
}


function renderRegisterLearnerOptions() {
  if (!elements.registerLearnerFamilySelect) return;
  const families = currentSchoolFamilies();
  elements.registerLearnerFamilySelect.innerHTML = '<option value="">New family / not listed</option>' +
    families.map((f) => '<option value="' + f.FamilyID + '">' + escapeHtml(f.FamilyName) + '</option>').join('');
  if (elements.registerLearnerClassSelect) {
    const currentYear = currentCalendarYear();
    const activeClasses = state.classes.filter((item) => item.IsActive !== false);
    const currentClasses = activeClasses.filter((item) => classYear(item) === currentYear);
    const classOptions = (currentClasses.length ? currentClasses : activeClasses)
      .sort((a, b) => String(a.ClassName || '').localeCompare(String(b.ClassName || '')))
      .map((item) => `<option value="${escapeHtml(item.ClassName || '')}">${escapeHtml(item.ClassName || '')}</option>`)
      .join('');

    elements.registerLearnerClassSelect.innerHTML = classOptions || '<option value="">No active classes available</option>';
    elements.registerLearnerClassSelect.disabled = !classOptions;
  }
  renderRegisterLearnerBillingPicker();
}


function renderOutstandingFees() {
  const table = document.getElementById('outstandingFeesTable');
  if (!table) return;

  const search = (document.getElementById('outstandingFeesSearch')?.value || '').toLowerCase();
  const data = state.outstandingFeesData || [];
  const filtered = search
    ? data.filter(r => (r.FirstName + ' ' + r.LastName + ' ' + (r.ClassName || '') + ' ' + (r.FamilyCode || '')).toLowerCase().includes(search))
    : data;

  if (filtered.length === 0) {
    const message = state.outstandingFeesError || 'No outstanding fees found for the selected year.';
    table.innerHTML = `<tr><td colspan="18">${escapeHtml(message)}</td></tr>`;
    return;
  }

  const school = getSettingsSchool();
  table.innerHTML = filtered.map(row => {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const val = Number(row['Month' + m] || 0);
      months.push(val > 0 ? '<td class="outstanding-cell">' + money(val, school) + '</td>' : '<td>-</td>');
    }
    return '<tr>' +
      '<td>' + escapeHtml(row.FirstName || '') + '</td>' +
      '<td>' + escapeHtml(row.LastName || '') + '</td>' +
      '<td>' + escapeHtml(row.ClassName || '-') + '</td>' +
      '<td>' + escapeHtml(row.PrimaryParentPhone || '-') + '</td>' +
      '<td>' + escapeHtml(row.SecondaryParentPhone || '-') + '</td>' +
      months.join('') +
      '<td><strong>' + money(row.TotalOutstanding || 0, school) + '</strong></td>' +
      '</tr>';
  }).join('');
}

async function refreshOutstandingFees() {
  if (!userCan('finance.outstanding_fees.view')) {
    state.outstandingFeesData = [];
    state.outstandingFeesError = '';
    renderOutstandingFees();
    return;
  }

  const yearInput = document.getElementById('outstandingFeesYear');
  const year = yearInput ? Number(yearInput.value) : new Date().getFullYear();
  try {
    const ofResult = await api('/api/invoices/outstanding-fees?year=' + year);
    state.outstandingFeesData = ofResult.data || ofResult;
    state.outstandingFeesError = '';
    // Update year input if server returned a different year
    if (ofResult.year && yearInput && Number(yearInput.value) !== ofResult.year) {
      yearInput.value = ofResult.year;
    }
  } catch (e) {
    state.outstandingFeesData = [];
    state.outstandingFeesError = e.message || 'Failed to load outstanding fees';
  }
  renderOutstandingFees();
}

function renderStudentStatusFilter() {
  const statusSelect = document.getElementById('studentStatusFilterInput');
  if (statusSelect) {
    statusSelect.value = state.studentStatusFilter;
  }
}

function renderTransactions() {
  if (!elements.transactionsTable) {
    return;
  }

  api('/api/transactions').then((transactions) => {
    const school = getSettingsSchool();
    elements.transactionsTable.innerHTML = transactions.length
      ? transactions.map((tx) => `
        <tr>
          <td>${dateOnly(tx.TransactionDate)}</td>
          <td><span class="badge">${escapeHtml(tx.TransactionType)}</span></td>
          <td>${money(tx.Amount, school)}</td>
          <td>${escapeHtml(tx.Reference || tx.InvoiceNumber || '-')}</td>
          <td>${escapeHtml(tx.Description || '-')}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5">No transactions found.</td></tr>';
  }).catch(() => {
    elements.transactionsTable.innerHTML = '<tr><td colspan="5">No transactions found.</td></tr>';
  });
}

function renderReconciliation() {
  if (!elements.totalCredits || !elements.totalDebits || !elements.accountBalance || !elements.outstandingAmount) {
    return;
  }

  const school = getSettingsSchool();
  const period = selectedReconciliationPeriod();
  const periodQuery = `month=${encodeURIComponent(period.month)}&year=${encodeURIComponent(period.year)}`;
  const transactionQuery = new URLSearchParams({
    month: String(period.month),
    year: String(period.year),
    limit: '200'
  });
  const status = elements.reconciliationStatus?.value || '';
  const search = elements.reconciliationSearch?.value || '';

  if (status) transactionQuery.set('status', status);
  if (search) transactionQuery.set('search', search);

  if (elements.reconciliationPeriodLabel) {
    elements.reconciliationPeriodLabel.textContent = `${period.monthName} ${period.year}`;
  }

  api(`/api/bank-statements/reconciliation?${periodQuery}`).then((summary) => {
    elements.totalCredits.textContent = money(summary.totalCredit, school);
    elements.totalDebits.textContent = money(summary.totalDebit, school);
    elements.accountBalance.textContent = money(summary.netPosition, school);
    elements.outstandingAmount.textContent = money(summary.outstandingInvoices, school);
    renderReconciliationCoverage(summary.coverage);
  }).catch(() => {
    elements.totalCredits.textContent = money(0, school);
    elements.totalDebits.textContent = money(0, school);
    elements.accountBalance.textContent = money(0, school);
    elements.outstandingAmount.textContent = money(0, school);
    renderReconciliationCoverage(null);
  });

  if (elements.reconciliationStatementsTable) {
    api(`/api/bank-statements?${periodQuery}`).then((statements) => {
      elements.reconciliationStatementsTable.innerHTML = statements.length
        ? statements.map((stmt) => `
          <tr>
            <td>
              <strong>${escapeHtml(stmt.FileName)}</strong>
              <span class="table-subtext">${escapeHtml(stmt.UploadedByEmail || '')}</span>
            </td>
            <td>${dateOnly(stmt.StatementDate)} to ${dateOnly(stmt.StatementEndDate)}</td>
            <td>${escapeHtml(stmt.RowsImported ?? stmt.TransactionCount ?? 0)} / ${escapeHtml(stmt.TotalRows ?? '-')}</td>
            <td>${escapeHtml(stmt.AllocatedCount ?? 0)}</td>
            <td>${escapeHtml(stmt.UnallocatedCount ?? 0)}</td>
            <td>
              <button class="ghost-button" data-action="view-bank-statement" data-id="${stmt.BankStatementID}" type="button">View</button>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="6">No bank statement has been uploaded for this month.</td></tr>';
    }).catch(() => {
      elements.reconciliationStatementsTable.innerHTML = '<tr><td colspan="6">No bank statements found.</td></tr>';
    });
  }

  if (elements.reconciliationTransactionsTable) {
    api(`/api/bank-statements/reconciliation/transactions?${transactionQuery.toString()}`).then((transactions) => {
      elements.reconciliationTransactionsTable.innerHTML = transactions.length
        ? transactions.map((tx) => reconciliationTransactionRow(tx, school)).join('')
        : '<tr><td colspan="8">No bank transactions found for this month.</td></tr>';
    }).catch(() => {
      elements.reconciliationTransactionsTable.innerHTML = '<tr><td colspan="8">No bank transactions found.</td></tr>';
    });
  }

  if (!elements.bankStatementsTable) {
    return;
  }

  api('/api/bank-statements').then((statements) => {
    elements.bankStatementsTable.innerHTML = statements.length
      ? statements.map((stmt) => `
        <tr>
          <td>${escapeHtml(stmt.FileName)}</td>
          <td>${dateOnly(stmt.StatementDate)} to ${dateOnly(stmt.StatementEndDate)}</td>
          <td>${escapeHtml(stmt.TransactionCount ?? stmt.RowsImported ?? '-')}</td>
          <td>${dateOnly(stmt.CreatedDate)}</td>
          <td>
            <button class="ghost-button" data-action="view-bank-statement" data-id="${stmt.BankStatementID}" type="button">View</button>
          </td>
        </tr>
      `).join('')
      : '<tr><td colspan="5">No bank statements uploaded.</td></tr>';
  }).catch(() => {
    elements.bankStatementsTable.innerHTML = '<tr><td colspan="5">No bank statements uploaded.</td></tr>';
  });
}

function selectedReconciliationPeriod() {
  const now = new Date();

  if (elements.reconciliationMonth && !elements.reconciliationMonth.options.length) {
    elements.reconciliationMonth.innerHTML = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const label = new Date(2000, index, 1).toLocaleString('en-ZA', { month: 'long' });
      return `<option value="${month}">${label}</option>`;
    }).join('');
    elements.reconciliationMonth.value = String(now.getMonth() + 1);
  }

  if (elements.reconciliationMonth && !elements.reconciliationMonth.value) {
    elements.reconciliationMonth.value = String(now.getMonth() + 1);
  }

  if (elements.reconciliationYear && !elements.reconciliationYear.value) {
    elements.reconciliationYear.value = String(now.getFullYear());
  }

  const month = Number(elements.reconciliationMonth?.value || now.getMonth() + 1);
  const year = Number(elements.reconciliationYear?.value || now.getFullYear());
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-ZA', { month: 'long' });

  return { month, year, monthName };
}

function renderReconciliationCoverage(coverage) {
  if (!elements.reconciliationCoverageNote) return;

  if (!coverage) {
    elements.reconciliationCoverageNote.textContent = '';
    return;
  }

  const issues = [];
  if (coverage.duplicateMonths?.length) {
    issues.push(`Duplicate statement months: ${coverage.duplicateMonths.join(', ')}`);
  }
  if (coverage.duplicateDateRanges?.length) {
    issues.push(`Duplicate statement dates: ${compactList(coverage.duplicateDateRanges)}`);
  }
  if (coverage.missingMonths?.length) {
    issues.push(`Missing statement months: ${coverage.missingMonths.join(', ')}`);
  }
  if (coverage.missingDateRanges?.length) {
    issues.push(`Missing statement dates: ${compactList(coverage.missingDateRanges)}`);
  }

  elements.reconciliationCoverageNote.textContent = issues.length
    ? issues.join(' | ')
    : `Statement coverage for ${coverage.year} has no duplicate or missing dates up to the selected period.`;
}

function compactList(items, limit = 4) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length <= limit) return list.join(', ');
  return `${list.slice(0, limit).join(', ')} and ${list.length - limit} more`;
}

function reconciliationTransactionRow(tx, school) {
  const suggestion = Array.isArray(tx.suggestions) ? tx.suggestions[0] : null;
  const allocatedTo = tx.InvoiceNumber
    ? `${tx.InvoiceNumber} ${[tx.AllocatedStudentFirstName, tx.AllocatedStudentLastName].filter(Boolean).join(' ')}`
    : tx.AllocatedFamilyName || '-';
  const canApprove = suggestion && tx.AllocationStatus !== 'Allocated';

  return `
    <tr>
      <td>${dateOnly(tx.TransactionDate)}</td>
      <td>
        <strong>${escapeHtml(tx.Reference || '-')}</strong>
        <span class="table-subtext">${escapeHtml(tx.BankStatementFile || '')}</span>
      </td>
      <td>${escapeHtml(tx.Description || '-')}</td>
      <td>${money(tx.Amount, school)}</td>
      <td><span class="badge ${tx.AllocationStatus === 'Allocated' ? '' : 'warn'}">${escapeHtml(tx.AllocationStatus || 'Unallocated')}</span></td>
      <td>
        ${suggestion ? `
          <strong>${escapeHtml(suggestion.invoiceNumber || '-')}</strong>
          <span class="table-subtext">${escapeHtml(suggestion.invoiceStudent || '')}</span>
          <span class="table-subtext">${escapeHtml(suggestion.reason || '')}</span>
        ` : '<span class="table-subtext">No automatic suggestion</span>'}
      </td>
      <td>${escapeHtml(allocatedTo.trim ? allocatedTo.trim() : allocatedTo)}</td>
      <td>
        ${canApprove ? `
          <button class="ghost-button" data-action="approve-bank-match" data-transaction-id="${suggestion.transactionId}" data-invoice-id="${suggestion.invoiceId}" type="button">
            Approve
          </button>
        ` : tx.AllocationStatus === 'Allocated' ? `
          <button class="secondary-button compact-button"
            data-action="open-bank-reallocation"
            data-id="${tx.TransactionID}"
            data-reference="${escapeHtml(tx.Reference || '-')}"
            data-amount="${escapeHtml(tx.Amount || 0)}"
            data-current="${escapeHtml(allocatedTo.trim ? allocatedTo.trim() : allocatedTo)}"
            type="button">
            Reallocate
          </button>
        ` : '<span class="table-subtext">Review manually</span>'}
      </td>
    </tr>
  `;
}

function bankStatementAssignmentLabel(tx) {
  const student = `${tx.AllocatedStudentFirstName || ''} ${tx.AllocatedStudentLastName || ''}`.trim();
  const invoice = tx.InvoiceNumber ? `${tx.InvoiceNumber}${student ? ` - ${student}` : ''}` : '';
  return invoice || student || tx.AllocatedFamilyName || tx.PaymentMethod || '-';
}

async function openBankStatementDetail(statementId) {
  if (!elements.bankStatementDetailDialog) return;
  document.getElementById('bankStatementDetailTitle').textContent = 'Bank Statement';
  elements.bankStatementDetailSubtitle.textContent = 'Loading statement history...';
  elements.bankStatementDetailTransactions.textContent = '0';
  elements.bankStatementDetailAllocated.textContent = '0';
  elements.bankStatementDetailUnallocated.textContent = '0';
  elements.bankStatementDetailTable.innerHTML = '<tr><td colspan="6">Loading statement transactions...</td></tr>';
  elements.bankStatementDetailDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');

  try {
    const detail = await api(`/api/bank-statements/${statementId}`);
    const statement = detail.statement || {};
    const transactions = Array.isArray(detail.transactions) ? detail.transactions : [];
    const school = getSettingsSchool();

    document.getElementById('bankStatementDetailTitle').textContent = statement.FileName || 'Bank Statement';
    elements.bankStatementDetailSubtitle.textContent = `${dateOnly(statement.StatementDate)} to ${dateOnly(statement.StatementEndDate)} - uploaded by ${statement.UploadedByEmail || 'system'}`;
    elements.bankStatementDetailTransactions.textContent = statement.TransactionCount ?? transactions.length;
    elements.bankStatementDetailAllocated.textContent = statement.AllocatedCount ?? transactions.filter((tx) => tx.AllocationStatus === 'Allocated').length;
    elements.bankStatementDetailUnallocated.textContent = statement.UnallocatedCount ?? transactions.filter((tx) => tx.AllocationStatus === 'Unallocated').length;
    elements.bankStatementDetailTable.innerHTML = transactions.length
      ? transactions.map((tx) => `
        <tr>
          <td>${dateOnly(tx.TransactionDate)}</td>
          <td>
            <strong>${escapeHtml(tx.Reference || '-')}</strong>
            <span class="table-subtext">${escapeHtml(tx.Description || '')}</span>
          </td>
          <td>${money(tx.Amount || 0, school)}</td>
          <td><span class="badge ${tx.AllocationStatus === 'Allocated' ? '' : 'warn'}">${escapeHtml(tx.AllocationStatus || 'Unallocated')}</span></td>
          <td>
            <strong>${escapeHtml(bankStatementAssignmentLabel(tx))}</strong>
            <span class="table-subtext">${escapeHtml(tx.AllocationType || '')}</span>
          </td>
          <td>
            ${escapeHtml(tx.AllocatedByEmail || '-')}
            <span class="table-subtext">${tx.AllocatedDate ? dateOnly(tx.AllocatedDate) : ''}</span>
          </td>
        </tr>
      `).join('')
      : '<tr><td colspan="6">No transactions were imported for this statement.</td></tr>';
  } catch (error) {
    elements.bankStatementDetailTable.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message);
  }
}

function closeBankStatementDetail() {
  elements.bankStatementDetailDialog?.classList.add('hidden');
  if (!Array.from(document.querySelectorAll('.modal-backdrop')).some((item) => item.id !== 'bankStatementDetailDialog' && !item.classList.contains('hidden'))) {
    document.body.classList.remove('modal-open');
  }
}

function openBankReallocationDialog(button) {
  if (!elements.bankReallocationDialog || !elements.bankReallocationForm) return;
  const school = getSettingsSchool();
  state.bankReallocationTransaction = {
    transactionId: Number(button.dataset.id),
    reference: button.dataset.reference || '-',
    amount: Number(button.dataset.amount || 0),
    current: button.dataset.current || '-'
  };
  state.bankReallocationTargets = [];
  state.bankReallocationInvoices = [];
  state.bankReallocationInvoiceId = null;

  elements.bankReallocationForm.reset();
  setFormValue(elements.bankReallocationForm, 'transactionId', state.bankReallocationTransaction.transactionId);
  setFormValue(elements.bankReallocationForm, 'invoiceId', '');
  setFormValue(elements.bankReallocationForm, 'studentId', '');
  setFormValue(elements.bankReallocationForm, 'familyId', '');
  elements.bankReallocationAmount.textContent = money(state.bankReallocationTransaction.amount, school);
  elements.bankReallocationReference.textContent = state.bankReallocationTransaction.reference;
  elements.bankReallocationCurrent.textContent = state.bankReallocationTransaction.current;
  elements.bankReallocationTargetsTable.innerHTML = '<tr><td colspan="4">Search for the correct learner or family.</td></tr>';
  elements.bankReallocationInvoicesTable.innerHTML = '<tr><td colspan="4">Select a learner first.</td></tr>';
  syncBankReallocationMode();
  elements.bankReallocationDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
  window.setTimeout(() => elements.bankReallocationSearchInput?.focus(), 0);
}

function closeBankReallocationDialog() {
  state.bankReallocationTransaction = null;
  state.bankReallocationTargets = [];
  state.bankReallocationInvoices = [];
  state.bankReallocationInvoiceId = null;
  elements.bankReallocationDialog?.classList.add('hidden');
  elements.bankReallocationForm?.reset();
  if (!Array.from(document.querySelectorAll('.modal-backdrop')).some((item) => item.id !== 'bankReallocationDialog' && !item.classList.contains('hidden'))) {
    document.body.classList.remove('modal-open');
  }
}

function syncBankReallocationMode() {
  const type = elements.bankReallocationTypeSelect?.value || 'Debtor';
  elements.bankReallocationDebtorPanel?.classList.toggle('hidden', type !== 'Debtor');
  elements.bankReallocationCreditorPanel?.classList.toggle('hidden', type !== 'Creditor');
  if (type === 'Creditor') {
    setFormValue(elements.bankReallocationForm, 'invoiceId', '');
    setFormValue(elements.bankReallocationForm, 'studentId', '');
    setFormValue(elements.bankReallocationForm, 'familyId', '');
    state.bankReallocationInvoiceId = null;
  }
}

async function searchBankReallocationTargets() {
  const query = String(elements.bankReallocationSearchInput?.value || '').trim();
  if (!elements.bankReallocationTargetsTable) return;

  if (query.length < 2) {
    state.bankReallocationTargets = [];
    elements.bankReallocationTargetsTable.innerHTML = '<tr><td colspan="4">Search for the correct learner or family.</td></tr>';
    elements.bankReallocationInvoicesTable.innerHTML = '<tr><td colspan="4">Select a learner first.</td></tr>';
    return;
  }

  elements.bankReallocationTargetsTable.innerHTML = '<tr><td colspan="4">Searching...</td></tr>';
  try {
    state.bankReallocationTargets = await api(`/api/bank-statements/allocation-search?q=${encodeURIComponent(query)}`);
    renderBankReallocationTargets();
  } catch (error) {
    elements.bankReallocationTargetsTable.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderBankReallocationTargets() {
  const school = getSettingsSchool();
  const rows = state.bankReallocationTargets || [];
  elements.bankReallocationTargetsTable.innerHTML = rows.length
    ? rows.map((target) => `
      <tr>
        <td>
          <strong>${escapeHtml(`${target.FirstName || ''} ${target.LastName || ''}`.trim() || '-')}</strong>
          <span class="table-subtext">${escapeHtml(target.ClassName || '')}</span>
        </td>
        <td>
          ${escapeHtml(target.FamilyName || '-')}
          <span class="table-subtext">${escapeHtml(target.PrimaryParentName || target.SecondaryParentName || '')}</span>
        </td>
        <td>${money(target.OutstandingBalance || 0, school)}</td>
        <td>
          <button class="ghost-button" data-action="select-bank-reallocation-target" data-student-id="${target.StudentID}" data-family-id="${target.FamilyID || ''}" type="button">Select</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">No matching learners found.</td></tr>';
}

async function selectBankReallocationTarget(button) {
  const studentId = Number(button.dataset.studentId);
  const familyId = Number(button.dataset.familyId || 0) || null;
  setFormValue(elements.bankReallocationForm, 'studentId', studentId);
  setFormValue(elements.bankReallocationForm, 'familyId', familyId || '');
  setFormValue(elements.bankReallocationForm, 'invoiceId', '');
  state.bankReallocationInvoiceId = null;
  elements.bankReallocationInvoicesTable.innerHTML = '<tr><td colspan="4">Loading open invoices...</td></tr>';

  try {
    state.bankReallocationInvoices = await api(`/api/bank-statements/outstanding-invoices/${studentId}`);
    renderBankReallocationInvoices();
  } catch (error) {
    elements.bankReallocationInvoicesTable.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderBankReallocationInvoices() {
  const school = getSettingsSchool();
  const invoices = state.bankReallocationInvoices || [];
  elements.bankReallocationInvoicesTable.innerHTML = invoices.length
    ? invoices.map((invoice) => {
      const selected = Number(invoice.InvoiceID) === Number(state.bankReallocationInvoiceId);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(invoice.InvoiceNumber || '-')}</strong>
            <span class="table-subtext">${escapeHtml(`${invoice.FirstName || ''} ${invoice.LastName || ''}`.trim())}</span>
          </td>
          <td>
            ${dateOnly(invoice.DueDate)}
            <span class="table-subtext">${escapeHtml(invoice.Status || '-')}</span>
          </td>
          <td>${money(invoice.Remaining || 0, school)}</td>
          <td>
            <button class="${selected ? 'secondary-button' : 'ghost-button'}" data-action="select-bank-reallocation-invoice" data-invoice-id="${invoice.InvoiceID}" type="button">
              ${selected ? 'Selected' : 'Select'}
            </button>
          </td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="4">No open invoices found for this learner.</td></tr>';
}

function selectBankReallocationInvoice(button) {
  state.bankReallocationInvoiceId = Number(button.dataset.invoiceId);
  setFormValue(elements.bankReallocationForm, 'invoiceId', state.bankReallocationInvoiceId);
  renderBankReallocationInvoices();
}

function selectedDepartureStudent() {
  return state.students.find((student) => student.StudentID === state.selectedDepartureStudentId);
}

function showDepartureForm(studentId) {
  state.selectedDepartureStudentId = Number(studentId);
  const student = selectedDepartureStudent();

  if (!student) {
    showToast('Student not found');
    return;
  }

  elements.departureStudentName.textContent = `${student.FirstName} ${student.LastName}`;
  elements.departureForm.elements.departureDate.value = new Date().toISOString().slice(0, 10);
  elements.departureForm.elements.departureReason.value = 'Left';
  elements.departureForm.elements.departureNote.value = '';
  elements.departureOtherGroup.classList.add('hidden');
  elements.departureForm.classList.remove('hidden');
}

function hideDepartureForm() {
  state.selectedDepartureStudentId = null;
  elements.departureForm.classList.add('hidden');
  elements.departureForm.reset();
}

async function openStudentFinanceDialog(studentId, focusReceipt = false) {
  const parsedStudentId = Number(studentId);
  const student = state.students.find((item) => Number(item.StudentID) === parsedStudentId);

  state.selectedStudentFinanceId = parsedStudentId;
  state.selectedStudentFinanceStatement = null;
  elements.studentReceiptForm?.reset();
  setFormValue(elements.studentReceiptForm, 'studentId', parsedStudentId || '');
  setFormValue(elements.studentReceiptForm, 'paymentDate', new Date().toISOString().slice(0, 10));
  setFormValue(elements.studentReceiptForm, 'paymentMethod', 'EFT');
  setFormValue(elements.studentReceiptForm, 'payeeType', 'Responsible payer');
  syncReceiptPayeeFields({ preserveOther: false });
  document.getElementById('studentFinanceDialogTitle').textContent = student
    ? `${student.FirstName} ${student.LastName} Invoices`
    : 'Student Invoices';
  document.getElementById('studentFinanceDialogSubtitle').textContent = student?.FamilyName || 'Issue receipts and allocate payments for this learner.';
  elements.studentReceiptInvoicesTable.innerHTML = '<tr><td colspan="4">Loading invoices...</td></tr>';
  elements.studentFinanceDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');

  try {
    state.selectedStudentFinanceStatement = await api(`/api/invoices/student/${parsedStudentId}/statement`);
    renderStudentFinanceDialog();
    syncReceiptPayeeFields({ preserveOther: false });
    if (focusReceipt) {
      window.setTimeout(() => elements.studentReceiptAmountInput?.focus(), 0);
    }
  } catch (error) {
    elements.studentReceiptInvoicesTable.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message);
  }
}

function closeStudentFinanceDialog() {
  state.selectedStudentFinanceId = null;
  state.selectedStudentFinanceStatement = null;
  elements.studentFinanceDialog?.classList.add('hidden');
  elements.studentReceiptForm?.reset();
  document.body.classList.remove('modal-open');
}

function renderStudentFinanceDialog() {
  const statement = state.selectedStudentFinanceStatement || {};
  const invoices = Array.isArray(statement.invoices) ? statement.invoices : [];
  const school = getSettingsSchool();
  const outstanding = invoices.reduce((sum, invoice) => sum + studentInvoiceRemaining(invoice), 0);
  const walletBalance = Number(statement.wallet?.Balance || 0);

  elements.studentFinanceOutstanding.textContent = money(outstanding, school);
  elements.studentFinanceWallet.textContent = money(walletBalance, school);
  elements.studentFinanceInvoiceCount.textContent = invoices.length;

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOpen = studentInvoiceRemaining(a) > 0 ? 0 : 1;
    const bOpen = studentInvoiceRemaining(b) > 0 ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return new Date(a.DueDate || a.IssueDate || 0) - new Date(b.DueDate || b.IssueDate || 0);
  });

  elements.studentReceiptInvoicesTable.innerHTML = sortedInvoices.length
    ? sortedInvoices.map((invoice) => {
      const remaining = studentInvoiceRemaining(invoice);
      const isOpen = remaining > 0 && invoice.Status !== 'Cancelled';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(invoice.InvoiceNumber || '-')}</strong>
            <span class="table-subtext">${escapeHtml(invoice.Description || '')}</span>
          </td>
          <td>
            ${dateOnly(invoice.DueDate)}
            <span class="table-subtext">${escapeHtml(invoice.Status || '-')}</span>
          </td>
          <td>${money(remaining, school)}</td>
          <td>
            ${isOpen ? `
              <input class="thin-input student-receipt-allocation" data-invoice-id="${invoice.InvoiceID}" data-remaining="${remaining.toFixed(2)}" type="number" min="0" max="${remaining.toFixed(2)}" step="0.01" value="0.00">
            ` : '<span class="table-subtext">No allocation needed</span>'}
          </td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="4">No invoices found for this learner.</td></tr>';

  const walletLedger = Array.isArray(statement.walletLedger) ? statement.walletLedger : [];
  elements.studentWalletLedgerTable.innerHTML = walletLedger.length
    ? walletLedger.slice(0, 12).map((entry) => `
      <tr>
        <td>${dateOnly(entry.EntryDate)}</td>
        <td>${escapeHtml(entry.EntryType || '-')}</td>
        <td>
          <strong>${escapeHtml(entry.Reference || entry.ReceiptNumber || entry.InvoiceNumber || '-')}</strong>
          <span class="table-subtext">${escapeHtml(entry.Description || '')}</span>
        </td>
        <td>${money(entry.Amount || 0, school)}</td>
        <td>${money(entry.BalanceAfter || 0, school)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5">No advance wallet activity yet.</td></tr>';

  updateStudentReceiptAdvanceHint();
}

function studentInvoiceRemaining(invoice) {
  return Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0));
}

function syncStudentReceiptAllocations() {
  let remainingReceipt = Math.max(0, Number(elements.studentReceiptAmountInput?.value || 0));
  studentReceiptAllocationInputs().forEach((input) => {
    const remainingInvoice = Number(input.dataset.remaining || 0);
    const nextValue = Math.min(remainingInvoice, remainingReceipt);
    input.value = nextValue > 0 ? nextValue.toFixed(2) : '0.00';
    remainingReceipt = Math.max(0, remainingReceipt - nextValue);
  });
  updateStudentReceiptAdvanceHint();
}

function updateStudentReceiptAdvanceHint() {
  if (!elements.studentReceiptAdvanceHint) return;
  const amount = Math.max(0, Number(elements.studentReceiptAmountInput?.value || 0));
  const allocated = studentReceiptAllocationInputs()
    .reduce((sum, input) => sum + Math.max(0, Number(input.value || 0)), 0);
  const advance = amount - allocated;
  const school = getSettingsSchool();

  if (allocated > amount) {
    elements.studentReceiptAdvanceHint.textContent = `Allocated amount is ${money(allocated, school)}, which is more than the receipt amount.`;
    return;
  }

  elements.studentReceiptAdvanceHint.textContent = advance > 0
    ? `${money(advance, school)} will be kept in the learner's advance wallet for future invoices.`
    : 'Receipt amount is fully allocated to selected invoices.';
}

function studentReceiptAllocationInputs() {
  return Array.from(elements.studentReceiptInvoicesTable?.querySelectorAll('.student-receipt-allocation') || []);
}

async function openEmployeeDialog(employeeId = null) {
  const form = elements.employeeForm;
  const employee = employeeId
    ? state.employees.find((item) => item.EmployeeID === Number(employeeId))
    : null;

  if (employeeId && !employee) {
    showToast('Staff member not found');
    return;
  }

  state.editingEmployeeId = employee?.EmployeeID || null;
  form.reset();
  if (!state.staffRoles.length) {
    await refreshStaffRoles();
  }
  setFormValue(form, 'employeeId', employee?.EmployeeID || '');
  setFormValue(form, 'employeeNumber', employee?.EmployeeNumber || '');
  setFormValue(form, 'payrollNumber', employee?.PayrollNumber || '');
  setFormValue(form, 'firstName', employee?.FirstName || '');
  setFormValue(form, 'lastName', employee?.LastName || '');
  setFormValue(form, 'email', employee?.Email || '');
  setFormValue(form, 'phone', employee?.Phone || '');
  setFormValue(form, 'physicalAddress', employee?.PhysicalAddress || '');
  renderEmployeeRoleOptions(employee?.JobTitle || '');
  renderEmployeeDepartmentOptions(employee?.Department || '');
  setFormValue(form, 'startDate', employee?.StartDate ? employee.StartDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  setFormValue(form, 'salary', Number(employee?.Salary || 0).toFixed(2));
  setFormValue(form, 'standardAllowances', Number(employee?.StandardAllowances || 0).toFixed(2));
  setFormValue(form, 'standardDeductions', Number(employee?.StandardDeductions || 0).toFixed(2));
  setFormValue(form, 'taxPaye', Number(employee?.TaxPaye || 0).toFixed(2));
  setFormValue(form, 'uifDeduction', Number(employee?.UifDeduction || 0).toFixed(2));
  setFormValue(form, 'idNumber', employee?.IdNumber || '');
  setFormValue(form, 'passportNumber', employee?.PassportNumber || '');
  setFormValue(form, 'taxNumber', employee?.TaxNumber || '');
  setFormValue(form, 'payeReference', employee?.PayeReference || '');
  setFormValue(form, 'uifNumber', employee?.UifNumber || '');
  setFormValue(form, 'uifReferenceNumber', employee?.UifReferenceNumber || '');
  setFormValue(form, 'paymentMethod', employee?.PaymentMethod || '');
  setFormValue(form, 'bankName', employee?.BankName || '');
  setFormValue(form, 'bankAccountNumber', employee?.BankAccountNumber || '');
  setFormValue(form, 'branchCode', employee?.BranchCode || '');
  setFormValue(form, 'accountType', employee?.AccountType || '');
  setFormValue(form, 'leaveBalance', employee?.LeaveBalance ?? 21);
  setFormValue(form, 'isActive', employee && employee.IsActive === false ? 'false' : 'true');
  document.getElementById('employeeDialogTitle').textContent = employee ? 'Edit staff' : 'Add staff';
  document.getElementById('employeeDialogSubtitle').textContent = employee ? 'Update staff details for this school.' : 'Capture staff details for this school.';
  elements.employeeDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
  window.setTimeout(() => form.elements.firstName.focus(), 0);
}

function closeEmployeeDialog() {
  state.editingEmployeeId = null;
  elements.employeeDialog.classList.add('hidden');
  elements.employeeForm.reset();
  document.body.classList.remove('modal-open');
}

function payslipEmployeeNumber(payslip) {
  return payslip.EmployeeNumber || (payslip.EmployeeID ? `S${String(payslip.EmployeeID).padStart(3, '0')}` : 'Not captured');
}

function payslipMoney(payslip, value) {
  return money(value || 0, getSettingsSchool() || payslip);
}

function requiredText(value) {
  const cleaned = String(value ?? '').trim();
  return cleaned || 'Not captured';
}

function payslipStatus(payslip) {
  return payslip.IsFinalized === true || payslip.IsFinalized === 1 ? 'Finalized' : (payslip.Status || 'Draft');
}

function payslipEmployeeName(payslip) {
  return requiredText(`${payslip.FirstName || ''} ${payslip.LastName || ''}`.trim());
}

function payslipPeriodLabel(payPeriod) {
  const match = String(payPeriod || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return requiredText(payPeriod);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const month = date.toLocaleString('en-ZA', { month: 'short' });
  return `${month}-${String(match[1]).slice(2)}`;
}

function payslipAddressLines(value) {
  return String(value || '')
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function payslipDetailLine(label, value) {
  return `<div class="payslip-detail-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(requiredText(value))}</strong></div>`;
}

function payslipAmountRow(label, value, options = {}) {
  const className = options.total ? ' class="total-row"' : '';
  return `<tr${className}><th>${escapeHtml(label)}</th><td>${payslipMoney(options.payslip, value)}</td></tr>`;
}

function payslipEarningsRows(payslip) {
  const rows = [
    ['Cost to Company/Month', payslip.BasicSalary]
  ];

  [
    ['Allowances', payslip.Allowances],
    ['Overtime', payslip.Overtime],
    ['Bonus', payslip.Bonus]
  ].forEach(([label, value]) => {
    if (Number(value || 0) !== 0) rows.push([label, value]);
  });

  return rows.map(([label, value]) => payslipAmountRow(label, value, { payslip })).join('');
}

function payslipDeductionRows(payslip) {
  const rows = [
    ['Tax (PAYE)', payslip.TaxPaye],
    ['UIF', payslip.UifDeduction]
  ];

  [
    ['Leave deduction', payslip.LeaveDeduction],
    ['Other deductions', payslip.OtherDeductions]
  ].forEach(([label, value]) => {
    if (Number(value || 0) !== 0) rows.push([label, value]);
  });

  return rows.map(([label, value]) => payslipAmountRow(label, value, { payslip })).join('');
}

function payslipDocumentHtml(payslip) {
  const schoolAddress = payslipAddressLines(payslip.SchoolAddress);
  const employeeAddress = payslipAddressLines(payslip.PhysicalAddress);
  const employeeContact = [payslip.Email, payslip.Phone].filter(Boolean).join(' / ');
  const bankDetails = [
    ['Bank', payslip.BankName],
    ['Account No', payslip.BankAccountNumber],
    ['Branch Code', payslip.BranchCode],
    ['Account Type', payslip.AccountType]
  ];
  const ytdRows = [
    ['Taxable Earnings', payslip.YearToDateTaxableEarnings || payslip.GrossAmount],
    ['Tax Paid', payslip.YearToDateTaxPaid || payslip.TaxPaye],
    ['UIF', payslip.YearToDateUif || payslip.UifDeduction],
    ['Net Pay', payslip.YearToDateNetPay || payslip.NetAmount]
  ];

  return `
    <article class="payslip-document">
      <header class="payslip-document-header">
        ${payslip.SchoolLogo ? `<img src="${escapeHtml(payslip.SchoolLogo)}" alt="">` : ''}
        <div>
          <h2>${escapeHtml(requiredText(payslip.SchoolName))}</h2>
          <p>${escapeHtml(requiredText(payslip.SchoolRegistrationNumber))}</p>
          <p>${escapeHtml([payslip.SchoolPhone, payslip.SchoolEmail].filter(Boolean).join(' / ') || 'Not captured')}</p>
        </div>
      </header>

      <section class="payslip-document-grid">
        <div>
          ${payslipDetailLine('Employee Name', payslipEmployeeName(payslip))}
          ${payslipDetailLine('Date Engaged', dateOnly(payslip.StartDate))}
          ${payslipDetailLine('ID No', payslip.IdNumber || payslip.PassportNumber)}
          ${payslipDetailLine('Job Title', payslip.JobTitle)}
          ${payslipDetailLine('Employee No', payslipEmployeeNumber(payslip))}
          ${payslipDetailLine('Payroll No', payslip.PayrollNumber)}
          ${payslipDetailLine('Employee Contact', employeeContact)}
        </div>
        <div>
          <span class="payslip-block-label">Co. Address</span>
          <address>${(schoolAddress.length ? schoolAddress : ['Not captured']).map((line) => escapeHtml(line)).join('<br>')}</address>
        </div>
        <div>
          <span class="payslip-block-label">Employee Address</span>
          <address>${(employeeAddress.length ? employeeAddress : ['Not captured']).map((line) => escapeHtml(line)).join('<br>')}</address>
        </div>
        <div>
          ${bankDetails.map(([label, value]) => payslipDetailLine(label, value)).join('')}
          ${payslipDetailLine('Income Tax No', payslip.TaxNumber || payslip.PayeReference)}
          ${payslipDetailLine('PAYE Ref', payslip.PayeReference)}
          ${payslipDetailLine('UIF No', payslip.UifNumber || payslip.UifReferenceNumber)}
          ${payslipDetailLine('UIF Ref', payslip.UifReferenceNumber)}
          ${payslipDetailLine('Pay Period', payslipPeriodLabel(payslip.PayPeriod))}
          ${payslipDetailLine('Payment Date', dateOnly(payslip.PaymentDate))}
        </div>
      </section>

      <section class="payslip-money-grid">
        <table>
          <thead><tr><th colspan="2">Earnings</th></tr></thead>
          <tbody>
            ${payslipEarningsRows(payslip)}
            ${payslipAmountRow('Total Earnings', payslip.GrossAmount, { payslip, total: true })}
          </tbody>
        </table>
        <table>
          <thead><tr><th colspan="2">Deductions</th></tr></thead>
          <tbody>
            ${payslipDeductionRows(payslip)}
            ${payslipAmountRow('Total Deductions', payslip.Deductions, { payslip, total: true })}
            ${payslipAmountRow('Net Pay', payslip.NetAmount, { payslip, total: true })}
          </tbody>
        </table>
      </section>

      <section class="payslip-ytd">
        <h3>Year To Date</h3>
        <table>
          <tbody>${ytdRows.map(([label, value]) => payslipAmountRow(label, value, { payslip })).join('')}</tbody>
        </table>
      </section>

      <footer class="payslip-document-footer">
        <span>${escapeHtml(payslipStatus(payslip))}</span>
        <span>Generated ${escapeHtml(dateOnly(new Date()))}</span>
        <span>${escapeHtml(requiredText(payslip.Notes || 'No notes'))}</span>
      </footer>
    </article>
  `;
}

function renderPayslipDetailPreview(payslip) {
  if (!elements.payslipDetailPreview) return;
  elements.payslipDetailPreview.innerHTML = payslipDocumentHtml(payslip);
}

async function openPayslipDialog(payslipId, mode = 'view') {
  const payslip = await api(`/api/payslips/${payslipId}`);
  state.selectedPayslip = payslip;
  const form = elements.payslipEditForm;
  const canEdit = mode === 'edit'
    && userCan('hr.manage_payslips|payroll.review')
    && !(payslip.IsFinalized === true || payslip.IsFinalized === 1 || payslip.Status === 'Finalized');

  form.reset();
  setFormValue(form, 'payslipId', payslip.PayslipID);
  setFormValue(form, 'basicSalary', Number(payslip.BasicSalary || 0).toFixed(2));
  setFormValue(form, 'allowances', Number(payslip.Allowances || 0).toFixed(2));
  setFormValue(form, 'overtime', Number(payslip.Overtime || 0).toFixed(2));
  setFormValue(form, 'bonus', Number(payslip.Bonus || 0).toFixed(2));
  setFormValue(form, 'leaveDeduction', Number(payslip.LeaveDeduction || 0).toFixed(2));
  setFormValue(form, 'taxPaye', Number(payslip.TaxPaye || 0).toFixed(2));
  setFormValue(form, 'uifDeduction', Number(payslip.UifDeduction || 0).toFixed(2));
  setFormValue(form, 'otherDeductions', Number(payslip.OtherDeductions || 0).toFixed(2));
  setFormValue(form, 'paymentDate', dateInputValue(payslip.PaymentDate));
  setFormValue(form, 'notes', payslip.Notes || '');

  form.querySelectorAll('input, textarea').forEach((field) => {
    if (field.name !== 'payslipId') field.disabled = !canEdit;
  });
  form.classList.toggle('payslip-view-mode', !canEdit);
  elements.payslipEditFields?.classList.toggle('hidden', !canEdit);
  elements.savePayslipButton.classList.toggle('hidden', !canEdit);
  document.getElementById('payslipDialogTitle').textContent = canEdit ? 'Edit payslip' : 'View payslip';
  document.getElementById('payslipDialogSubtitle').textContent = `${requiredText(`${payslip.FirstName || ''} ${payslip.LastName || ''}`.trim())} - ${requiredText(payslip.PayPeriod)}`;
  renderPayslipDetailPreview(payslip);
  elements.payslipDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closePayslipDialog() {
  state.selectedPayslip = null;
  elements.payslipDialog?.classList.add('hidden');
  elements.payslipEditForm?.reset();
  document.body.classList.remove('modal-open');
}

function printPayslip(payslip) {
  if (!payslip) {
    showToast('Open a payslip before printing');
    return;
  }

  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) {
    showToast('Allow popups to print the payslip');
    return;
  }

  win.document.write(`<!doctype html>
    <html>
      <head>
        <title>Payslip ${escapeHtml(payslip.PayPeriod)} - ${escapeHtml(payslipEmployeeNumber(payslip))}</title>
        <style>
          body { margin: 0; padding: 20px; color: #111827; font-family: Arial, sans-serif; background: #fff; }
          ${payslipPrintCss()}
          @media print { body { padding: 0; } .payslip-document { border: 0; box-shadow: none; } }
        </style>
      </head>
      <body>
        ${payslipDocumentHtml(payslip)}
        <script>window.onload = function(){ window.print(); };</script>
      </body>
    </html>`);
  win.document.close();
}

function payslipPrintCss() {
  return `
    .payslip-document { max-width: 860px; margin: 0 auto; border: 1px solid #d1d5db; padding: 26px; background: #fff; }
    .payslip-document-header { display: grid; grid-template-columns: 90px 1fr; gap: 16px; align-items: center; text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
    .payslip-document-header img { width: 78px; max-height: 78px; object-fit: contain; }
    .payslip-document-header h2 { margin: 0; font-size: 20px; }
    .payslip-document-header p { margin: 3px 0 0; font-size: 11px; }
    .payslip-document-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 30px; margin-bottom: 18px; }
    .payslip-detail-line { display: grid; grid-template-columns: 130px 1fr; gap: 8px; margin-bottom: 7px; font-size: 12px; }
    .payslip-detail-line span, .payslip-block-label { font-weight: 700; color: #111827; }
    .payslip-detail-line strong { font-weight: 500; }
    address { margin-top: 7px; font-style: normal; line-height: 1.45; font-size: 12px; }
    .payslip-money-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 7px 8px; font-size: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    thead th { border-bottom: 2px solid #111827; font-size: 13px; }
    td { text-align: right; }
    .total-row th, .total-row td { font-weight: 800; border-top: 2px solid #111827; }
    .payslip-ytd { width: 50%; margin-left: auto; margin-top: 18px; }
    .payslip-ytd h3 { margin: 0 0 8px; font-size: 13px; text-align: left; }
    .payslip-document-footer { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #d1d5db; margin-top: 20px; padding-top: 10px; font-size: 11px; color: #4b5563; }
  `;
}

function reportPrintHeaderHtml(title, prefix) {
  const school = reportSchool();
  const filters = reportData().filters || reportFilterValues(prefix);
  const classLabel = filters.className || 'All classes';
  const logo = school.LogoUrl ? `<img src="${escapeHtml(school.LogoUrl)}" alt="">` : '';
  return `
    <header class="print-report-header">
      ${logo}
      <div>
        <h1>${escapeHtml(school.SchoolName || 'School Report')}</h1>
        <p>${escapeHtml(title || 'Report')}</p>
        <p>${escapeHtml([school.RegistrationNumber, school.ContactPhone, school.ContactEmail].filter(Boolean).join(' | ') || 'School report')}</p>
        <p>Year: ${escapeHtml(String(filters.year || new Date().getFullYear()))} | Class: ${escapeHtml(classLabel)} | Generated: ${escapeHtml(dateOnly(new Date()))}</p>
      </div>
    </header>
  `;
}

function reportPrintCss() {
  return `
    body { margin: 0; padding: 18px; color: #111827; font-family: Arial, sans-serif; background: #fff; }
    .print-report-header { display: grid; grid-template-columns: 86px 1fr; gap: 16px; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
    .print-report-header img { width: 76px; max-height: 76px; object-fit: contain; }
    .print-report-header h1 { margin: 0; font-size: 22px; }
    .print-report-header p { margin: 3px 0; font-size: 12px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    .metric { border: 1px solid #d1d5db; padding: 10px; }
    .metric span { display: block; color: #4b5563; font-size: 11px; }
    .metric strong { display: block; margin-top: 4px; font-size: 16px; }
    .report-chart-grid, .report-table-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .report-chart-card, .table-panel { border: 1px solid #d1d5db; padding: 12px; break-inside: avoid; }
    .report-chart-card h3, .panel-header h3 { margin: 0 0 10px; font-size: 14px; }
    .report-bar-row { display: grid; grid-template-columns: 120px 1fr 80px; gap: 8px; align-items: center; margin: 7px 0; font-size: 11px; }
    .report-bar-track { height: 9px; background: #e5e7eb; }
    .report-bar-fill { height: 100%; background: #2563eb; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 6px; font-size: 11px; text-align: left; vertical-align: top; }
    th { color: #374151; background: #f9fafb; }
    .badge { border: 1px solid #cbd5e1; padding: 2px 6px; font-size: 10px; }
    .table-subtext { display: block; color: #64748b; font-size: 10px; }
    @media print { body { padding: 10mm; } .report-chart-card, .table-panel { break-inside: avoid; } }
  `;
}

function printReport(prefix, title) {
  const area = document.getElementById(`${prefix}PrintArea`);
  if (!area) {
    showToast('Open a report before printing');
    return;
  }

  const win = window.open('', '_blank', 'width=1100,height=780');
  if (!win) {
    showToast('Allow popups to print this report');
    return;
  }

  win.document.write(`<!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title || 'School Report')}</title>
        <style>${reportPrintCss()}</style>
      </head>
      <body>
        ${reportPrintHeaderHtml(title, prefix)}
        ${area.innerHTML}
        <script>window.onload = function(){ window.print(); };</script>
      </body>
    </html>`);
  win.document.close();
}

function activateFormTab(button) {
  const form = button.closest('form');
  if (!form) {
    return;
  }

  const tabName = button.dataset.formTab;
  form.querySelectorAll('.form-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
  form.querySelectorAll('.form-tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.formPanel === tabName);
  });
}

function openStudentEditDialog(studentId) {
  const student = state.students.find((item) => item.StudentID === Number(studentId));
  if (!student) {
    showToast('Student not found');
    return;
  }

  const family = state.families.find((item) => item.FamilyID === student.FamilyID) || student;
  const form = elements.studentEditForm;
  form.reset();
  setFormValue(form, 'studentId', student.StudentID);
  setFormValue(form, 'familyId', student.FamilyID);
  setFormValue(form, 'firstName', student.FirstName);
  setFormValue(form, 'lastName', student.LastName);
  setFormValue(form, 'dateOfBirth', student.DateOfBirth ? student.DateOfBirth.slice(0, 10) : '');
  setFormValue(form, 'className', student.ClassName);
  setFormValue(form, 'enrolledDate', student.EnrolledDate ? student.EnrolledDate.slice(0, 10) : '');
  setFormValue(form, 'billingDate', student.BillingDate ? student.BillingDate.slice(0, 10) : '');
  setFormValue(form, 'homePhone', student.HomePhone);
  setFormValue(form, 'homeAddress', student.HomeAddress);
  setFormValue(form, 'medicalNotes', student.MedicalNotes);
  fillFamilyForm(form, family);
  setResponsiblePayerFromStudent(form, student);
  state.studentEditBillingIds = billingCategoryIdsForStudent(student);
  renderStudentEditBillingPicker();
  form.querySelector('[data-form-tab="editLearner"]')?.click();
  elements.studentEditDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
  window.setTimeout(() => form.elements.firstName.focus(), 0);
}

function closeStudentEditDialog() {
  elements.studentEditDialog.classList.add('hidden');
  elements.studentEditForm.reset();
  state.studentEditBillingIds = [];
  document.body.classList.remove('modal-open');
}

function openFamilyEditDialog(familyId) {
  const family = state.families.find((item) => item.FamilyID === Number(familyId));
  if (!family) {
    showToast('Family not found');
    return;
  }

  const form = elements.familyEditForm;
  form.reset();
  fillFamilyForm(form, family);
  elements.familyEditDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
  window.setTimeout(() => form.elements.familyName.focus(), 0);
}

function closeFamilyEditDialog() {
  elements.familyEditDialog.classList.add('hidden');
  elements.familyEditForm.reset();
  document.body.classList.remove('modal-open');
}

function requireFields(form, names) {
  for (const name of names) {
    const field = form.elements[name];
    if (field && !String(field.value || '').trim()) {
      field.focus();
      throw new Error('Please fill in all required fields');
    }
  }
}

function formValue(form, name) {
  return String(form?.elements?.[name]?.value || '').trim();
}

function showRequiredInfoDialog(fields) {
  if (!elements.requiredInfoDialog || !elements.requiredInfoList) {
    window.alert(`Fill in the Required Information\n\n${fields.join('\n')}`);
    return;
  }

  elements.requiredInfoList.innerHTML = fields.map((field) => `<li>${escapeHtml(field)}</li>`).join('');
  elements.requiredInfoDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeRequiredInfoDialog() {
  elements.requiredInfoDialog?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function updateRegisterLearnerParentFields() {
  const parentType = elements.registerLearnerParentTypeSelect?.value || '';
  const hasParentSelection = Boolean(parentType);
  const isBoth = parentType === 'Both';
  const primaryLabel = parentType === 'Father' ? 'Father' : 'Mother';

  document.getElementById('registerPrimaryParentNameLabel').textContent = `${primaryLabel} name`;
  document.getElementById('registerPrimaryParentIdLabel').textContent = `${primaryLabel} ID / passport`;
  document.getElementById('registerPrimaryParentPhoneLabel').textContent = `${primaryLabel} cell`;
  document.getElementById('registerPrimaryParentEmailLabel').textContent = `${primaryLabel} email`;

  document.querySelectorAll('[data-parent-detail-field]').forEach((field) => {
    const isSecondary = field.hasAttribute('data-parent-secondary-field');
    field.classList.toggle('hidden', !hasParentSelection || (isSecondary && !isBoth));
  });

  if ((!hasParentSelection || !isBoth) && elements.registerLearnerForm) {
    ['secondaryParentName', 'secondaryParentIdNumber', 'secondaryParentPhone', 'secondaryParentEmail'].forEach((name) => {
      if (elements.registerLearnerForm.elements[name]) {
        elements.registerLearnerForm.elements[name].value = '';
      }
    });
  }

  if (!hasParentSelection && elements.registerLearnerForm) {
    ['familyName', 'primaryParentName', 'primaryParentIdNumber', 'primaryParentPhone', 'primaryParentEmail', 'familyHomeAddress'].forEach((name) => {
      if (elements.registerLearnerForm.elements[name]) {
        elements.registerLearnerForm.elements[name].value = '';
      }
    });
  }

  syncResponsiblePayerFields(elements.registerLearnerForm, { preserveOther: true });
}

function registerLearnerMissingFields(form) {
  const missing = [];
  const parentType = formValue(form, 'parentType');
  const primaryParent = parentType === 'Father' ? 'Father' : 'Mother';

  [
    ['firstName', 'Learner first name'],
    ['lastName', 'Learner last name'],
    ['className', 'Class'],
    ['enrolledDate', 'Starting date'],
    ['billingDate', 'Billing date'],
    ['parentType', 'Select Parent'],
    ['familyName', 'Family name'],
    ['familyHomeAddress', 'Family address'],
    ['emergencyContactName', 'Emergency contact'],
    ['emergencyContactPhone', 'Emergency phone']
  ].forEach(([name, label]) => {
    if (!formValue(form, name)) {
      missing.push(label);
    }
  });

  [
    ['primaryParentName', `${primaryParent} name`],
    ['primaryParentPhone', `${primaryParent} cell`],
    ['primaryParentEmail', `${primaryParent} email`]
  ].forEach(([name, label]) => {
    if (!formValue(form, name)) {
      missing.push(label);
    }
  });

  if (parentType === 'Both') {
    [
      ['secondaryParentName', 'Father name'],
      ['secondaryParentPhone', 'Father cell'],
      ['secondaryParentEmail', 'Father email']
    ].forEach(([name, label]) => {
      if (!formValue(form, name)) {
        missing.push(label);
      }
    });
  }

  if (!selectedValues(elements.registerLearnerBillingSelect).length) {
    missing.push('Billing information');
  }

  if (!formValue(form, 'responsiblePayerName')) {
    missing.push('Responsible payer');
  }

  return missing;
}

function getAccountSchool() {
  if (!state.schools.length) {
    return null;
  }

  if (state.user?.role !== 'admin') {
    return state.schools.find((school) => school.SchoolID === state.user.schoolId) || state.schools[0];
  }

  const selectedId = Number(state.selectedAccountSchoolId);
  const selectedSchool = state.schools.find((school) => school.SchoolID === selectedId);

  return selectedSchool || state.schools[0];
}

function getSettingsSchool() {
  if (!state.schools.length) {
    return null;
  }

  if (state.user?.role !== 'admin') {
    return state.schools.find((school) => school.SchoolID === state.user.schoolId) || state.schools[0];
  }

  const selectedId = Number(state.selectedSettingsSchoolId);
  const selectedSchool = state.schools.find((school) => school.SchoolID === selectedId);

  return selectedSchool || state.schools[0];
}

function renderAccount() {
  const school = getAccountSchool();
  const isAdmin = state.user?.role === 'admin';

  elements.accountSchoolSelector.classList.toggle('hidden', !isAdmin);
  elements.accountSchoolForm.classList.toggle('hidden', !school);
  document.getElementById('profileSchoolName').textContent = school?.SchoolName || '-';

  if (!school) {
    return;
  }

  if (isAdmin) {
    elements.accountSchoolSelect.innerHTML = state.schools.map((item) => `
      <option value="${item.SchoolID}">${escapeHtml(item.SchoolName)}</option>
    `).join('');
    elements.accountSchoolSelect.value = String(school.SchoolID);
  }

  const fields = elements.accountSchoolForm.elements;
  fields.schoolName.value = school.SchoolName || '';
  fields.logoUrl.value = school.LogoUrl || '';
  elements.accountLogoUrlInput.value = isUploadedLogo(school.LogoUrl) ? '' : school.LogoUrl || '';
  elements.accountLogoFileInput.value = '';
  fields.contactPerson.value = school.ContactPerson || '';
  fields.contactEmail.value = school.ContactEmail || '';
  fields.contactPhone.value = school.ContactPhone || '';
  fields.registrationNumber.value = school.RegistrationNumber || '';
  fields.website.value = school.Website || '';
  fields.address.value = school.Address || '';

  elements.accountSchoolStatus.textContent = school.SubscriptionStatus || 'Active';
  elements.accountSchoolStatus.className = school.SubscriptionStatus === 'Suspended' ? 'badge danger' : 'badge';
  setLogoSource(isUploadedLogo(school.LogoUrl) ? 'upload' : 'link');
  setLogoPreview(school.SchoolName, school.LogoUrl);
}

function renderSchoolUsers() {
  const school = getAccountSchool();
  const canManageUsers = userCan('school.staff.view|school.staff.manage|school.staff.permissions.manage');

  elements.schoolUsersPanel.classList.toggle('hidden', !school || !canManageUsers);

  if (!school) {
    elements.schoolUsersTable.innerHTML = '<tr><td colspan="5">Select or create a school before adding users.</td></tr>';
    return;
  }

  if (!canManageUsers) {
    elements.schoolUsersTable.innerHTML = '';
    return;
  }

  elements.schoolUsersTable.innerHTML = state.schoolUsers.map((user) => `
    <tr>
      <td>${escapeHtml(user.Username || user.username)}</td>
      <td>${escapeHtml(user.Email || user.email)}</td>
      <td>
        <span class="badge">${escapeHtml(user.Role || user.role || 'school')}</span>
        <span class="table-subtext">${(user.IsActive ?? user.isActive) === false ? 'Inactive' : 'Active'}</span>
      </td>
      <td>
        ${assignedRoleBadges(user.UserID || user.userId)}
      </td>
      <td>
        ${dateOnly(user.CreatedDate || user.createdDate)}
        <div class="actions stacked-actions">
          ${(user.IsActive ?? user.isActive) === false
            ? `<button class="ghost-button" data-action="activate-user" data-id="${user.UserID || user.userId}" type="button">Activate</button>`
            : `<button class="danger-button" data-action="deactivate-user" data-id="${user.UserID || user.userId}" type="button">Deactivate</button>`}
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No additional users yet.</td></tr>';
}

function assignedRoleBadges(userId) {
  const roles = state.schoolUserRoles[userId] || [];
  if (!roles.length) {
    return '<span class="badge muted">No access role</span>';
  }
  return roles.map((role) => `<span class="badge muted role-badge">${escapeHtml(role.RoleName || '-')}</span>`).join('');
}

function renderAuditLogs() {
  elements.auditLogsTable.innerHTML = state.auditLogs.map((log) => `
    <tr>
      <td>${dateOnly(log.CreatedDate)}</td>
      <td>
        <strong>${escapeHtml(log.EntityName)}</strong>
        <span class="table-subtext">${escapeHtml(log.EntityID)}</span>
      </td>
      <td>${escapeHtml(log.Action)}</td>
      <td>${escapeHtml(log.UserID || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No audit activity yet.</td></tr>';
}

function auditUserLabel(log) {
  return log.Username || log.Email || log.UserID || '-';
}

function renderFinanceAuditLogs() {
  if (!elements.financeAuditTable) {
    return;
  }

  elements.financeAuditTable.innerHTML = state.financeAuditLogs.map((log) => `
    <tr>
      <td>${dateOnly(log.CreatedDate)}</td>
      <td>
        <strong>${escapeHtml(log.EntityName || '-')}</strong>
        <span class="table-subtext">${escapeHtml(log.EntityID || '-')}</span>
      </td>
      <td>${escapeHtml(log.Action || '-')}</td>
      <td>${escapeHtml(log.EntityID || '-')}</td>
      <td>${escapeHtml(auditUserLabel(log))}</td>
    </tr>
  `).join('') || '<tr><td colspan="5">No sensitive finance activity found for the selected filters.</td></tr>';
}

function normalizePermissionKey(permission) {
  return String(permission || '').trim().toLowerCase();
}

function roleId(role) {
  return Number(role?.StaffRoleID || role?.staffRoleId || 0);
}

function rolePermissions(role) {
  try {
    const parsed = JSON.parse(role.Permissions || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizePermissionKey).filter(Boolean) : [];
  } catch (error) {
    return String(role.Permissions || '')
      .split(',')
      .map(normalizePermissionKey)
      .filter(Boolean);
  }
}

function expandedPermissionSet(permissions) {
  const set = new Set(permissions);
  [...set].forEach((permission) => {
    (PERMISSION_ALIAS_MAP[permission] || []).forEach((alias) => set.add(normalizePermissionKey(alias)));
  });
  return set;
}

function permissionStatus(permissions, keys) {
  const set = permissions instanceof Set ? permissions : expandedPermissionSet(permissions);
  const can = keys.some((key) => set.has(normalizePermissionKey(key)));
  return `<span class="${can ? 'badge' : 'badge muted'}">${can ? 'Allowed' : 'Blocked'}</span>`;
}

function permissionGroupAllowed(role, group) {
  return group.permissions.some((permission) => expandedPermissionSet(rolePermissions(role)).has(normalizePermissionKey(permission)));
}

function editablePermissionKeys() {
  const keys = new Set();
  PERMISSION_GROUPS.forEach((group) => group.permissions.forEach((permission) => keys.add(normalizePermissionKey(permission))));
  Object.entries(PERMISSION_ALIAS_MAP).forEach(([alias, permissions]) => {
    keys.add(normalizePermissionKey(alias));
    permissions.forEach((permission) => keys.add(normalizePermissionKey(permission)));
  });
  return keys;
}

function selectedPermissionRole() {
  const selectedId = Number(elements.permissionRoleSelect?.value || state.editingStaffRoleId || 0);
  return state.staffRoles.find((role) => roleId(role) === selectedId) || null;
}

function setPermissionDraftFromRole(role) {
  state.editingStaffRoleId = role ? roleId(role) : null;
  state.permissionDraft = Object.fromEntries(PERMISSION_GROUPS.map((group) => [
    group.key,
    role ? permissionGroupAllowed(role, group) : false
  ]));
}

function applyPermissionTemplate(templateKey) {
  const template = ROLE_PERMISSION_TEMPLATES[templateKey];
  if (!template || !elements.staffRolePermissionForm) return;

  if (!state.editingStaffRoleId) {
    setFormValue(elements.staffRolePermissionForm, 'roleName', template.roleName);
    setFormValue(elements.staffRolePermissionForm, 'description', template.description);
  }

  const allowed = new Set(template.allowed || []);
  state.permissionDraft = Object.fromEntries(PERMISSION_GROUPS.map((group) => [group.key, allowed.has(group.key)]));
  renderPermissionEditor();
  renderPermissionMatrix();
}

function startNewPermissionRole(templateKey = 'teacher') {
  state.editingStaffRoleId = null;
  const template = ROLE_PERMISSION_TEMPLATES[templateKey] || ROLE_PERMISSION_TEMPLATES.teacher;
  elements.staffRolePermissionForm?.reset();
  if (elements.permissionRoleSelect) elements.permissionRoleSelect.value = '';
  setFormValue(elements.staffRolePermissionForm, 'roleName', template.roleName);
  setFormValue(elements.staffRolePermissionForm, 'description', template.description);
  const allowed = new Set(template.allowed || []);
  state.permissionDraft = Object.fromEntries(PERMISSION_GROUPS.map((group) => [group.key, allowed.has(group.key)]));
  renderPermissionEditor();
}

function permissionDraftPayload(role) {
  const editable = editablePermissionKeys();
  const base = role ? rolePermissions(role).filter((permission) => !editable.has(permission)) : [];
  const next = new Set(base);
  PERMISSION_GROUPS.forEach((group) => {
    if (state.permissionDraft[group.key]) {
      group.permissions.forEach((permission) => next.add(normalizePermissionKey(permission)));
    }
  });
  return Array.from(next).sort();
}

function renderSchoolUserRoleOptions() {
  if (!elements.schoolUserRoleSelect) return;
  elements.schoolUserRoleSelect.innerHTML = '<option value="">No access role yet</option>'
    + state.staffRoles.map((role) => `<option value="${roleId(role)}">${escapeHtml(role.RoleName || '-')}</option>`).join('');
}

function renderPermissionRoleOptions() {
  if (!elements.permissionRoleSelect) return;
  elements.permissionRoleSelect.innerHTML = '<option value="">New role</option>'
    + state.staffRoles.map((role) => `<option value="${roleId(role)}">${escapeHtml(role.RoleName || '-')}</option>`).join('');

  if (!state.editingStaffRoleId && !Object.keys(state.permissionDraft || {}).length && state.staffRoles[0]) {
    setPermissionDraftFromRole(state.staffRoles[0]);
  }

  elements.permissionRoleSelect.value = state.editingStaffRoleId ? String(state.editingStaffRoleId) : '';
}

function renderPermissionEditor() {
  if (!elements.permissionEditorList || !elements.staffRolePermissionForm) return;

  const role = selectedPermissionRole();
  if (role) {
    setFormValue(elements.staffRolePermissionForm, 'roleName', role.RoleName || '');
    setFormValue(elements.staffRolePermissionForm, 'description', role.Description || '');
  }

  elements.permissionEditorList.innerHTML = PERMISSION_GROUPS.map((group) => {
    const allowed = Boolean(state.permissionDraft[group.key]);
    return `
      <div class="permission-toggle-row">
        <div>
          <strong>${escapeHtml(group.label)}</strong>
          <span class="table-subtext">${escapeHtml(group.area)}${group.sensitive ? ' - Sensitive' : ''}</span>
          <span class="table-subtext">${escapeHtml(group.description)}</span>
        </div>
        <div class="permission-toggle" role="group" aria-label="${escapeHtml(group.label)} access">
          <button class="${allowed ? 'primary-button' : 'ghost-button'}" data-action="set-permission-toggle" data-group-key="${group.key}" data-allowed="true" type="button">Allowed</button>
          <button class="${allowed ? 'ghost-button' : 'secondary-button'}" data-action="set-permission-toggle" data-group-key="${group.key}" data-allowed="false" type="button">Blocked</button>
        </div>
      </div>
    `;
  }).join('');
}

function permissionMatrixSearchMatch(group, query) {
  if (!query) {
    return true;
  }

  const normalizedQuery = String(query || '').trim().toLowerCase();
  const haystack = [
    group.label,
    group.area,
    group.description,
    ...(group.permissions || [])
  ].join(' ').toLowerCase();

  return haystack.includes(normalizedQuery);
}

function renderPermissionMatrix() {
  if (!elements.permissionMatrixTable) {
    return;
  }

  renderSchoolUserRoleOptions();
  renderPermissionRoleOptions();
  renderPermissionEditor();
  const query = String(state.permissionMatrixSearchQuery || '').trim().toLowerCase();
  const filteredGroups = PERMISSION_GROUPS.filter((group) => permissionMatrixSearchMatch(group, query));
  if (elements.clearPermissionMatrixSearchButton) {
    elements.clearPermissionMatrixSearchButton.disabled = !query;
  }

  if (!state.staffRoles.length) {
    if (elements.permissionMatrixHead) {
      elements.permissionMatrixHead.innerHTML = '<tr><th>Access area</th><th>Status</th></tr>';
    }
    elements.permissionMatrixTable.innerHTML = '<tr><td colspan="2">No staff roles have been configured yet.</td></tr>';
    return;
  }

  if (elements.permissionMatrixHead) {
    elements.permissionMatrixHead.innerHTML = `
      <tr>
        <th>Access area</th>
        ${state.staffRoles.map((role) => `<th>${escapeHtml(role.RoleName || '-')}</th>`).join('')}
      </tr>
    `;
  }

  if (!filteredGroups.length) {
    elements.permissionMatrixTable.innerHTML = '<tr><td colspan="99">No permission area matches that search.</td></tr>';
    return;
  }

  elements.permissionMatrixTable.innerHTML = filteredGroups.map((group) => `
    <tr>
      <td>
        <strong>${escapeHtml(group.label)}</strong>
        <span class="table-subtext">${escapeHtml(group.area)}${group.sensitive ? ' - Sensitive' : ''}</span>
      </td>
      ${state.staffRoles.map((role) => `<td>${permissionStatus(rolePermissions(role), group.permissions)}</td>`).join('')}
    </tr>
  `).join('');
}

function renderDashboardWarnings() {
  if (!elements.dashboardWarningsPanel || !elements.dashboardWarningsList) {
    return;
  }

  const warnings = state.dashboardWarnings || [];
  elements.dashboardWarningsPanel.classList.toggle('hidden', warnings.length === 0);
  elements.dashboardWarningsList.innerHTML = warnings.map((warning) => `
    <div class="warning-item">
      <strong>${escapeHtml(warning.title || '-')}</strong>
      <span class="badge warn">${escapeHtml(warning.count || 0)}</span>
      <p>${escapeHtml(warning.detail || '')}</p>
    </div>
  `).join('');
}

function renderMatchSuggestions() {
  if (!elements.matchSuggestionsTable) {
    return;
  }

  elements.matchSuggestionsTable.innerHTML = state.matchSuggestions.map((suggestion) => `
    <tr>
      <td>
        <strong>${escapeHtml(suggestion.transactionReference || 'Bank transaction')}</strong>
        <span class="table-subtext">${escapeHtml(suggestion.reason || '')}</span>
      </td>
      <td>
        <strong>${escapeHtml(suggestion.invoiceNumber)}</strong>
        <span class="table-subtext">${escapeHtml(suggestion.invoiceStudent || '')}</span>
      </td>
      <td>${money(suggestion.amount, getSettingsSchool())}</td>
      <td><span class="badge warn">${escapeHtml(`${suggestion.score}%`)}</span></td>
      <td>
        <button class="ghost-button" data-action="approve-bank-match" data-transaction-id="${suggestion.transactionId}" data-invoice-id="${suggestion.invoiceId}" type="button">
          Approve match
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No suggested matches need review.</td></tr>';
}

function isUploadedLogo(value) {
  return String(value || '').startsWith('data:image/');
}

function setLogoSource(source) {
  const isUpload = source === 'upload';

  elements.accountLogoUrlInput.disabled = isUpload;
  elements.accountLogoFileInput.disabled = !isUpload;
  elements.logoLinkField.classList.toggle('hidden', isUpload);
  elements.logoUploadField.classList.toggle('hidden', !isUpload);
  document.querySelectorAll('[data-logo-source]').forEach((button) => {
    button.classList.toggle('active', button.dataset.logoSource === source);
  });
}

function schoolInitials(name) {
  const words = String(name || 'School')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('') || 'SC';
}

function setLogoPreview(name, logoUrl) {
  elements.accountLogoPreview.innerHTML = '';

  if (!logoUrl) {
    elements.accountLogoPreview.textContent = schoolInitials(name);
    return;
  }

  const image = document.createElement('img');
  image.src = logoUrl;
  image.alt = `${name || 'School'} logo`;
  image.onerror = () => {
    elements.accountLogoPreview.innerHTML = '';
    elements.accountLogoPreview.textContent = schoolInitials(name);
  };

  elements.accountLogoPreview.appendChild(image);
}

function renderSettings() {
  const school = getSettingsSchool();
  const isAdmin = state.user?.role === 'admin';

  elements.settingsSchoolSelector.classList.toggle('hidden', !isAdmin);
  elements.settingsForm.classList.toggle('hidden', !school);

  if (!school) {
    document.getElementById('settingsSchoolName').textContent = '-';
    document.getElementById('settingsCurrencyLabel').textContent = currencyLabel('ZAR');
    return;
  }

  if (isAdmin) {
    elements.settingsSchoolSelect.innerHTML = state.schools.map((item) => `
      <option value="${item.SchoolID}">${escapeHtml(item.SchoolName)}</option>
    `).join('');
    elements.settingsSchoolSelect.value = String(school.SchoolID);
  }

  elements.currencySelect.innerHTML = CURRENCIES.map((currency) => {
    const displayCurrency = currencyByCode(currency.code);
    return `<option value="${displayCurrency.code}">${escapeHtml(`${displayCurrency.name} - ${displayCurrency.symbol}`)}</option>`;
  }).join('');
  elements.currencySelect.value = school.CurrencyCode || 'ZAR';

  document.getElementById('settingsSchoolName').textContent = school.SchoolName || '-';
  document.getElementById('settingsCurrencyLabel').textContent = currencyLabel(school.CurrencyCode || 'ZAR');
}

function renderAdminControls() {
  const canManageSchoolFinance = state.user?.role === 'school';
  elements.invoiceForm.classList.toggle('hidden', !canManageSchoolFinance);

  document.querySelectorAll('[data-requires-school-finance]').forEach((button) => {
    button.disabled = !canManageSchoolFinance;
    button.classList.toggle('hidden', !canManageSchoolFinance);
  });
}

function switchView(viewName, options = {}) {
  if (!isViewAllowed(viewName)) {
    viewName = 'overview';
  }

  const activeNavView = navViewFor(viewName);

  document.querySelectorAll('.nav-item').forEach((item) => {
    const isActive = item.dataset.view === activeNavView;
    item.classList.toggle('active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `${viewName}View`);
  });

  const route = VIEW_ROUTES[viewName] || '/sms';
  if (window.location.pathname !== route) {
    const historyMethod = options.replace ? 'replaceState' : 'pushState';
    window.history[historyMethod]({}, '', route);
  }

  elements.viewTitle.textContent = VIEW_TITLES[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
  elements.viewTitle.focus({ preventScroll: true });
}

function switchFinanceTab(tabName) {
  document.querySelectorAll('.finance-tab').forEach((button) => {
    const isActive = button.dataset.financeTab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('.finance-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `finance${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Panel`);
  });

  elements.viewTitle.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('[data-settings-tab]').forEach((button) => {
    const isActive = button.dataset.settingsTab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('[data-settings-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.settingsPanel === tabName);
  });
}

function formData(form) {
  const data = {};
  const formEntries = new FormData(form);

  for (const [key, value] of formEntries.entries()) {
    if (data[key] === undefined) {
      data[key] = value;
    } else if (Array.isArray(data[key])) {
      data[key].push(value);
    } else {
      data[key] = [data[key], value];
    }
  }

  form.querySelectorAll('select[multiple][name]').forEach((select) => {
    data[select.name] = Array.from(select.selectedOptions).map((option) => option.value);
  });

  return data;
}

function validateUsername(username) {
  return /^[a-z0-9._-]{3,50}$/.test(String(username || '').trim().toLowerCase());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}





elements.accountSchoolSelect.addEventListener('change', async () => {
  state.selectedAccountSchoolId = Number(elements.accountSchoolSelect.value);
  renderAccount();
  await refreshSchoolUsers();
  renderSchoolUsers();
});

document.querySelectorAll('[data-logo-source]').forEach((button) => {
  button.addEventListener('click', () => {
    setLogoSource(button.dataset.logoSource);

    if (button.dataset.logoSource === 'link') {
      elements.accountSchoolForm.elements.logoUrl.value = elements.accountLogoUrlInput.value;
      setLogoPreview(elements.accountSchoolForm.elements.schoolName.value, elements.accountLogoUrlInput.value);
      return;
    }

    elements.accountLogoUrlInput.value = '';
  });
});

elements.accountLogoUrlInput.addEventListener('input', () => {
  const fields = elements.accountSchoolForm.elements;
  fields.logoUrl.value = elements.accountLogoUrlInput.value;
  setLogoPreview(fields.schoolName.value, fields.logoUrl.value);
});

elements.accountLogoFileInput.addEventListener('change', () => {
  const file = elements.accountLogoFileInput.files[0];

  if (!file) {
    return;
  }

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    elements.accountLogoFileInput.value = '';
    showToast('Logo must be a JPG or PNG file');
    return;
  }

  if (file.size > 1500000) {
    elements.accountLogoFileInput.value = '';
    showToast('Logo file must be smaller than 1.5 MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const fields = elements.accountSchoolForm.elements;
    fields.logoUrl.value = reader.result;
    setLogoPreview(fields.schoolName.value, fields.logoUrl.value);
  };
  reader.readAsDataURL(file);
});

elements.accountSchoolForm.elements.schoolName.addEventListener('input', () => {
  const fields = elements.accountSchoolForm.elements;

  if (!fields.logoUrl.value) {
    setLogoPreview(fields.schoolName.value, null);
  }
});

elements.settingsSchoolSelect.addEventListener('change', () => {
  state.selectedSettingsSchoolId = Number(elements.settingsSchoolSelect.value);
  renderData();
});

elements.billingCategorySchoolSelect?.addEventListener('change', () => {
  state.selectedSettingsSchoolId = Number(elements.billingCategorySchoolSelect.value);
  renderData();
});

elements.currencySelect.addEventListener('change', () => {
  const school = getSettingsSchool();

  if (!school) {
    return;
  }

  const selectedCurrency = currencyByCode(elements.currencySelect.value);
  document.getElementById('settingsCurrencyLabel').textContent = currencyLabel(selectedCurrency.code);
});

elements.accountSchoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.accountSchoolForm, true, 'Saving...');
    const school = getAccountSchool();

    if (!school) {
      throw new Error('No school account is available to update');
    }

    const payload = formData(elements.accountSchoolForm);
    delete payload.schoolId;

    await api(`/api/schools/${school.SchoolID}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    await refreshData();
    showToast('School account saved');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.accountSchoolForm, false);
  }
});

elements.permissionRoleSelect?.addEventListener('change', () => {
  const role = selectedPermissionRole();
  if (role) {
    setPermissionDraftFromRole(role);
  } else {
    startNewPermissionRole();
  }
  renderPermissionEditor();
});

elements.permissionMatrixSearchInput?.addEventListener('input', () => {
  state.permissionMatrixSearchQuery = elements.permissionMatrixSearchInput.value;
  renderPermissionMatrix();
});

elements.clearPermissionMatrixSearchButton?.addEventListener('click', () => {
  state.permissionMatrixSearchQuery = '';
  if (elements.permissionMatrixSearchInput) {
    elements.permissionMatrixSearchInput.value = '';
  }
  renderPermissionMatrix();
});

elements.staffRolePermissionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const form = elements.staffRolePermissionForm;
    const role = selectedPermissionRole();
    const roleName = form.elements.roleName.value.trim();
    const description = form.elements.description.value.trim();

    if (!roleName) {
      throw new Error('Role name is required');
    }

    const payload = {
      roleName,
      description,
      permissions: permissionDraftPayload(role)
    };

    setFormBusy(form, true, 'Saving...');

    if (role && state.editingStaffRoleId) {
      await api(`/api/hr/roles/${state.editingStaffRoleId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, isActive: true })
      });
    } else {
      const created = await api('/api/hr/roles', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.editingStaffRoleId = roleId(created);
    }

    await refreshStaffRoles();
    await refreshSchoolUsers();
    renderSchoolUsers();
    renderEmployeeRoleOptions();
    renderPermissionMatrix();
    showToast('Permissions saved');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.staffRolePermissionForm, false);
  }
});

elements.schoolUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const school = getAccountSchool();

    if (!school) {
      throw new Error('Select or create a school before adding users');
    }

    setFormBusy(elements.schoolUserForm, true, 'Adding...');
    const payload = {
      ...formData(elements.schoolUserForm),
      schoolId: school.SchoolID
    };
    const staffRoleId = Number(payload.staffRoleId || 0);
    delete payload.staffRoleId;

    const user = await api('/api/users/school-users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (staffRoleId && user.userId) {
      await api('/api/hr/roles/assign', {
        method: 'POST',
        body: JSON.stringify({ userId: user.userId, staffRoleId })
      });
    }

    elements.schoolUserForm.reset();
    renderSchoolUserRoleOptions();
    await refreshSchoolUsers();
    renderSchoolUsers();
    showToast('User added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.schoolUserForm, false);
  }
});

elements.settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.settingsForm, true, 'Saving...');
    const school = getSettingsSchool();

    if (!school) {
      throw new Error('No school settings are available to update');
    }

    await api(`/api/schools/${school.SchoolID}`, {
      method: 'PUT',
      body: JSON.stringify({
        schoolName: school.SchoolName,
        address: school.Address,
        logoUrl: school.LogoUrl,
        contactPerson: school.ContactPerson,
        contactEmail: school.ContactEmail,
        contactPhone: school.ContactPhone,
        registrationNumber: school.RegistrationNumber,
        website: school.Website,
        currencyCode: elements.currencySelect.value
      })
    });

    await refreshData();
    showToast('Settings saved');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.settingsForm, false);
  }
});

elements.invoiceForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.invoiceForm, true, 'Creating...');
    const payload = formData(elements.invoiceForm);
    payload.schoolId = Number(payload.schoolId);
    payload.studentId = Number(payload.studentId);
    payload.amount = Number(payload.amount);
    payload.dueDate = payload.dueDate || null;

    if (!payload.schoolId) {
      throw new Error('Create a school before creating invoices');
    }

    if (!payload.studentId) {
      throw new Error('Select a student before creating invoices');
    }

    await api('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.invoiceForm.reset();
    await refreshData();
    showToast('Invoice created');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.invoiceForm, false);
  }
});

if (elements.familyForm) {
  elements.familyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showToast('Parents are added from School / Register Learner');
  });
}

if (elements.studentForm) {
  elements.studentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const schoolId = currentSchoolId();

      if (!schoolId) {
        throw new Error('Create a school before adding students');
      }

      if (!elements.studentFamilySelect?.value) {
        throw new Error('Add a family before adding students');
      }

      setFormBusy(elements.studentForm, true, 'Adding...');
      const payload = {
        ...formData(elements.studentForm),
        schoolId,
        familyId: Number(elements.studentFamilySelect.value)
      };
      payload.billingCategoryId = Number(payload.billingCategoryId);
      payload.dateOfBirth = payload.dateOfBirth || null;

      await api('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      elements.studentForm.reset();
      await refreshData();
      showToast('Student added');
    } catch (error) {
      showToast(error.message);
    } finally {
      setFormBusy(elements.studentForm, false);
    }
  });
}

elements.billingCategoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.billingCategoryForm, true, 'Saving...');
    const schoolId = Number(elements.billingCategorySchoolSelect?.value || currentSchoolId());

    if (!schoolId) {
      throw new Error('Select a school before saving billing categories');
    }

    const payload = formData(elements.billingCategoryForm);
    payload.schoolId = schoolId;
    payload.baseAmount = Number(payload.baseAmount || 0);
    payload.frequency = String(payload.frequency || '').trim();
    delete payload.billingCategoryId;

    const categoryId = state.editingBillingCategoryId;
    const path = categoryId ? `/api/billing-categories/${categoryId}` : '/api/billing-categories';
    const method = categoryId ? 'PUT' : 'POST';

    await api(path, {
      method,
      body: JSON.stringify(payload)
    });

    resetBillingCategoryForm();
    await refreshData();
    showToast(categoryId ? 'Billing category updated' : 'Billing category added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.billingCategoryForm, false);
  }
});

elements.cancelBillingCategoryEditButton.addEventListener('click', resetBillingCategoryForm);

elements.classForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const isEdit = Boolean(state.editingClassId);
    setFormBusy(elements.classForm, true, isEdit ? 'Saving...' : 'Adding...');
    const payload = formData(elements.classForm);
    payload.teacherId = payload.teacherId ? Number(payload.teacherId) : null;
    payload.capacity = payload.capacity ? Number(payload.capacity) : null;
    payload.classYear = payload.classYear ? Number(payload.classYear) : new Date().getFullYear();

    if (isEdit) {
      await api('/api/classes/' + state.editingClassId, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      resetClassForm();
      showToast('Class updated');
    } else {
      await api('/api/classes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      elements.classForm.reset();
      showToast('Class added');
    }

    await refreshClasses();
    renderClasses();
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.classForm, false);
  }
});

elements.classSearchInput.addEventListener('input', renderClasses);

[
  elements.classNameFilterInput,
  elements.classTeacherFilterInput,
  elements.classLearnerFilterInput,
  elements.classStatusFilterInput,
  elements.classYearFilterInput
].forEach((input) => {
  input?.addEventListener('input', renderClasses);
  input?.addEventListener('change', renderClasses);
});

if (elements.classYearFilterInput && !elements.classYearFilterInput.value) {
  elements.classYearFilterInput.value = new Date().getFullYear();
}

elements.openClassDialogButton?.addEventListener('click', openClassDialog);
elements.closeClassDialogButton?.addEventListener('click', resetClassForm);

if (elements.cancelClassEditButton) {
  elements.cancelClassEditButton.addEventListener('click', resetClassForm);
}

elements.attendanceDateInput.addEventListener('change', async () => {
  await refreshAttendance();
  renderAttendance();
});

elements.attendanceSearchTypeSelect?.addEventListener('change', () => {
  state.attendanceSearchType = elements.attendanceSearchTypeSelect.value;
  renderAttendance();
});

elements.attendanceSearchInput?.addEventListener('input', () => {
  state.attendanceSearchQuery = elements.attendanceSearchInput.value;
  renderAttendance();
});

elements.attendancePageSize?.addEventListener('change', () => {
  state.attendancePageSize = Number(elements.attendancePageSize.value);
  renderAttendance();
});

elements.attendanceStatusFilterInput?.addEventListener('change', () => {
  state.attendanceStatusFilter = elements.attendanceStatusFilterInput.value;
  renderAttendance();
});

elements.attendanceClassFilterInput?.addEventListener('change', () => {
  state.attendanceClassFilter = elements.attendanceClassFilterInput.value;
  renderAttendance();
});

elements.openAttendanceEditButton?.addEventListener('click', openAttendanceEditDialog);
elements.closeAttendanceEditDialogButton?.addEventListener('click', closeAttendanceEditDialog);
elements.cancelAttendanceEditButton?.addEventListener('click', closeAttendanceEditDialog);
elements.viewAttendanceButton?.addEventListener('click', openAttendanceDialog);
elements.loadAttendanceHistoryButton?.addEventListener('click', async () => {
  await refreshCompletedAttendance();
  renderAttendance();
});
elements.closeAttendanceDialogButton?.addEventListener('click', closeAttendanceDialog);
elements.cancelAttendanceDialogButton?.addEventListener('click', closeAttendanceDialog);
elements.closeAttendanceUndoDialogButton?.addEventListener('click', closeAttendanceUndoDialog);
elements.cancelAttendanceUndoButton?.addEventListener('click', closeAttendanceUndoDialog);
elements.undoArrivalButton?.addEventListener('click', () => undoAttendanceTime('arrival'));
elements.undoDepartureButton?.addEventListener('click', () => undoAttendanceTime('departure'));

elements.attendanceClassTabs?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-attendance-class]');
  if (!button) {
    return;
  }

  state.selectedAttendanceClassKey = button.dataset.attendanceClass;
  renderAttendance();
});

elements.attendanceTable?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const row = button.closest('tr');
  if (button.dataset.action === 'save-attendance-row') {
    saveAttendanceRow(row);
  }
});

elements.attendanceTable?.addEventListener('change', (event) => {
  const select = event.target.closest('[data-attendance-field="status"]');
  if (!select) return;
  const row = select.closest('tr');
  const isAbsent = select.value === 'Absent';
  const arrivalInput = row.querySelector('[data-attendance-field="arrivalTime"]');
  const departureInput = row.querySelector('[data-attendance-field="departureTime"]');
  if (arrivalInput) { arrivalInput.disabled = isAbsent; if (isAbsent) arrivalInput.value = ''; }
  if (departureInput) { departureInput.disabled = isAbsent; if (isAbsent) departureInput.value = ''; }
});

// Autosave removed - attendance saves only via Save button

// Autosave on time input removed - saves only via Save button

elements.attendanceForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    if (!elements.attendanceStudentSelect.value) {
      throw new Error('Select a student before saving attendance');
    }

    setFormBusy(elements.attendanceForm, true, 'Saving...');
    const payload = formData(elements.attendanceForm);
    const selectedStudent = state.students.find((student) => Number(student.StudentID) === Number(payload.studentId));
    const studentClass = selectedStudent?.ClassName
      ? state.classes.find((item) => String(item.ClassName || '').trim().toLowerCase() === String(selectedStudent.ClassName).trim().toLowerCase())
      : null;
    if (studentClass?.ClassID) {
      payload.classId = studentClass.ClassID;
    }

    await api('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await refreshAttendance();
    renderAttendance();
    closeAttendanceEditDialog();
    showToast('Attendance saved');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.attendanceForm, false);
  }
});

elements.employeeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    requireFields(elements.employeeForm, ['firstName', 'lastName', 'startDate']);
    setFormBusy(elements.employeeForm, true, state.editingEmployeeId ? 'Saving...' : 'Adding...');
    const payload = formData(elements.employeeForm);
    payload.salary = Number(payload.salary || 0);
    payload.leaveBalance = Number(payload.leaveBalance || 21);
    payload.standardAllowances = Number(payload.standardAllowances || 0);
    payload.standardDeductions = Number(payload.standardDeductions || 0);
    payload.taxPaye = Number(payload.taxPaye || 0);
    payload.uifDeduction = Number(payload.uifDeduction || 0);
    payload.isActive = payload.isActive === true || payload.isActive === 'true';
    delete payload.employeeId;

    const isEditing = Boolean(state.editingEmployeeId);
    const path = isEditing ? `/api/employees/${state.editingEmployeeId}` : '/api/employees';
    const method = isEditing ? 'PUT' : 'POST';

    await api(path, {
      method,
      body: JSON.stringify(payload)
    });

    closeEmployeeDialog();
    await refreshData();
    showToast(isEditing ? 'Staff member updated' : 'Staff member added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.employeeForm, false);
  }
});

elements.leaveForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    if (elements.leaveEmployeeSelect && !elements.leaveEmployeeSelect.disabled && !elements.leaveEmployeeSelect.value) {
      showToast('Select an employee for this leave record');
      return;
    }
    setFormBusy(elements.leaveForm, true, 'Saving...');
    await api('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(formData(elements.leaveForm))
    });

    elements.leaveForm.reset();
    await refreshData();
    showToast('Leave captured');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.leaveForm, false);
  }
});

elements.payslipForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    if (!elements.payslipEmployeeSelect.value) {
      throw new Error('Add staff before creating payslips');
    }
    requireFields(elements.payslipForm, ['employeeId', 'payPeriod', 'basicSalary', 'paymentDate']);

    setFormBusy(elements.payslipForm, true, 'Creating...');
    const payload = formData(elements.payslipForm);
    payload.employeeId = Number(payload.employeeId);
    payload.basicSalary = Number(payload.basicSalary || 0);
    payload.allowances = Number(payload.allowances || 0);
    payload.overtime = Number(payload.overtime || 0);
    payload.bonus = Number(payload.bonus || 0);
    payload.leaveDeduction = Number(payload.leaveDeduction || 0);
    payload.taxPaye = Number(payload.taxPaye || 0);
    payload.uifDeduction = Number(payload.uifDeduction || 0);
    payload.otherDeductions = Number(payload.otherDeductions || 0);

    await api('/api/payslips', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.payslipForm.reset();
    await refreshData();
    showToast('Payslip created');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.payslipForm, false);
  }
});

elements.payslipEmployeeSelect?.addEventListener('change', applySelectedEmployeePayrollDefaults);

[
  elements.staffSearchTypeInput,
  elements.staffSearchInput,
  elements.staffStatusFilterInput,
  elements.staffRoleFilterInput
].forEach((input) => {
  input?.addEventListener('input', renderEmployees);
  input?.addEventListener('change', renderEmployees);
});

elements.payslipEditForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = elements.payslipEditForm;
  const payslipId = Number(form.elements.payslipId.value);

  try {
    requireFields(form, [
      'basicSalary',
      'allowances',
      'overtime',
      'bonus',
      'leaveDeduction',
      'taxPaye',
      'uifDeduction',
      'otherDeductions',
      'paymentDate'
    ]);
    setFormBusy(form, true, 'Saving...');
    const payload = formData(form);
    delete payload.payslipId;
    [
      'basicSalary',
      'allowances',
      'overtime',
      'bonus',
      'leaveDeduction',
      'taxPaye',
      'uifDeduction',
      'otherDeductions'
    ].forEach((field) => {
      payload[field] = Number(payload[field] || 0);
    });

    await api(`/api/payslips/${payslipId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    closePayslipDialog();
    await refreshData();
    showToast('Payslip updated');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

elements.departureReasonSelect.addEventListener('change', () => {
  elements.departureOtherGroup.classList.toggle('hidden', elements.departureReasonSelect.value !== 'Other');
});

elements.cancelDepartureButton.addEventListener('click', hideDepartureForm);

elements.departureForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    if (!state.selectedDepartureStudentId) {
      throw new Error('Select a student to mark inactive');
    }

    setFormBusy(elements.departureForm, true, 'Saving...');
    await api(`/api/students/${state.selectedDepartureStudentId}/inactivate`, {
      method: 'PUT',
      body: JSON.stringify(formData(elements.departureForm))
    });

    hideDepartureForm();
    await refreshData();
    showToast('Student marked inactive');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.departureForm, false);
  }
});

elements.studentEditForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = elements.studentEditForm;
  try {
    requireFields(form, [
      'firstName',
      'lastName',
      'enrolledDate',
      'billingDate',
      'familyName',
      'primaryParentName',
      'primaryParentPhone',
      'familyHomeAddress',
      'responsiblePayerName',
      'emergencyContactName',
      'emergencyContactPhone'
    ]);

    const billingCategoryIds = selectedValues(elements.studentEditBillingSelect);
    if (!billingCategoryIds.length) {
      throw new Error('Select at least one billing category');
    }

    const studentId = Number(form.elements.studentId.value);
    const familyId = Number(form.elements.familyId.value);
    setFormBusy(form, true, 'Saving...');

    await api(`/api/families/${familyId}`, {
      method: 'PUT',
      body: JSON.stringify(familyPayloadFromForm(form))
    });

    const data = formData(form);
    await api(`/api/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        familyId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth || null,
        homePhone: data.homePhone,
          homeAddress: data.homeAddress,
          className: data.className,
          currentAcademicYear: academicYearForClassName(data.className, student.CurrentAcademicYear || currentCalendarYear()),
          billingDate: data.billingDate,
        enrolledDate: data.enrolledDate,
        medicalNotes: data.medicalNotes,
        billingCategoryId: billingCategoryIds[0],
        billingCategoryIds,
        responsiblePayerType: data.responsiblePayerType,
        responsiblePayerName: data.responsiblePayerName,
        responsiblePayerPhone: data.responsiblePayerPhone,
        responsiblePayerEmail: data.responsiblePayerEmail
      })
    });

    closeStudentEditDialog();
    await refreshData();
    switchView('students');
    showToast('Learner updated');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

elements.studentEditResponsiblePayerTypeSelect?.addEventListener('change', () => {
  syncResponsiblePayerFields(elements.studentEditForm, { preserveOther: false });
});

['primaryParentName', 'primaryParentPhone', 'primaryParentEmail', 'secondaryParentName', 'secondaryParentPhone', 'secondaryParentEmail'].forEach((name) => {
  elements.studentEditForm?.elements?.[name]?.addEventListener('input', () => {
    syncResponsiblePayerFields(elements.studentEditForm, { preserveOther: true });
  });
});

elements.familyEditForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = elements.familyEditForm;
  try {
    requireFields(form, [
      'familyName',
      'primaryParentName',
      'primaryParentPhone',
      'familyHomeAddress',
      'emergencyContactName',
      'emergencyContactPhone'
    ]);

    const familyId = Number(form.elements.familyId.value);
    setFormBusy(form, true, 'Saving...');
    await api(`/api/families/${familyId}`, {
      method: 'PUT',
      body: JSON.stringify(familyPayloadFromForm(form))
    });

    closeFamilyEditDialog();
    await refreshData();
    switchView('parents');
    showToast('Parent details updated');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

elements.closeStudentFinanceDialogButton?.addEventListener('click', closeStudentFinanceDialog);
elements.cancelStudentFinanceButton?.addEventListener('click', closeStudentFinanceDialog);
elements.closeRequiredInfoDialogButton?.addEventListener('click', closeRequiredInfoDialog);
elements.cancelRequiredInfoDialogButton?.addEventListener('click', closeRequiredInfoDialog);
document.getElementById('closeConsentDialogButton')?.addEventListener('click', closeConsentDialog);
document.getElementById('cancelConsentDialogButton')?.addEventListener('click', closeConsentDialog);
document.getElementById('closeConsentDetailDialogButton')?.addEventListener('click', closeConsentDetailDialog);
document.getElementById('cancelConsentDetailDialogButton')?.addEventListener('click', closeConsentDetailDialog);
elements.closeEmployeeDialogButton?.addEventListener('click', closeEmployeeDialog);
elements.cancelEmployeeButton?.addEventListener('click', closeEmployeeDialog);
elements.closePayslipDialogButton?.addEventListener('click', closePayslipDialog);
elements.cancelPayslipButton?.addEventListener('click', closePayslipDialog);
elements.printPayslipButton?.addEventListener('click', async () => {
  if (state.selectedPayslip?.PayslipID) {
    await api(`/api/payslips/${state.selectedPayslip.PayslipID}/export-audit`, { method: 'POST' }).catch(() => null);
  }
  printPayslip(state.selectedPayslip);
});
elements.closeStudentEditDialogButton?.addEventListener('click', closeStudentEditDialog);
elements.cancelStudentEditButton?.addEventListener('click', closeStudentEditDialog);
elements.closeFamilyEditDialogButton?.addEventListener('click', closeFamilyEditDialog);
elements.cancelFamilyEditButton?.addEventListener('click', closeFamilyEditDialog);

elements.studentFinanceDialog?.addEventListener('click', (event) => {
  if (event.target === elements.studentFinanceDialog) {
    closeStudentFinanceDialog();
  }
});

elements.requiredInfoDialog?.addEventListener('click', (event) => {
  if (event.target === elements.requiredInfoDialog) {
    closeRequiredInfoDialog();
  }
});

elements.classDialog?.addEventListener('click', (event) => {
  if (event.target === elements.classDialog) {
    resetClassForm();
  }
});

document.getElementById('consentDialog')?.addEventListener('click', (event) => {
  if (event.target === document.getElementById('consentDialog')) {
    closeConsentDialog();
  }
});

document.getElementById('consentDetailDialog')?.addEventListener('click', (event) => {
  if (event.target === document.getElementById('consentDetailDialog')) {
    closeConsentDetailDialog();
  }
});

elements.employeeDialog?.addEventListener('click', (event) => {
  if (event.target === elements.employeeDialog) {
    closeEmployeeDialog();
  }
});

elements.attendanceEditDialog?.addEventListener('click', (event) => {
  if (event.target === elements.attendanceEditDialog) {
    closeAttendanceEditDialog();
  }
});

elements.attendanceDialog?.addEventListener('click', (event) => {
  if (event.target === elements.attendanceDialog) {
    closeAttendanceDialog();
  }
});

elements.payslipDialog?.addEventListener('click', (event) => {
  if (event.target === elements.payslipDialog) {
    closePayslipDialog();
  }
});

elements.studentEditDialog?.addEventListener('click', (event) => {
  if (event.target === elements.studentEditDialog) {
    closeStudentEditDialog();
  }
});

elements.familyEditDialog?.addEventListener('click', (event) => {
  if (event.target === elements.familyEditDialog) {
    closeFamilyEditDialog();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && elements.studentFinanceDialog && !elements.studentFinanceDialog.classList.contains('hidden')) {
    closeStudentFinanceDialog();
  }
  if (event.key === 'Escape' && elements.requiredInfoDialog && !elements.requiredInfoDialog.classList.contains('hidden')) {
    closeRequiredInfoDialog();
  }
  if (event.key === 'Escape' && elements.classDialog && !elements.classDialog.classList.contains('hidden')) {
    resetClassForm();
  }
  const consentDialog = document.getElementById('consentDialog');
  if (event.key === 'Escape' && consentDialog && !consentDialog.classList.contains('hidden')) {
    closeConsentDialog();
  }
  const consentDetailDialog = document.getElementById('consentDetailDialog');
  if (event.key === 'Escape' && consentDetailDialog && !consentDetailDialog.classList.contains('hidden')) {
    closeConsentDetailDialog();
  }
  if (event.key === 'Escape' && elements.employeeDialog && !elements.employeeDialog.classList.contains('hidden')) {
    closeEmployeeDialog();
  }
  if (event.key === 'Escape' && elements.attendanceEditDialog && !elements.attendanceEditDialog.classList.contains('hidden')) {
    closeAttendanceEditDialog();
  }
  if (event.key === 'Escape' && elements.attendanceDialog && !elements.attendanceDialog.classList.contains('hidden')) {
    closeAttendanceDialog();
  }
  if (event.key === 'Escape' && elements.payslipDialog && !elements.payslipDialog.classList.contains('hidden')) {
    closePayslipDialog();
  }
  if (event.key === 'Escape' && elements.bankStatementDetailDialog && !elements.bankStatementDetailDialog.classList.contains('hidden')) {
    closeBankStatementDetail();
  }
  if (event.key === 'Escape' && elements.bankReallocationDialog && !elements.bankReallocationDialog.classList.contains('hidden')) {
    closeBankReallocationDialog();
  }
  if (event.key === 'Escape' && elements.studentEditDialog && !elements.studentEditDialog.classList.contains('hidden')) {
    closeStudentEditDialog();
  }
  if (event.key === 'Escape' && elements.familyEditDialog && !elements.familyEditDialog.classList.contains('hidden')) {
    closeFamilyEditDialog();
  }
});

elements.closeBankStatementDetailButton?.addEventListener('click', closeBankStatementDetail);
elements.cancelBankStatementDetailButton?.addEventListener('click', closeBankStatementDetail);
elements.closeBankReallocationButton?.addEventListener('click', closeBankReallocationDialog);
elements.cancelBankReallocationButton?.addEventListener('click', closeBankReallocationDialog);
elements.bankReallocationTypeSelect?.addEventListener('change', syncBankReallocationMode);
elements.bankReallocationSearchInput?.addEventListener('input', () => {
  window.clearTimeout(bankReallocationSearchTimer);
  bankReallocationSearchTimer = window.setTimeout(searchBankReallocationTargets, 250);
});

elements.bankReallocationForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = elements.bankReallocationForm;
  const allocationType = form.elements.allocationType.value;
  const reason = form.elements.reason.value.trim();
  const invoiceId = Number(form.elements.invoiceId.value || 0);

  try {
    if (!reason) {
      throw new Error('Reallocation reason is required');
    }

    if (allocationType === 'Debtor' && !invoiceId) {
      throw new Error('Select the new invoice before saving the reallocation');
    }

    setFormBusy(form, true, 'Saving...');
    await api('/api/bank-statements/reallocate', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: Number(form.elements.transactionId.value),
        allocationType,
        reason,
        invoiceId: allocationType === 'Debtor' ? invoiceId : null,
        studentId: allocationType === 'Debtor' ? Number(form.elements.studentId.value || 0) || null : null,
        familyId: allocationType === 'Debtor' ? Number(form.elements.familyId.value || 0) || null : null,
        paymentMethod: allocationType === 'Creditor'
          ? (form.elements.creditorName.value.trim() || 'Creditor reallocation')
          : 'Bank reallocation'
      })
    });
    closeBankReallocationDialog();
    await refreshData();
    showToast('Bank payment reallocated');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

elements.studentReceiptAmountInput?.addEventListener('input', syncStudentReceiptAllocations);
elements.studentReceiptPayeeTypeSelect?.addEventListener('change', () => syncReceiptPayeeFields({ preserveOther: false }));
elements.studentReceiptInvoicesTable?.addEventListener('input', (event) => {
  if (event.target.classList.contains('student-receipt-allocation')) {
    updateStudentReceiptAdvanceHint();
  }
});

elements.studentReceiptForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const form = elements.studentReceiptForm;
    const amount = Number(form.elements.amount.value);
    const allocations = studentReceiptAllocationInputs()
      .map((input) => ({
        invoiceId: Number(input.dataset.invoiceId),
        amount: Number(input.value || 0)
      }))
      .filter((item) => item.invoiceId && item.amount > 0);
    const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Receipt amount must be a positive number');
    }

    if (allocated > amount) {
      throw new Error('Allocated amount cannot be more than the receipt amount');
    }

    if (!form.elements.payeeName.value.trim()) {
      throw new Error('Receipt payee is required');
    }

    setFormBusy(form, true, 'Issuing...');
    const receipt = await api('/api/invoices/receipts', {
      method: 'POST',
      body: JSON.stringify({
        studentId: Number(form.elements.studentId.value),
        amount,
        paymentDate: form.elements.paymentDate.value,
        paymentMethod: form.elements.paymentMethod.value,
        payeeType: form.elements.payeeType.value,
        payeeName: form.elements.payeeName.value,
        payeePhone: form.elements.payeePhone.value,
        payeeEmail: form.elements.payeeEmail.value,
        reference: form.elements.reference.value,
        description: form.elements.description.value,
        allocations,
        autoAllocate: false
      })
    });

    await refreshData();
    if (state.selectedStudentFinanceId) {
      state.selectedStudentFinanceStatement = await api(`/api/invoices/student/${state.selectedStudentFinanceId}/statement`);
      renderStudentFinanceDialog();
    }
    form.reset();
    setFormValue(form, 'studentId', state.selectedStudentFinanceId || '');
    setFormValue(form, 'paymentDate', new Date().toISOString().slice(0, 10));
    setFormValue(form, 'paymentMethod', 'EFT');
    setFormValue(form, 'payeeType', 'Responsible payer');
    syncReceiptPayeeFields({ preserveOther: false });
    showToast(`Receipt ${receipt.receiptNumber} issued`);
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.studentReceiptForm, false);
  }
});

elements.ofxUploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const fileInput = elements.ofxUploadForm.elements.ofxFile;
    const file = fileInput.files[0];

    if (!file) {
      showToast('Please select an OFX file');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.ofx') && !file.name.toLowerCase().endsWith('.qfx')) {
      showToast('File must be an OFX or QFX file');
      return;
    }

    setFormBusy(elements.ofxUploadForm, true, 'Uploading...');

    const ofxText = await file.text();
    const schoolId = currentSchoolId();

    if (!schoolId) {
      throw new Error('Create a school before uploading statements');
    }

    const payload = {
      ofxText,
      fileName: file.name,
      schoolId
    };

    const result = await api('/api/bank-statements/upload', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    fileInput.value = '';
    showToast(`Statement uploaded with ${result.importedTransactions} transactions`);
    await refreshData();
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.ofxUploadForm, false);
  }
});

if (elements.generateMonthlyButton) {
  elements.generateMonthlyButton.addEventListener('click', async () => {
    try {
      setFormBusy(elements.generateMonthlyButton, true, 'Generating...');

      const result = await api('/api/invoices/generate-monthly', {
        method: 'POST'
      });

      showToast(`Generated invoices for ${result.generated.length} schools`);
      await refreshData();
    } catch (error) {
      showToast(error.message);
    } finally {
      setFormBusy(elements.generateMonthlyButton, false);
    }
  });
}

document.addEventListener('click', async (event) => {

  const button = event.target.closest('[data-action]');

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (ACTION_VIEWS[action]) {
    switchView(ACTION_VIEWS[action]);
    return;
  }

  if (action === 'new-permission-role') {
    startNewPermissionRole();
    return;
  }

  if (action === 'apply-permission-template') {
    applyPermissionTemplate(button.dataset.template);
    return;
  }

  if (action === 'set-permission-toggle') {
    state.permissionDraft[button.dataset.groupKey] = button.dataset.allowed === 'true';
    renderPermissionEditor();
    return;
  }

  if (action === 'view-bank-statement') {
    await openBankStatementDetail(id);
    return;
  }

  if (action === 'open-bank-reallocation') {
    openBankReallocationDialog(button);
    return;
  }

  if (action === 'select-bank-reallocation-target') {
    await selectBankReallocationTarget(button);
    return;
  }

  if (action === 'select-bank-reallocation-invoice') {
    selectBankReallocationInvoice(button);
    return;
  }

  if (action === 'open-settings-page') {
    switchView('settings');
    return;
  }

  if (action === 'download-export') {
    await downloadExport(button.dataset.export);
    return;
  }

  if (action === 'export-student-statement-excel' || action === 'export-student-statement-pdf') {
    await exportStudentStatement(action === 'export-student-statement-excel' ? 'excel' : 'pdf');
    return;
  }

  if (action === 'preview-statements') {
    renderStatementPreview();
    showToast('Statement preview refreshed');
    return;
  }

  if (action === 'send-statements') {
    const rows = statementPreviewRows();
    if (!rows.length) {
      showToast('No statements match the selected send option');
      return;
    }

    try {
      button.disabled = true;
      for (const row of rows) {
        await api('/api/features/communication-history', {
          method: 'POST',
          body: JSON.stringify({
            familyId: row.family.FamilyID,
            communicationType: 'Statement',
            subject: `Statement ${row.year} - ${familyLabel(row.family)}`,
            status: 'Sent',
            deliveryStatus: 'Queued'
          })
        });
      }
      await refreshFeatureData();
      renderFeaturePages();
      showToast(`Statements queued for ${rows.length} families`);
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
    return;
  }

  if (action === 'open-consent-composer') {
    openConsentDialog();
    return;
  }

  if (action === 'cancel-consent-composer') {
    closeConsentDialog();
    return;
  }

  if (action === 'view-consent-detail') {
    openConsentDetailDialog(button.dataset.id);
    return;
  }

  if (action === 'edit-class') {
    editClass(Number(button.dataset.id));
    return;
  }

  if (action === 'deactivate-class') {
    try {
      const cls = state.classes.find(c => c.ClassID === Number(button.dataset.id));
      await api('/api/classes/' + button.dataset.id, { method: 'PUT', body: JSON.stringify({ isActive: false, className: cls ? cls.ClassName : '' }) });
      await refreshClasses();
      renderClasses();
      showToast('Class deactivated');
    } catch (e) { showToast(e.message); }
    return;
  }

  if (action === 'activate-class') {
    try {
      const cls = state.classes.find(c => c.ClassID === Number(button.dataset.id));
      await api('/api/classes/' + button.dataset.id, { method: 'PUT', body: JSON.stringify({ isActive: true, className: cls ? cls.ClassName : '' }) });
      await refreshClasses();
      renderClasses();
      showToast('Class activated');
    } catch (e) { showToast(e.message); }
    return;
  }

  if (action === 'edit-student') {
    openStudentEditDialog(button.dataset.id);
    return;
  }

  if (action === 'view-student-finance' || action === 'issue-student-receipt') {
    await openStudentFinanceDialog(button.dataset.id, action === 'issue-student-receipt');
    return;
  }

  if (action === 'edit-family') {
    openFamilyEditDialog(button.dataset.id);
    return;
  }

  if (action === 'open-employee-dialog') {
    await openEmployeeDialog();
    return;
  }

  if (action === 'open-year-end-rollover') {
    const rolloverYear = selectedYearEndRolloverYear();
    setReenrolmentYear(rolloverYear);
    await refreshFeatureData();
    renderFeaturePages();
    switchView('reenrolment');
    document.getElementById('reenrolmentView')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (action === 'print-report') {
    printReport(button.dataset.reportPrefix || activeReportPrefix(), button.dataset.reportTitle || elements.viewTitle.textContent);
    return;
  }

  if (action === 'fill-reenrolment') {
    const form = document.getElementById('reenrolmentForm');
    if (!form) return;
    const rowClassSelect = button.closest('tr')?.querySelector('[data-reenrolment-row-class]');
    const newClassName = button.dataset.useRowClass === 'true'
      ? rowClassSelect?.value || ''
      : button.dataset.nextClass || '';
    if (['Promoted', 'Retained'].includes(button.dataset.rolloverAction || '') && !newClassName) {
      showToast(`Create and select a class for ${reenrolmentTargetYear()} first`);
      return;
    }
    setFormValue(form, 'studentId', button.dataset.id || '');
    setFormValue(form, 'newClassName', newClassName);
    setFormValue(form, 'action', button.dataset.rolloverAction || 'Promoted');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => form.elements.newClassName?.focus(), 250);
    return;
  }

  if (action === 'edit-employee') {
    await openEmployeeDialog(button.dataset.id);
    return;
  }

  if (action === 'view-payslip' || action === 'edit-payslip') {
    try {
      await openPayslipDialog(button.dataset.id, action === 'edit-payslip' ? 'edit' : 'view');
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  if (action === 'finalize-payslip') {
    const confirmed = window.confirm('Finalize this payslip? Finalized payslips become read-only historical records.');
    if (!confirmed) {
      return;
    }
    try {
      await api(`/api/payslips/${button.dataset.id}/finalize`, { method: 'PUT' });
      await refreshData();
      showToast('Payslip finalized');
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  if (action === 'inactivate-student') {
    showDepartureForm(id);
    return;
  }

  try {
    if (action === 'refund-approve' || action === 'refund-complete') {
      const nextAction = action === 'refund-approve' ? 'approve' : 'complete';
      await api(`/api/school-features/refunds/${id}/${nextAction}`, { method: 'PUT' });
      await refreshFeatureData();
      renderFeaturePages();
      showToast(action === 'refund-approve' ? 'Refund approved' : 'Refund completed');
      return;
    }

    if (action === 'registration-fee-paid') {
      await api(`/api/school-features/registration-fees/${id}/pay`, { method: 'PUT' });
      await refreshFeatureData();
      renderFeaturePages();
      showToast('Registration fee marked paid');
      return;
    }

    if (action === 'year-end-status') {
      if (button.dataset.status === 'Closed') {
        const financialYear = Number(button.dataset.financialYear || selectedYearEndFinancialYear());
        const rolloverYear = financialYear + 1;
        setReenrolmentYear(rolloverYear);
        if (Number(state.featureRolloverYear) !== rolloverYear) {
          await refreshFeatureData();
          renderFeaturePages();
        }
        if (pendingRolloverStudentIds().size > 0) {
          showToast(`Complete ${rolloverYear} enrolment and promotions before closing ${financialYear}`);
          switchView('reenrolment');
          return;
        }
      }
      await api(`/api/hr/year-end/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: button.dataset.status })
      });
      await refreshFeatureData();
      renderFeaturePages();
      showToast('Year-end status updated');
      return;
    }

    if (action === 'reopen-finance-period') {
      const reason = window.prompt('Reason for reopening this locked finance period for correction:');
      if (!reason || !reason.trim()) {
        showToast('A reopen reason is required');
        return;
      }
      await api(`/api/school-features/finance-period-locks/${id}/reopen`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      await refreshFeatureData();
      renderFeaturePages();
      showToast('Finance period reopened for correction');
      return;
    }

    if (action === 'approve-bank-match') {
      const confirmed = window.confirm(
        'Approve this suggested bank match? This records the bank transaction as a payment for this invoice. Future suggestions will still need approval.'
      );

      if (!confirmed) {
        return;
      }

      await api('/api/bank-statements/matches/approve', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: Number(button.dataset.transactionId),
          invoiceId: Number(button.dataset.invoiceId)
        })
      });
      await refreshData();
      showToast('Bank match approved');
      return;
    }

    if (action === 'activate-user' || action === 'deactivate-user') {
      const nextAction = action === 'activate-user' ? 'activate' : 'deactivate';
      await api(`/api/users/school-users/${id}/${nextAction}`, { method: 'PUT' });
      await Promise.all([
        refreshSchoolUsers(),
        refreshAuditLogs()
      ]);
      renderSchoolUsers();
      renderAuditLogs();
      showToast(nextAction === 'activate' ? 'User activated' : 'User deactivated');
      return;
    }

    if (action === 'approve-leave' || action === 'reject-leave') {
      const status = action === 'approve-leave' ? 'Approved' : 'Rejected';
      await api(`/api/leaves/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      await refreshData();
      showToast(`Leave ${status.toLowerCase()}`);
      return;
    }

    if (action === 'edit-billing-category') {
      editBillingCategory(id);
      return;
    }

    if (action === 'deactivate-billing-category') {
      await api(`/api/billing-categories/${id}`, { method: 'DELETE' });
      await refreshData();
      showToast('Billing category deactivated');
      return;
    }

    if (action === 'delete-invoice') {
      await api(`/api/invoices/${id}`, { method: 'DELETE' });
      showToast('Invoice deleted');
    }

    await refreshData();
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener('click', (event) => {
  const tabButton = event.target.closest('[data-form-tab]');
  if (tabButton) {
    activateFormTab(tabButton);
  }
});

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

window.addEventListener('popstate', () => {
  switchView(viewFromPath(), { replace: true });
});

document.querySelectorAll('.finance-tab').forEach((button) => {
  button.addEventListener('click', () => switchFinanceTab(button.dataset.financeTab));
});

document.querySelectorAll('[data-settings-tab]').forEach((button) => {
  button.addEventListener('click', () => switchSettingsTab(button.dataset.settingsTab));
});

[
  elements.invoiceFilterStudent,
  elements.invoiceFilterClass,
  elements.invoiceFilterMonth,
  elements.invoiceFilterYear,
  elements.invoiceFilterStatus
].forEach((input) => {
  input?.addEventListener('input', renderInvoicesTable);
  input?.addEventListener('change', renderInvoicesTable);
});


// Outstanding fees export button
document.querySelectorAll('[data-action="export-outstanding-fees"]').forEach((btn) => {
  btn.addEventListener('click', exportOutstandingFees);
});

document.getElementById('outstandingFeesSearch')?.addEventListener('input', renderOutstandingFees);
document.getElementById('outstandingFeesYear')?.addEventListener('change', refreshOutstandingFees);

[
  elements.reconciliationMonth,
  elements.reconciliationYear,
  elements.reconciliationStatus
].forEach((control) => control?.addEventListener('change', renderReconciliation));

[
  elements.financeAuditFromInput,
  elements.financeAuditToInput,
  elements.financeAuditEntityFilter
].forEach((control) => control?.addEventListener('change', async () => {
  await refreshFinanceAuditLogs();
  renderFinanceAuditLogs();
}));

elements.reconciliationSearch?.addEventListener('input', () => {
  window.clearTimeout(elements.reconciliationSearch._timer);
  elements.reconciliationSearch._timer = window.setTimeout(renderReconciliation, 250);
});

// Register Learner form
if (elements.registerLearnerForm) {
  updateRegisterLearnerParentFields();

  elements.registerLearnerParentTypeSelect?.addEventListener('change', updateRegisterLearnerParentFields);
  elements.registerResponsiblePayerTypeSelect?.addEventListener('change', () => {
    syncResponsiblePayerFields(elements.registerLearnerForm, { preserveOther: false });
  });
  ['primaryParentName', 'primaryParentPhone', 'primaryParentEmail', 'secondaryParentName', 'secondaryParentPhone', 'secondaryParentEmail'].forEach((name) => {
    elements.registerLearnerForm.elements[name]?.addEventListener('input', () => {
      syncResponsiblePayerFields(elements.registerLearnerForm, { preserveOther: true });
    });
  });

  elements.registerLearnerFamilySelect?.addEventListener('change', () => {
    const selectedFamily = state.families.find((family) => family.FamilyID === Number(elements.registerLearnerFamilySelect.value));
    if (selectedFamily) {
      fillFamilyForm(elements.registerLearnerForm, selectedFamily);
      syncResponsiblePayerFields(elements.registerLearnerForm, { preserveOther: true });
    }
  });

  document.addEventListener('dragstart', (event) => {
    const card = event.target.closest('[data-billing-card]');
    if (!card) return;
    event.dataTransfer.setData('text/plain', card.dataset.billingId);
    event.dataTransfer.effectAllowed = 'move';
  });

  [
    elements.registerLearnerBillingAvailable,
    elements.registerLearnerBillingAssigned,
    elements.studentEditBillingAvailable,
    elements.studentEditBillingAssigned
  ].forEach((zone) => {
    zone?.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('drag-over');
    });
    zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone?.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('drag-over');
      const billingId = event.dataTransfer.getData('text/plain');
      if (zone.dataset.billingZone === 'assigned') {
        assignRegisterLearnerBilling(billingId);
      } else if (zone.dataset.billingZone === 'available') {
        unassignRegisterLearnerBilling(billingId);
      } else if (zone.dataset.billingZone === 'edit-assigned') {
        assignStudentEditBilling(billingId);
      } else if (zone.dataset.billingZone === 'edit-available') {
        unassignStudentEditBilling(billingId);
      }
    });
    zone?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-billing-card]');
      if (!card) return;
      if (card.dataset.billingCard === 'available') {
        assignRegisterLearnerBilling(card.dataset.billingId);
      } else if (card.dataset.billingCard === 'assigned') {
        unassignRegisterLearnerBilling(card.dataset.billingId);
      } else if (card.dataset.billingCard === 'edit-available') {
        assignStudentEditBilling(card.dataset.billingId);
      } else if (card.dataset.billingCard === 'edit-assigned') {
        unassignStudentEditBilling(card.dataset.billingId);
      }
    });
  });

  elements.registerLearnerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = elements.registerLearnerForm;

    try {
      const missingFields = registerLearnerMissingFields(form);
      if (missingFields.length) {
        showRequiredInfoDialog(missingFields);
        return;
      }

      const billingCategoryIds = selectedValues(elements.registerLearnerBillingSelect);

      setFormBusy(form, true, 'Registering...');
      const data = formData(form);
      let familyId = Number(data.familyId || 0);

      if (!familyId) {
        const schoolId = currentSchoolId();
        if (!schoolId) {
          throw new Error('Create a school before registering learners');
        }

        const family = await api('/api/families', {
          method: 'POST',
          body: JSON.stringify({
            ...familyPayloadFromForm(form),
            schoolId
          })
        });
        familyId = family.FamilyID;
      }

      await api('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          familyId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth || null,
          homePhone: data.homePhone,
          homeAddress: data.homeAddress || data.familyHomeAddress,
          className: data.className,
          currentAcademicYear: academicYearForClassName(data.className, currentCalendarYear()),
          billingDate: data.billingDate,
          enrolledDate: data.enrolledDate,
          medicalNotes: data.medicalNotes,
          billingCategoryId: billingCategoryIds[0],
          billingCategoryIds,
          responsiblePayerType: data.responsiblePayerType,
          responsiblePayerName: data.responsiblePayerName,
          responsiblePayerPhone: data.responsiblePayerPhone,
          responsiblePayerEmail: data.responsiblePayerEmail
        })
      });

      form.reset();
      state.registerLearnerBillingIds = [];
      updateRegisterLearnerParentFields();
      renderRegisterLearnerBillingPicker();
      showToast('Learner registered successfully');
      await refreshData();
      switchView('students');
    } catch (error) {
      showToast(error.message || 'Failed to register learner');
    } finally {
      setFormBusy(form, false);
    }
  });
}

elements.logoutButton.addEventListener('click', () => {
  clearSession();
  window.location.href = '/school-login';
});

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('null') && event.message.includes('innerHTML')) {
    console.warn('[DEBUG] innerHTML null error at:', event.filename, 'line:', event.lineno, 'col:', event.colno);
    event.preventDefault();
  }
});

wireStudentSearch();
wireParentSearch();
renderShell();
