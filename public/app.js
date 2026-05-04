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
  school: 'School',
  finance: 'Finance',
  reporting: 'Reporting',
  account: 'Account',
  settings: 'Settings',
  classes: 'School / Classes',
  staff: 'School / Staff',
  students: 'School / Students',
  parents: 'School / Parents',
  attendance: 'School / Attendance',
  admissions: 'School / Admissions / Enrolment',
  reenrolment: 'School / Re-Enrolment / Year Rollover',
  schoolSettings: 'School / School Settings',
  consentPermissions: 'School / Consent and Permissions',
  registerLearner: 'School / Register Learner',
  bank: 'Finance / Bank Reconciliation',
  outstanding: 'Finance / Outstanding Fees',
  bankTransactions: 'Finance / Bank Transactions',
  bankStatements: 'Finance / Bank Statements',
  suggestedMatches: 'Finance / Suggested Matches',
  invoices: 'Finance / Invoices',
  billingCategories: 'Finance / Billing Categories',
  payslips: 'Finance / HR / Payroll',
  financialAdjustments: 'Finance / Financial Adjustments',
  refunds: 'Finance / Refunds',
  registrationFees: 'Finance / Registration / Deposit Fees',
  yearEndClosing: 'Finance / Year-End Financial Closing',
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
  admissions: 'school',
  reenrolment: 'school',
  schoolSettings: 'school',
  consentPermissions: 'school',
  registerLearner: 'school',
  bank: 'finance',
  outstanding: 'finance',
  bankTransactions: 'finance',
  bankStatements: 'finance',
  suggestedMatches: 'finance',
  invoices: 'finance',
  billingCategories: 'finance',
  payslips: 'finance',
  financialAdjustments: 'finance',
  refunds: 'finance',
  registrationFees: 'finance',
  yearEndClosing: 'finance',
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
  account: '/school/account',
  settings: '/school/settings',
  classes: '/school/classes',
  staff: '/school/staff',
  students: '/school/students',
  parents: '/school/parents',
  attendance: '/school/attendance',
  admissions: '/school/admissions-enrolment',
  reenrolment: '/school/re-enrolment-year-rollover',
  schoolSettings: '/school/school-settings',
  consentPermissions: '/school/consent-permissions',
  registerLearner: '/school/register-learner',
  bank: '/school/finance/bank-reconciliation',
  outstanding: '/school/finance/outstanding-fees',
  bankTransactions: '/school/finance/bank-transactions',
  bankStatements: '/school/finance/bank-statements',
  suggestedMatches: '/school/finance/suggested-matches',
  invoices: '/school/finance/invoices',
  billingCategories: '/school/finance/billing-categories',
  payslips: '/school/finance/hr-payroll',
  financialAdjustments: '/school/finance/financial-adjustments',
  refunds: '/school/finance/refunds',
  registrationFees: '/school/finance/registration-deposit-fees',
  yearEndClosing: '/school/finance/year-end-financial-closing',
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

const ACTION_VIEWS = {
  'open-school': 'school',
  'open-finance': 'finance',
  'open-reporting': 'reporting',
  'open-classes': 'classes',
  'open-staff': 'staff',
  'open-students': 'students',
  'open-parents': 'parents',
  'open-attendance': 'attendance',
  'open-admissions': 'admissions',
  'open-reenrolment': 'reenrolment',
  'open-school-settings': 'schoolSettings',
  'open-consent-permissions': 'consentPermissions',
  'open-register-learner': 'registerLearner',
  'open-bank': 'bank',
  'open-outstanding': 'outstanding',
  'open-bank-transactions': 'bankTransactions',
  'open-bank-statements': 'bankStatements',
  'open-suggested-matches': 'suggestedMatches',
  'open-invoices': 'invoices',
  'open-billing-categories': 'billingCategories',
  'open-hr-payroll': 'payslips',
  'open-payslips': 'payslips',
  'open-financial-adjustments': 'financialAdjustments',
  'open-refunds': 'refunds',
  'open-registration-fees': 'registrationFees',
  'open-year-end-closing': 'yearEndClosing',
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
  employees: [],
  leaves: [],
  payslips: [],
  payslipStatusMessage: '',
  schoolUsers: [],
  auditLogs: [],
  matchSuggestions: [],
  selectedAccountSchoolId: null,
  selectedSettingsSchoolId: null,
  editingBillingCategoryId: null,
  studentStatusFilter: 'active',
  selectedDepartureStudentId: null,
  studentSearchQuery: '',
  studentSearchType: 'Student name',
  editingClassId: null
};

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
  schoolUsersTable: document.getElementById('schoolUsersTable'),
  auditPanel: document.getElementById('auditPanel'),
  auditLogsTable: document.getElementById('auditLogsTable'),
  settingsForm: document.getElementById('settingsForm'),
  settingsSchoolSelect: document.getElementById('settingsSchoolSelect'),
  settingsSchoolSelector: document.getElementById('settingsSchoolSelector'),
  currencySelect: document.getElementById('currencySelect'),
  parentsModulePanel: document.getElementById('parentsModulePanel'),
  familyForm: document.getElementById('familyForm'),
  familiesTable: document.getElementById('familiesTable'),
  studentForm: document.getElementById('studentForm'),
  studentFamilySelect: document.getElementById('studentFamilySelect'),
  studentBillingCategorySelect: document.getElementById('studentBillingCategorySelect'),
  studentsTable: document.getElementById('studentsTable'),
  outstandingFeesTable: document.getElementById('outstandingFeesTable'),
  registerLearnerForm: document.getElementById('registerLearnerForm'),
  registerLearnerFamilySelect: document.getElementById('registerLearnerFamilySelect'),
  registerLearnerBillingSelect: document.getElementById('registerLearnerBillingSelect'),
  billingCategoryForm: document.getElementById('billingCategoryForm'),
  billingCategoriesTable: document.getElementById('billingCategoriesTable'),
  cancelBillingCategoryEditButton: document.getElementById('cancelBillingCategoryEditButton'),
  classForm: document.getElementById('classForm'),
  classTeacherSelect: document.getElementById('classTeacherSelect'),
  classSearchInput: document.getElementById('classSearchInput'),
  classesTable: document.getElementById('classesTable'),
  editClassId: document.getElementById('editClassId'),
  classSubmitButton: document.getElementById('classSubmitButton'),
  cancelClassEditButton: document.getElementById('cancelClassEditButton'),
  attendanceForm: document.getElementById('attendanceForm'),
  attendanceStudentSelect: document.getElementById('attendanceStudentSelect'),
  attendanceDateInput: document.getElementById('attendanceDateInput'),
  attendanceSummaryTable: document.getElementById('attendanceSummaryTable'),
  attendanceTable: document.getElementById('attendanceTable'),
  employeeForm: document.getElementById('employeeForm'),
  employeesTable: document.getElementById('employeesTable'),
  leaveForm: document.getElementById('leaveForm'),
  leavesTable: document.getElementById('leavesTable'),
  payslipForm: document.getElementById('payslipForm'),
  payslipEmployeeSelect: document.getElementById('payslipEmployeeSelect'),
  payslipsTable: document.getElementById('payslipsTable'),
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
  matchSuggestionsTable: document.getElementById('matchSuggestionsTable'),
  totalCredits: document.getElementById('totalCredits'),
  totalDebits: document.getElementById('totalDebits'),
  accountBalance: document.getElementById('accountBalance'),
  outstandingAmount: document.getElementById('outstandingAmount'),
  generateMonthlyButton: document.getElementById('generateMonthlyButton'),
  paymentDialog: document.getElementById('paymentDialog'),
  paymentForm: document.getElementById('paymentForm'),
  paymentInvoiceLabel: document.getElementById('paymentInvoiceLabel'),
  paymentRemainingLabel: document.getElementById('paymentRemainingLabel'),
  paymentAmountInput: document.getElementById('paymentAmountInput'),
  closePaymentDialogButton: document.getElementById('closePaymentDialogButton'),
  cancelPaymentButton: document.getElementById('cancelPaymentButton'),
  toast: document.getElementById('toast')
};

let toastTimer = null;


// === PERMISSION-BASED ICON HIDING ===
function applyIconPermissions() {
  const user = state.user;
  if (!user) return;
  document.querySelectorAll('[data-permission]').forEach((tile) => {
    const perm = tile.dataset.permission;
    let visible = true;
    if (perm === 'hr' && !user.HasHrPermission) visible = false;
    if (perm === 'admin-only' && user.Role !== 'admin') visible = false;
    tile.style.display = visible ? '' : 'none';
  });
}

// === OUTSTANDING FEES EXPORT ===
function exportOutstandingFees() {
  const yearInput = document.getElementById('outstandingFeesYear');
  const year = yearInput ? Number(yearInput.value) : new Date().getFullYear();
  const url = '/api/export/outstanding-fees?year=' + year;
  const token = state.token;
  fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    .then((r) => {
      if (!r.ok) return r.json().then((j) => { throw new Error(j.error || 'Export failed'); });
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'outstanding-fees-' + year + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      showToast('Outstanding fees exported successfully');
    })
    .catch((e) => showToast(e.message || 'Export failed. No data found or permission denied.'));
}

// === STUDENT SEARCH WIRING ===
function wireStudentSearch() {
  const searchInput = document.getElementById('studentSearchInput');
  const searchTypeSelect = document.getElementById('studentSearchTypeSelect');
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

async function api(path, options = {}) {
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
      localStorage.removeItem('smsToken');
      localStorage.removeItem('smsUser');
      window.location.href = '/school-login';
      throw new Error('Session expired');
    }
    const message = payload?.error?.message || payload?.error || 'Request failed';

    if ([401, 403].includes(response.status) && /token|session/i.test(message)) {
      clearSession();
      throw new Error(message);
    }

    throw new Error(message);
  }

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
  renderShell();
  applyIconPermissions();
  wireStudentSearch();

const studentPageSizeSelect = document.getElementById('studentPageSize');
if (studentPageSizeSelect) {
  studentPageSizeSelect.addEventListener('change', () => {
    state.studentPageSize = Number(studentPageSizeSelect.value);
    renderStudentsTable();
  });
}

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
  state.studentStatusFilter = 'active';
  state.selectedDepartureStudentId = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  renderShell();
}

function renderShell() {
  const signedIn = Boolean(state.token && state.user);

  if (!signedIn) {
    window.location.href = '/school-login';
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
  refreshData();
}

async function refreshData() {
  try {
    const [schools, invoices, families, students, billingCategories, employees, leaves] = await Promise.all([
      api('/api/schools'),
      api('/api/invoices'),
      api('/api/families'),
      api(`/api/students?status=${encodeURIComponent(state.studentStatusFilter)}`),
      api('/api/billing-categories'),
      api('/api/employees'),
      api('/api/leaves')
    ]);

    state.schools = schools;
    state.invoices = invoices;
    state.families = families;
    state.students = students;
    state.billingCategories = billingCategories;
    state.employees = employees;
    state.leaves = leaves;
    await Promise.all([
      refreshSchoolUsers(),
      refreshAuditLogs(),
      refreshMatchSuggestions(),
      refreshClasses(),
      refreshAttendance(),
      refreshPayslips()
    ]);
    await refreshOutstandingFees();
    renderData();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshSchoolUsers() {
  const school = getAccountSchool();

  if (!school) {
    state.schoolUsers = [];
    return;
  }

  const query = state.user?.role === 'admin'
    ? `?schoolId=${encodeURIComponent(school.SchoolID)}`
    : '';

  try {
    state.schoolUsers = await api(`/api/users/school-users${query}`);
  } catch (error) {
    state.schoolUsers = [];
    showToast(error.message);
  }
}

async function refreshAuditLogs() {
  try {
    state.auditLogs = await api('/api/audit?limit=20');
  } catch (error) {
    state.auditLogs = [];
  }
}

async function refreshMatchSuggestions() {
  try {
    state.matchSuggestions = await api('/api/bank-statements/match-suggestions');
  } catch (error) {
    state.matchSuggestions = [];
  }
}

async function refreshClasses() {
  try {
    state.classes = await api('/api/classes');
  } catch (error) {
    state.classes = [];
  }
}

async function refreshAttendance() {
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

async function refreshPayslips() {
  try {
    state.payslips = await api('/api/payslips');
    state.payslipStatusMessage = '';
  } catch (error) {
    state.payslips = [];
    state.payslipStatusMessage = error.message;
  }
}

function renderData() {
  applyRoleShell();
  renderMetrics();
  renderSchoolOptions();
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
  renderLeaves();
  renderPayslips();
  renderAccount();
  renderSchoolUsers();
  renderAuditLogs();
  renderMatchSuggestions();
  renderSettings();
  renderAdminControls();
}

function renderMetrics() {
  const displaySchool = getSettingsSchool();
  const activeStudents = state.students.filter((student) => student.IsActive !== false).length;
  const pending = state.invoices
    .filter((invoice) => ['Pending', 'Partial', 'Overdue'].includes(invoice.Status))
    .reduce((total, invoice) => total + Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)), 0);

  const paid = state.invoices
    .reduce((total, invoice) => total + Number(invoice.AmountPaid || 0), 0);

  document.getElementById('primaryMetricLabel').textContent = 'Students';
  document.getElementById('schoolCount').textContent = activeStudents;
  document.getElementById('invoiceCount').textContent = state.invoices.length;
  document.getElementById('pendingValue').textContent = money(pending, displaySchool);
  document.getElementById('paidValue').textContent = money(paid, displaySchool);
}

function renderSchoolOptions() {
  elements.invoiceSchool.innerHTML = state.schools.length
    ? state.schools
        .map((school) => `<option value="${school.SchoolID}">${escapeHtml(school.SchoolName)}</option>`)
        .join('')
    : '<option value="">No schools available</option>';
  elements.invoiceSchool.disabled = !state.schools.length;
}

function renderBillingCategoryOptions() {
  const options = state.billingCategories.length
    ? state.billingCategories.map((category) => `
        <option value="${category.BillingCategoryID}">${escapeHtml(category.CategoryName)} - ${money(category.BaseAmount, getSettingsSchool())}</option>
      `).join('')
    : '<option value="">Add a billing category first</option>';

  if (elements.studentBillingCategorySelect) {
    elements.studentBillingCategorySelect.innerHTML = options;
    elements.studentBillingCategorySelect.disabled = !state.billingCategories.length;
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
  if (!elements.invoiceFilterStudent) {
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
  elements.invoicesTable.innerHTML = filteredInvoices().map((invoice) => {
    const school = state.schools.find((item) => item.SchoolID === invoice.SchoolID);
    const statusClass = invoice.Status === 'Paid' ? 'badge' : invoice.Status === 'Overdue' ? 'badge danger' : 'badge warn';
    const amountPaid = Number(invoice.AmountPaid || 0);
    const remaining = Math.max(0, Number(invoice.Amount || 0) - amountPaid);
    const isPaid = invoice.Status === 'Paid';
    const studentName = [invoice.FirstName, invoice.LastName].filter(Boolean).join(' ') || '-';
    const actions = isPaid
      ? '<span class="table-subtext">No actions</span>'
      : `
            <button class="ghost-button" data-action="record-payment" data-id="${invoice.InvoiceID}" data-remaining="${remaining}" type="button">Record payment</button>
            <button class="ghost-button" data-action="pay-invoice" data-requires-school-finance="true" data-id="${invoice.InvoiceID}" type="button">Mark paid</button>
            <button class="danger-button" data-action="delete-invoice" data-requires-school-finance="true" data-id="${invoice.InvoiceID}" type="button">Delete</button>
        `;

    return `
      <tr>
        <td>${escapeHtml(invoice.InvoiceNumber)}</td>
        <td>${escapeHtml(studentName)}</td>
        <td>${escapeHtml(invoice.ClassName || '-')}</td>
        <td>${escapeHtml(invoice.CategoryName || '-')}</td>
        <td>${money(invoice.Amount, school)}</td>
        <td>${money(amountPaid, school)}</td>
        <td><span class="${statusClass}">${escapeHtml(invoice.Status)}</span></td>
        <td>${dateOnly(invoice.DueDate)}</td>
        <td>
          <div class="actions">
            ${actions}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="9">No invoices found.</td></tr>';
}

function renderRecentLists() {
  document.getElementById('recentInvoices').innerHTML = state.invoices.slice(0, 5).map((invoice) => {
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

  elements.billingCategoriesTable.innerHTML = state.billingCategories.map((category) => {
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
  const category = state.billingCategories.find((item) => item.BillingCategoryID === Number(categoryId));

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
  elements.billingCategoryForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetBillingCategoryForm() {
  state.editingBillingCategoryId = null;
  elements.billingCategoryForm.reset();
  elements.billingCategoryForm.elements.billingCategoryId.value = '';
  elements.cancelBillingCategoryEditButton.classList.add('hidden');
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

function renderFamiliesTable() {
  const families = currentSchoolFamilies();

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
    </tr>
  `).join('') || '<tr><td colspan="4">No families yet.</td></tr>';
}

function renderStudentsTable() {
  const q = (state.studentSearchQuery || '').toLowerCase();
  const searchType = state.studentSearchType || 'Student name';
  const filtered = state.students.filter((s) => {
    if (!q) return true;
    switch (searchType) {
      case 'Student name': return (s.FirstName || '').toLowerCase().includes(q);
      case 'Student surname': return (s.LastName || '').toLowerCase().includes(q);
      case 'Parent name': return (s.FamilyName || '').toLowerCase().includes(q);
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
        </td>
        <td>${escapeHtml(student.FamilyName || '-')}</td>
        <td>${dateOnly(student.BillingDate)}</td>
        <td>${dateOnly(student.EnrolledDate)}</td>
        <td>
          <span class="${statusClass}">${isActive ? 'Active' : 'Inactive'}</span>
          ${!isActive ? `<span class="table-subtext">${escapeHtml(student.DepartureReason || '')} ${dateOnly(student.DepartureDate)}</span>` : ''}
        </td>
        <td>
          <div class="actions">
            ${isActive ? `<button class="ghost-button" data-action="inactivate-student" data-id="${student.StudentID}" type="button">Mark inactive</button>` : '<span class="table-subtext">No actions</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6">No students found.</td></tr>';
}


function editClass(classId) {
  const cls = state.classes.find((c) => c.ClassID === classId);
  if (!cls) return;
  state.editingClassId = classId;
  elements.editClassId.value = classId;
  elements.classForm.elements.className.value = cls.ClassName || '';
  elements.classForm.elements.capacity.value = cls.Capacity || '';
  // Set teacher dropdown
  if (elements.classTeacherSelect) {
    elements.classTeacherSelect.value = cls.TeacherID || '';
  }
  elements.classSubmitButton.textContent = 'Save Changes';
  elements.cancelClassEditButton.classList.remove('hidden');
}

function resetClassForm() {
  state.editingClassId = null;
  elements.editClassId.value = '';
  elements.classForm.reset();
  elements.classSubmitButton.textContent = 'Add Class';
  elements.cancelClassEditButton.classList.add('hidden');
}

function filteredClasses() {
  const search = String(elements.classSearchInput?.value || '').trim().toLowerCase();

  if (!search) {
    return state.classes;
  }

  return state.classes.filter((item) => [
    item.ClassName,
    item.TeacherFirstName,
    item.TeacherLastName
  ].some((value) => String(value || '').toLowerCase().includes(search)));
}

function renderClasses() {
  if (!elements.classesTable) {
    return;
  }

  elements.classesTable.innerHTML = filteredClasses().map((item, index) => {
    const teacherName = `${item.TeacherFirstName || ''} ${item.TeacherLastName || ''}`.trim() || '-';
    const isActive = item.IsActive !== false;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.ClassName || '-')}</td>
        <td>${escapeHtml(teacherName)}</td>
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
  }).join('') || '<tr><td colspan="6">No class records found.</td></tr>';
}

function renderAttendance() {
  if (!elements.attendanceTable) {
    return;
  }

  const counts = state.attendance.reduce((summary, record) => {
    const status = record.Status || 'Present';
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});

  elements.attendanceSummaryTable.innerHTML = ['Present', 'Absent', 'Late', 'Excused'].map((status) => `
    <tr>
      <td>${status}</td>
      <td>${counts[status] || 0}</td>
    </tr>
  `).join('');

  elements.attendanceTable.innerHTML = state.attendance.map((record) => {
    const statusClass = record.Status === 'Present' ? 'badge' : record.Status === 'Absent' ? 'badge danger' : 'badge warn';
    const studentName = `${record.FirstName || ''} ${record.LastName || ''}`.trim() || `Student ${record.StudentID}`;

    return `
      <tr>
        <td>${dateOnly(record.AttendanceDate)}</td>
        <td>${escapeHtml(studentName)}</td>
        <td>${escapeHtml(record.ClassName || '-')}</td>
        <td><span class="${statusClass}">${escapeHtml(record.Status || '-')}</span></td>
        <td>${escapeHtml(record.Notes || '-')}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5">No attendance records found for this date.</td></tr>';
}

function renderEmployees() {
  if (!elements.employeesTable) {
    return;
  }

  elements.employeesTable.innerHTML = state.employees.map((employee, index) => {
    const isActive = employee.IsActive !== false;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(`${employee.FirstName || ''} ${employee.LastName || ''}`.trim())}</td>
        <td>${escapeHtml(employee.EmployeeID ? `S${String(employee.EmployeeID).padStart(3, '0')}` : '-')}</td>
        <td>${escapeHtml(employee.JobTitle || employee.Department || '-')}</td>
        <td>${escapeHtml(employee.Phone || '-')}</td>
        <td>${escapeHtml(employee.Email || '-')}</td>
        <td><span class="${isActive ? 'badge' : 'badge danger'}">${isActive ? 'Active' : 'Inactive'}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7">No staff records found.</td></tr>';

  renderPayslipEmployeeOptions();
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
    elements.payslipsTable.innerHTML = `<tr><td colspan="4">${escapeHtml(state.payslipStatusMessage)}</td></tr>`;
    return;
  }

  elements.payslipsTable.innerHTML = state.payslips.map((payslip) => {
    const employeeName = `${payslip.FirstName || ''} ${payslip.LastName || ''}`.trim() || `Employee ${payslip.EmployeeID}`;
    const employee = state.employees.find((item) => item.EmployeeID === payslip.EmployeeID);

    return `
      <tr>
        <td>${escapeHtml(employeeName)}</td>
        <td>${escapeHtml(payslip.PayPeriod || '-')}</td>
        <td>${money(payslip.NetAmount || 0, getSettingsSchool() || employee)}</td>
        <td><span class="badge">${escapeHtml(payslip.Status || (payslip.IsFinalized ? "Finalized" : "Draft"))}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4">No payslip records found.</td></tr>';
}


function renderRegisterLearnerOptions() {
  if (!elements.registerLearnerFamilySelect) return;
  const families = currentSchoolFamilies();
  elements.registerLearnerFamilySelect.innerHTML = '<option value="">Select family</option>' +
    families.map((f) => '<option value="' + f.FamilyID + '">' + escapeHtml(f.FamilyName) + '</option>').join('');
  const cats = state.billingCategories.filter((c) => c.IsActive !== false && c.IsActive !== 0);
  elements.registerLearnerBillingSelect.innerHTML = '<option value="">Select category</option>' +
    cats.map((c) => '<option value="' + c.BillingCategoryID + '">' + escapeHtml(c.CategoryName) + ' (' + money(c.BaseAmount) + ')</option>').join('');
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
    table.innerHTML = '<tr><td colspan="18">No outstanding fees found for the selected year.</td></tr>';
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
  const yearInput = document.getElementById('outstandingFeesYear');
  const year = yearInput ? Number(yearInput.value) : new Date().getFullYear();
  try {
    const ofResult = await api('/api/invoices/outstanding-fees?year=' + year);
    state.outstandingFeesData = ofResult.data || ofResult;
    // Update year input if server returned a different year
    if (ofResult.year && yearInput && Number(yearInput.value) !== ofResult.year) {
      yearInput.value = ofResult.year;
    }
  } catch (e) {
    state.outstandingFeesData = [];
  }
  renderOutstandingFees();
}

function renderStudentStatusFilter() {
  document.querySelectorAll('[data-student-status]').forEach((button) => {
    button.classList.toggle('active', button.dataset.studentStatus === state.studentStatusFilter);
  });
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

  api('/api/transactions/summary').then((summary) => {
    elements.totalCredits.textContent = money(summary.totalCredit, school);
    elements.totalDebits.textContent = money(summary.totalDebit, school);
    elements.accountBalance.textContent = money(summary.netPosition, school);
    elements.outstandingAmount.textContent = money(summary.outstandingInvoices, school);
  }).catch(() => {
    elements.totalCredits.textContent = money(0, school);
    elements.totalDebits.textContent = money(0, school);
    elements.accountBalance.textContent = money(0, school);
    elements.outstandingAmount.textContent = money(0, school);
  });

  if (!elements.bankStatementsTable) {
    return;
  }

  api('/api/bank-statements').then((statements) => {
    elements.bankStatementsTable.innerHTML = statements.length
      ? statements.map((stmt) => `
        <tr>
          <td>${escapeHtml(stmt.FileName)}</td>
          <td>${dateOnly(stmt.StatementDate)}</td>
          <td>-</td>
          <td>${dateOnly(stmt.CreatedDate)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="4">No bank statements uploaded.</td></tr>';
  }).catch(() => {
    elements.bankStatementsTable.innerHTML = '<tr><td colspan="4">No bank statements uploaded.</td></tr>';
  });
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

function selectedInvoice(invoiceId) {
  return state.invoices.find((invoice) => invoice.InvoiceID === Number(invoiceId));
}

function openPaymentDialog(invoiceId) {
  const invoice = selectedInvoice(invoiceId);

  if (!invoice) {
    showToast('Invoice not found');
    return;
  }

  const school = state.schools.find((item) => item.SchoolID === invoice.SchoolID);
  const remaining = Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0));

  elements.paymentForm.elements.invoiceId.value = invoice.InvoiceID;
  elements.paymentInvoiceLabel.textContent = invoice.InvoiceNumber || `Invoice ${invoice.InvoiceID}`;
  elements.paymentRemainingLabel.textContent = money(remaining, school);
  elements.paymentAmountInput.max = remaining.toFixed(2);
  elements.paymentAmountInput.value = remaining > 0 ? remaining.toFixed(2) : '';
  elements.paymentDialog.classList.remove('hidden');
  document.body.classList.add('modal-open');
  window.setTimeout(() => elements.paymentAmountInput.focus(), 0);
}

function closePaymentDialog() {
  elements.paymentDialog.classList.add('hidden');
  document.body.classList.remove('modal-open');
  elements.paymentForm.reset();
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
  fields.website.value = school.Website || '';
  fields.address.value = school.Address || '';

  elements.accountSchoolStatus.textContent = school.SubscriptionStatus || 'Active';
  elements.accountSchoolStatus.className = school.SubscriptionStatus === 'Suspended' ? 'badge danger' : 'badge';
  setLogoSource(isUploadedLogo(school.LogoUrl) ? 'upload' : 'link');
  setLogoPreview(school.SchoolName, school.LogoUrl);
}

function renderSchoolUsers() {
  const school = getAccountSchool();

  elements.schoolUsersPanel.classList.toggle('hidden', !school);

  if (!school) {
    elements.schoolUsersTable.innerHTML = '<tr><td colspan="4">Select or create a school before adding users.</td></tr>';
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
        ${dateOnly(user.CreatedDate || user.createdDate)}
        <div class="actions stacked-actions">
          ${(user.IsActive ?? user.isActive) === false
            ? `<button class="ghost-button" data-action="activate-user" data-id="${user.UserID || user.userId}" type="button">Activate</button>`
            : `<button class="danger-button" data-action="deactivate-user" data-id="${user.UserID || user.userId}" type="button">Deactivate</button>`}
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4">No additional users yet.</td></tr>';
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

function renderMatchSuggestions() {
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

  elements.viewTitle.textContent = `Finance / ${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
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

    await api('/api/users/school-users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.schoolUserForm.reset();
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

elements.familyForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const schoolId = currentSchoolId();

    if (!schoolId) {
      throw new Error('Create a school before adding families');
    }

    setFormBusy(elements.familyForm, true, 'Adding...');
    const payload = {
      ...formData(elements.familyForm),
      schoolId
    };

    await api('/api/families', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.familyForm.reset();
    elements.parentsModulePanel.classList.remove('hidden');
    await refreshData();
    showToast('Family added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.familyForm, false);
  }
});

elements.studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const schoolId = currentSchoolId();

    if (!schoolId) {
      throw new Error('Create a school before adding students');
    }

    if (!elements.studentFamilySelect.value) {
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

elements.billingCategoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.billingCategoryForm, true, 'Saving...');
    const payload = formData(elements.billingCategoryForm);
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

if (elements.cancelClassEditButton) {
  elements.cancelClassEditButton.addEventListener('click', resetClassForm);
}

elements.attendanceDateInput.addEventListener('change', async () => {
  await refreshAttendance();
  renderAttendance();
});

elements.attendanceForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    if (!elements.attendanceStudentSelect.value) {
      throw new Error('Select a student before saving attendance');
    }

    setFormBusy(elements.attendanceForm, true, 'Saving...');
    await api('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(formData(elements.attendanceForm))
    });

    await refreshAttendance();
    renderAttendance();
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
    setFormBusy(elements.employeeForm, true, 'Adding...');
    const payload = formData(elements.employeeForm);
    payload.salary = Number(payload.salary || 0);
    payload.leaveBalance = Number(payload.leaveBalance || 21);

    await api('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.employeeForm.reset();
    await refreshData();
    showToast('Staff member added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.employeeForm, false);
  }
});

elements.leaveForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
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

document.querySelectorAll('[data-student-status]').forEach((button) => {
  button.addEventListener('click', async () => {
    state.studentStatusFilter = button.dataset.studentStatus;
    hideDepartureForm();
    renderStudentStatusFilter();
    await refreshData();
  });
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

elements.closePaymentDialogButton.addEventListener('click', closePaymentDialog);
elements.cancelPaymentButton.addEventListener('click', closePaymentDialog);

elements.paymentDialog.addEventListener('click', (event) => {
  if (event.target === elements.paymentDialog) {
    closePaymentDialog();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.paymentDialog.classList.contains('hidden')) {
    closePaymentDialog();
  }
});

elements.paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const invoiceId = Number(elements.paymentForm.elements.invoiceId.value);
    const amount = Number(elements.paymentAmountInput.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }

    setFormBusy(elements.paymentForm, true, 'Saving...');
    await api(`/api/invoices/${invoiceId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });

    closePaymentDialog();
    await refreshData();
    showToast('Payment recorded');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.paymentForm, false);
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
    const student = state.students.find(s => s.StudentID === Number(button.dataset.id));
    if (student) {
      switchView('registerLearner');
      setTimeout(() => {
        const form = elements.registerLearnerForm;
        if (!form) return;
        if (form.elements.familyId) form.elements.familyId.value = student.FamilyID || '';
        if (form.elements.billingCategoryId) form.elements.billingCategoryId.value = student.BillingCategoryID || '';
        if (form.elements.firstName) form.elements.firstName.value = student.FirstName || '';
        if (form.elements.lastName) form.elements.lastName.value = student.LastName || '';
        if (form.elements.dateOfBirth) form.elements.dateOfBirth.value = student.DateOfBirth ? student.DateOfBirth.slice(0, 10) : '';
        if (form.elements.className) form.elements.className.value = student.ClassName || '';
        if (form.elements.billingDate) form.elements.billingDate.value = student.BillingDate ? student.BillingDate.slice(0, 10) : '';
        if (form.elements.enrolledDate) form.elements.enrolledDate.value = student.EnrolledDate ? student.EnrolledDate.slice(0, 10) : '';
        state.editingStudentId = student.StudentID;
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.textContent = 'Save Changes';
      }, 100);
    }
    return;
  }

  if (action === 'inactivate-student') {
    showDepartureForm(id);
    return;
  }

  try {
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

    if (action === 'pay-invoice') {
      await api(`/api/invoices/${id}/pay`, { method: 'PUT' });
      showToast('Invoice marked as paid');
    }

    if (action === 'record-payment') {
      openPaymentDialog(id);
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

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

window.addEventListener('popstate', () => {
  switchView(viewFromPath(), { replace: true });
});

document.querySelectorAll('.finance-tab').forEach((button) => {
  button.addEventListener('click', () => switchFinanceTab(button.dataset.financeTab));
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


// Register Learner form
if (elements.registerLearnerForm) {
  elements.registerLearnerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = elements.registerLearnerForm;
    const data = formData(form);
    if (!data.familyId || !data.billingCategoryId || !data.firstName || !data.lastName) {
      showToast('Please fill in all required fields');
      return;
    }
    setFormBusy(form, true, 'Registering...');
    try {
      if (state.editingStudentId) {
        await api('/api/students/' + state.editingStudentId, { method: 'PUT', body: JSON.stringify(data) });
        state.editingStudentId = null;
        switchView('students');
      } else {
        await api('/api/students', { method: 'POST', body: JSON.stringify(data) });
      }
      form.reset();
      showToast('Learner registered successfully');
      await refreshData();
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

renderShell();
