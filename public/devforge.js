function readStoredUser() {
  const storedUser = localStorage.getItem('smsUser');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    localStorage.removeItem('smsToken');
    localStorage.removeItem('smsUser');
    localStorage.removeItem('smsLastActivity');
    return null;
  }
}

const state = {
  token: localStorage.getItem('smsToken'),
  user: readStoredUser(),
  schools: [],
  users: [],
  auditLogs: [],
  auditLoaded: false,
  faultReports: [],
  faultChangeMarker: null,
  emailStatus: null,
  dashboard: null
};

document.body.classList.add('school-user', 'platform-user');
document.body.dataset.portal = 'platform';
document.body.dataset.section = 'platform';
document.body.dataset.view = 'overview';

const elements = {
  workspace: document.getElementById('workspace'),
  statusPill: document.getElementById('statusPill'),
  sessionLabel: document.getElementById('sessionLabel'),
  logoutButton: document.getElementById('logoutButton'),
  viewTitle: document.getElementById('viewTitle'),
  activeSchools: document.getElementById('activeSchools'),
  suspendedSchools: document.getElementById('suspendedSchools'),
  totalUsers: document.getElementById('totalUsers'),
  totalStudents: document.getElementById('totalStudents'),
  auditCount: document.getElementById('auditCount'),
  schoolsTable: document.getElementById('schoolsTable'),
  devforgeUsersTable: document.getElementById('devforgeUsersTable'),
  auditTable: document.getElementById('auditTable'),
  faultReportsTable: document.getElementById('faultReportsTable'),
  faultSearchInput: document.getElementById('faultSearchInput'),
  faultStatusFilter: document.getElementById('faultStatusFilter'),
  openFaultCount: document.getElementById('openFaultCount'),
  archivedFaultCount: document.getElementById('archivedFaultCount'),
  totalFaultCount: document.getElementById('totalFaultCount'),
  emailProvider: document.getElementById('emailProvider'),
  emailConfigured: document.getElementById('emailConfigured'),
  emailSender: document.getElementById('emailSender'),
  schoolForm: document.getElementById('schoolForm'),
  devforgeUserForm: document.getElementById('devforgeUserForm'),
  emailTestForm: document.getElementById('emailTestForm'),
  schoolSearchInput: document.getElementById('schoolSearchInput'),
  userSearchInput: document.getElementById('userSearchInput'),
  auditSearchInput: document.getElementById('auditSearchInput'),
  auditTypeFilter: document.getElementById('auditTypeFilter'),
  auditDateFrom: document.getElementById('auditDateFrom'),
  auditDateTo: document.getElementById('auditDateTo'),
  toast: document.getElementById('toast')
};

const VIEW_TITLES = {
  overview: 'Kinder Care Hub Management Dashboard',
  schools: 'Schools',
  users: 'Users',
  audit: 'Audit',
  faults: 'Fault Reports',
  email: 'Email',
  account: 'Account'
};

const PRICING_PLANS = [
  { value: 'Standard', label: 'Standard - R 899 pm' },
  { value: 'Pro', label: 'Pro - R 1 199 pm' },
  { value: 'Pro+', label: 'Pro+ - TBA' }
];

let toastTimer = null;
let inactivityTimer = null;
let faultAutoRefreshTimer = null;
let faultChangeWatcherRunning = false;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function rememberActivity() {
  if (state.token) {
    localStorage.setItem('smsLastActivity', String(Date.now()));
  }
}

function redirectToDevForgeLogin() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  localStorage.removeItem('smsLastActivity');
  window.location.href = '/devforge-login';
}

function enforceInactivityTimeout() {
  if (!state.token) return false;
  const lastActivity = Number(localStorage.getItem('smsLastActivity') || Date.now());
  if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
    redirectToDevForgeLogin();
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

function dashboardPath(user) {
  if (user?.role === 'admin') {
    return '/devforge';
  }

  if (user?.role === 'parent') {
    return '/parent';
  }

  return '/sms';
}

function requirePlatformSession() {
  if (!state.token || !state.user) {
    window.location.href = '/devforge-login';
    return false;
  }

  if (enforceInactivityTimeout()) {
    return false;
  }

  if (state.user.role !== 'admin') {
    state.token = null;
    state.user = null;
    localStorage.removeItem('smsToken');
    localStorage.removeItem('smsUser');
    localStorage.removeItem('smsLastActivity');
    window.location.href = '/devforge-login';
    return false;
  }

  return true;
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
    const message = payload?.error?.message || payload?.error || 'Request failed';

    if (response.status === 401 || ([401, 403].includes(response.status) && /token|session/i.test(message))) {
      redirectToDevForgeLogin();
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

function stopFaultAutoRefresh() {
  if (faultAutoRefreshTimer) {
    window.clearInterval(faultAutoRefreshTimer);
    faultAutoRefreshTimer = null;
  }
  faultChangeWatcherRunning = false;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setFormBusy(form, busy, busyLabel) {
  const submitButton = form.querySelector('[type="submit"]');

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

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  localStorage.removeItem('smsLastActivity');
  if (inactivityTimer) {
    window.clearInterval(inactivityTimer);
    inactivityTimer = null;
  }
  stopFaultAutoRefresh();
  window.location.href = '/devforge-login';
}

function faultChangeMarkerFromReports(reports = []) {
  const latestFaultReportId = reports.reduce((max, report) => Math.max(max, Number(report.FaultReportID || 0)), 0);
  const latestChangedDate = reports.reduce((latest, report) => {
    const changed = String(report.UpdatedDate || report.CreatedDate || '');
    return changed && changed > latest ? changed : latest;
  }, '');

  return {
    latestFaultReportId,
    latestChangedDate: latestChangedDate || null
  };
}

function setFaultReports(reports = [], marker = null) {
  state.faultReports = Array.isArray(reports) ? reports : [];
  state.faultChangeMarker = marker || faultChangeMarkerFromReports(state.faultReports);
}

async function refreshFaultReports(options = {}) {
  if (!state.token || state.user?.role !== 'admin') {
    return;
  }

  try {
    const reports = await api('/api/faults?limit=100');
    setFaultReports(reports);
    renderFaultReportsTable();
  } catch (error) {
    if (!options.silent) {
      showToast(error.message);
    }
  }
}

function faultChangeQuery() {
  const marker = state.faultChangeMarker || faultChangeMarkerFromReports(state.faultReports);
  const params = new URLSearchParams({
    afterId: String(marker.latestFaultReportId || 0),
    timeoutMs: '25000'
  });
  if (marker.latestChangedDate) {
    params.set('afterChanged', marker.latestChangedDate);
  }
  return params.toString();
}

async function watchFaultChanges() {
  if (faultChangeWatcherRunning) {
    return;
  }

  faultChangeWatcherRunning = true;
  while (faultChangeWatcherRunning && state.token && state.user?.role === 'admin') {
    try {
      const change = await api(`/api/faults/changes?${faultChangeQuery()}`);
      if (change?.marker) {
        state.faultChangeMarker = change.marker;
      }
      if (change?.changed) {
        await refreshFaultReports({ silent: true });
      }
    } catch (error) {
      if (faultChangeWatcherRunning) {
        await delay(10000);
      }
    }
  }
  faultChangeWatcherRunning = false;
}

function startFaultAutoRefresh() {
  if (faultAutoRefreshTimer) {
    window.clearInterval(faultAutoRefreshTimer);
  }

  faultAutoRefreshTimer = window.setInterval(() => {
    refreshFaultReports({ silent: true }).catch(() => {});
  }, 30000);
  watchFaultChanges().catch(() => {});
}

async function refreshData(options = {}) {
  try {
    const snapshotPath = `/api/dashboard/devforge?auditLimit=0&faultLimit=100${options.force ? '&refresh=true' : ''}`;
    const [snapshot, emailStatus] = await Promise.all([
      api(snapshotPath),
      api('/api/email/status').catch(() => null)
    ]);

    state.dashboard = snapshot.dashboard || {};
    state.schools = snapshot.schools || [];
    state.users = snapshot.users || [];
    if (Array.isArray(snapshot.auditLogs) && snapshot.auditLogs.length) {
      state.auditLogs = snapshot.auditLogs;
      state.auditLoaded = true;
    }
    setFaultReports(snapshot.faultReports || []);
    state.snapshotMeta = snapshot.meta || null;
    state.emailStatus = emailStatus;
    renderData();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshAuditLogs(options = {}) {
  if (state.auditLoaded && !options.force) {
    return;
  }

  try {
    state.auditLogs = await api('/api/audit?limit=100');
    state.auditLoaded = true;
    renderAuditTable();
  } catch (error) {
    showToast(error.message);
  }
}

function renderShell() {
  if (!requirePlatformSession()) {
    return;
  }

  elements.workspace.classList.remove('hidden');
  elements.logoutButton.classList.remove('hidden');
  elements.sessionLabel.textContent = `${state.user.username || state.user.email} (Kinder Care Hub)`;
  elements.statusPill.textContent = 'Platform';
  startInactivityTimer();
  document.getElementById('profileUsername').textContent = state.user.username || '-';
  document.getElementById('profileEmail').textContent = state.user.email || '-';
  document.getElementById('profileRole').textContent = 'Kinder Care Hub admin';
  refreshData();
  startFaultAutoRefresh();
}

function renderData() {
  const dashboard = state.dashboard || {};
  const activeSchools = dashboard.activeSchools ?? state.schools.filter((school) => school.SubscriptionStatus !== 'Suspended').length;
  const suspendedSchools = dashboard.suspendedSchools ?? state.schools.filter((school) => school.SubscriptionStatus === 'Suspended').length;

  elements.activeSchools.textContent = activeSchools;
  elements.suspendedSchools.textContent = suspendedSchools;
  elements.totalUsers.textContent = state.users.length;
  elements.totalStudents.textContent = dashboard.totalStudents ?? 0;
  renderSchoolsTable();
  renderUsersTable();
  renderAuditTable();
  renderFaultReportsTable();
  renderEmailStatus();
}

function filteredSchools() {
  const search = String(elements.schoolSearchInput.value || '').trim().toLowerCase();

  if (!search) {
    return state.schools;
  }

  return state.schools.filter((school) => [
    school.SchoolName,
    school.ContactPerson,
    school.ContactEmail,
    school.SubscriptionPlan,
    school.SubscriptionStatus
  ].some((value) => String(value || '').toLowerCase().includes(search)));
}

function renderSchoolsTable() {
  const schools = filteredSchools();

  elements.schoolsTable.innerHTML = schools.map((school) => {
    const isActive = (school.SubscriptionStatus || 'Active') === 'Active';
    const statusClass = isActive ? 'badge' : 'badge danger';
    const plan = normalizePricingPlan(school.SubscriptionPlan);
    const messagingActive = isActive && ['Pro', 'Pro+'].includes(plan);
    const contactLines = [
      school.ContactPerson,
      school.ContactEmail,
      school.ContactPhone,
      school.Website
    ].filter(Boolean).map(escapeHtml);
    const schoolLines = [
      `School ID ${school.SchoolID}`,
      school.RegistrationNumber ? `Reg: ${escapeHtml(school.RegistrationNumber)}` : null,
      school.Address ? escapeHtml(school.Address) : null
    ].filter(Boolean);

    return `
      <tr>
        <td>
          <strong>${escapeHtml(school.SchoolName)}</strong>
          <span class="table-subtext">${schoolLines.join(' | ')}</span>
          <span class="table-subtext">${contactLines.join(' | ') || 'No contact details captured'}</span>
        </td>
        <td>
          <span class="${statusClass}">${escapeHtml(school.SubscriptionStatus || 'Active')}</span>
          <span class="table-subtext">Created ${dateOnly(school.CreatedDate)}</span>
          <span class="table-subtext">Updated ${dateOnly(school.UpdatedDate)}</span>
        </td>
        <td>
          <select class="thin-input" data-action="school-plan" data-id="${school.SchoolID}">
            ${PRICING_PLANS.map((option) => `
              <option value="${option.value}" ${plan === option.value ? 'selected' : ''}>${option.label}</option>
            `).join('')}
          </select>
          <span class="table-subtext">${escapeHtml(school.CurrencyCode || 'ZAR')} ${escapeHtml(school.CurrencySymbol || 'R')} | Fee ${money(school.DefaultMonthlyFee)}</span>
        </td>
        <td>
          <span class="${messagingActive ? 'badge' : 'badge muted'}">${messagingActive ? 'Active' : 'Off'}</span>
          <span class="table-subtext">Included on Pro and Pro+</span>
        </td>
        <td>
          <strong>${escapeHtml(school.UserCount || 0)}</strong>
          <span class="table-subtext">${escapeHtml(school.ActiveStudentCount || 0)} active students / ${escapeHtml(school.StudentCount || 0)} total</span>
          <span class="table-subtext">${escapeHtml(school.FamilyCount || 0)} families | ${escapeHtml(school.ActiveEmployeeCount || 0)} active staff</span>
          <span class="table-subtext">${escapeHtml(school.OpenInvoiceCount || 0)} open invoices | Outstanding ${money(school.OutstandingAmount)}</span>
        </td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="${isActive ? 'suspend-school' : 'activate-school'}" data-id="${school.SchoolID}" type="button">
              ${isActive ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6">No schools found.</td></tr>';
}

function normalizePricingPlan(plan) {
  const cleaned = String(plan || '').trim().toLowerCase();

  if (['pro+', 'pro plus', 'proplus', 'premium'].includes(cleaned)) {
    return 'Pro+';
  }

  if (['pro', 'professional'].includes(cleaned)) {
    return 'Pro';
  }

  return 'Standard';
}

function filteredUsers() {
  const search = String(elements.userSearchInput.value || '').trim().toLowerCase();

  if (!search) {
    return state.users;
  }

  return state.users.filter((user) => [
    user.Username || user.username,
    user.Email || user.email,
    user.Role || user.role
  ].some((value) => String(value || '').toLowerCase().includes(search)));
}

function renderUsersTable() {
  const users = filteredUsers();

  elements.devforgeUsersTable.innerHTML = users.map((user) => {
    const isActive = (user.IsActive ?? user.isActive) !== false;

    return `
      <tr>
        <td>${escapeHtml(user.Username || user.username)}</td>
        <td>${escapeHtml(user.Email || user.email)}</td>
        <td><span class="badge">${escapeHtml(user.Role || user.role || 'admin')}</span></td>
        <td>
          <span class="${isActive ? 'badge' : 'badge danger'}">${isActive ? 'Active' : 'Inactive'}</span>
          <div class="actions stacked-actions">
            ${isActive
              ? `<button class="danger-button" data-action="deactivate-devforge-user" data-id="${user.UserID || user.userId}" type="button">Deactivate</button>`
              : `<button class="ghost-button" data-action="activate-devforge-user" data-id="${user.UserID || user.userId}" type="button">Activate</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4">No Kinder Care Hub users found.</td></tr>';
}

function filteredAuditLogs() {
  const search = String(elements.auditSearchInput.value || '').trim().toLowerCase();
  const type = elements.auditTypeFilter.value;
  const fromDate = elements.auditDateFrom.value ? new Date(elements.auditDateFrom.value) : null;
  const toDate = elements.auditDateTo.value ? new Date(`${elements.auditDateTo.value}T23:59:59`) : null;

  return state.auditLogs.filter((log) => {
    const logDate = log.CreatedDate ? new Date(log.CreatedDate) : null;
    const matchesType = !type || String(log.Action || '').toLowerCase().includes(type.toLowerCase());
    const matchesFrom = !fromDate || (logDate && logDate >= fromDate);
    const matchesTo = !toDate || (logDate && logDate <= toDate);
    const matchesSearch = !search || [
      log.UserID,
      log.SchoolID,
      log.EntityName,
      log.EntityID,
      log.Action
    ].some((value) => String(value || '').toLowerCase().includes(search));

    return matchesType && matchesFrom && matchesTo && matchesSearch;
  });
}

function renderAuditTable() {
  const logs = filteredAuditLogs();

  elements.auditCount.textContent = logs.length;
  elements.auditTable.innerHTML = logs.map((log) => `
    <tr>
      <td>${dateOnly(log.CreatedDate)}</td>
      <td>${escapeHtml(log.UserID || '-')}</td>
      <td>${escapeHtml(log.SchoolID || '-')}</td>
      <td>
        <strong>${escapeHtml(log.Action)}</strong>
        <span class="table-subtext">${escapeHtml(log.EntityName)} ${escapeHtml(log.EntityID || '')}</span>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4">No audit activity found.</td></tr>';
}

function filteredFaultReports() {
  const search = String(elements.faultSearchInput?.value || '').trim().toLowerCase();
  const status = elements.faultStatusFilter?.value || 'active';

  return state.faultReports.filter((report) => {
    const reportStatus = report.Status || 'Open';
    const matchesStatus = status === 'active'
      ? ['Open', 'In Progress'].includes(reportStatus)
      : (!status || reportStatus === status);
    const matchesSearch = !search || [
      report.SchoolName,
      report.Username,
      report.Email,
      report.PagePath,
      report.ViewName,
      report.Remarks,
      report.Status
    ].some((value) => String(value || '').toLowerCase().includes(search));

    return matchesStatus && matchesSearch;
  });
}

function faultBadgeClass(status) {
  if (status === 'Open') {
    return 'badge danger';
  }

  if (status === 'In Progress') {
    return 'badge warn';
  }

  if (status === 'Resolved' || status === 'Closed') {
    return 'badge muted';
  }

  return 'badge';
}

function renderFaultReportsTable() {
  if (!elements.faultReportsTable) {
    return;
  }

  const reports = filteredFaultReports();
  const openCount = state.faultReports.filter((report) => ['Open', 'In Progress'].includes(report.Status)).length;
  const archivedCount = state.faultReports.filter((report) => report.Status === 'Closed').length;

  if (elements.openFaultCount) {
    elements.openFaultCount.textContent = openCount;
  }

  if (elements.archivedFaultCount) {
    elements.archivedFaultCount.textContent = archivedCount;
  }

  if (elements.totalFaultCount) {
    elements.totalFaultCount.textContent = state.faultReports.length;
  }

  elements.faultReportsTable.innerHTML = reports.map((report) => `
    <tr class="${report.Status === 'Closed' ? 'archived-row' : ''}">
      <td>${dateOnly(report.CreatedDate)}</td>
      <td>
        <strong>${escapeHtml(report.SchoolName || `School ${report.SchoolID}`)}</strong>
        <span class="table-subtext">Reported by ${escapeHtml(report.Email || report.Username || '-')}</span>
        <span class="table-subtext">${escapeHtml(report.ContactEmail || report.ContactPerson || '')}</span>
      </td>
      <td>
        <strong>${escapeHtml(report.PagePath)}</strong>
        <span class="table-subtext">${escapeHtml(report.ViewName || '-')}</span>
        <span class="table-subtext">Fault #${escapeHtml(report.FaultReportID)}</span>
      </td>
      <td>
        ${escapeHtml(report.Remarks)}
        ${report.UserAgent ? `<span class="table-subtext">${escapeHtml(report.UserAgent)}</span>` : ''}
      </td>
      <td>
        <span class="${faultBadgeClass(report.Status)}">${escapeHtml(report.Status === 'Closed' ? 'Archived / Closed' : report.Status)}</span>
        ${report.ResolvedByEmail || report.ResolvedByUsername ? `<span class="table-subtext">Resolved by ${escapeHtml(report.ResolvedByEmail || report.ResolvedByUsername)}</span>` : ''}
        <select class="thin-input fault-status-select" data-action="fault-status" data-id="${report.FaultReportID}">
          ${['Open', 'In Progress', 'Resolved', 'Closed'].map((status) => `
            <option value="${status}" ${report.Status === status ? 'selected' : ''}>${status}</option>
          `).join('')}
        </select>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No fault reports found.</td></tr>';
}

function renderEmailStatus() {
  if (!elements.emailProvider || !elements.emailConfigured || !elements.emailSender) {
    return;
  }

  const status = state.emailStatus || {};

  elements.emailProvider.textContent = status.provider || 'Not set';
  elements.emailConfigured.textContent = status.configured ? 'Configured' : 'Not configured';
  elements.emailSender.textContent = status.providers?.azure?.senderAddress || (status.configured ? status.fromEmail : '-');
}

function switchView(viewName) {
  document.body.dataset.portal = 'platform';
  document.body.dataset.section = 'platform';
  document.body.dataset.view = viewName;

  document.querySelectorAll('.nav-item').forEach((item) => {
    const isActive = item.dataset.view === viewName;
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

  elements.viewTitle.textContent = VIEW_TITLES[viewName] || viewName;
  elements.viewTitle.focus({ preventScroll: true });

  if (viewName === 'audit') {
    refreshAuditLogs().catch(() => {});
  }
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function dateOnly(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-ZA');
}

function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

elements.schoolSearchInput.addEventListener('input', renderSchoolsTable);
elements.userSearchInput.addEventListener('input', renderUsersTable);
elements.auditSearchInput.addEventListener('input', renderAuditTable);
elements.auditTypeFilter.addEventListener('change', renderAuditTable);
elements.auditDateFrom.addEventListener('change', renderAuditTable);
elements.auditDateTo.addEventListener('change', renderAuditTable);
elements.faultSearchInput?.addEventListener('input', renderFaultReportsTable);
elements.faultStatusFilter?.addEventListener('change', renderFaultReportsTable);
elements.faultReportsTable?.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-action="fault-status"]');

  if (!select) {
    return;
  }

  try {
    await api(`/api/faults/${select.dataset.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: select.value })
    });
    await refreshData({ force: true });
    showToast('Fault status updated');
  } catch (error) {
    showToast(error.message);
    await refreshData({ force: true });
  }
});

elements.schoolsTable?.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-action="school-plan"]');

  if (!select) {
    return;
  }

  try {
    const status = await api(`/api/schools/${select.dataset.id}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ subscriptionPlan: select.value })
    });
    await refreshData({ force: true });
    showToast(status.active ? 'Messaging activated for this plan' : 'Messaging package is off for this plan');
  } catch (error) {
    showToast(error.message);
    await refreshData({ force: true });
  }
});

elements.schoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.schoolForm, true, 'Adding...');
    const payload = formData(elements.schoolForm);
    payload.defaultMonthlyFee = Number(payload.defaultMonthlyFee || 0);

    await api('/api/schools', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.schoolForm.reset();
    await refreshData({ force: true });
    showToast('School added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.schoolForm, false);
  }
});

elements.devforgeUserForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.devforgeUserForm, true, 'Adding...');
    await api('/api/users/devforge-users', {
      method: 'POST',
      body: JSON.stringify(formData(elements.devforgeUserForm))
    });

    elements.devforgeUserForm.reset();
    await refreshData({ force: true });
    showToast('Kinder Care Hub user added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.devforgeUserForm, false);
  }
});

elements.emailTestForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.emailTestForm, true, 'Sending...');
    const result = await api('/api/email/test', {
      method: 'POST',
      body: JSON.stringify(formData(elements.emailTestForm))
    });

    await refreshData({ force: true });
    showToast(result.sent ? 'Test email sent' : result.reason || 'Email not sent');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.emailTestForm, false);
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === 'open-schools') {
    switchView('schools');
    return;
  }

  if (action === 'open-users') {
    switchView('users');
    return;
  }

  if (action === 'open-audit') {
    switchView('audit');
    return;
  }

  if (action === 'open-faults') {
    switchView('faults');
    return;
  }

  if (action === 'open-email') {
    switchView('email');
    return;
  }

  try {
    if (action === 'suspend-school') {
      await api(`/api/schools/${button.dataset.id}/suspend`, { method: 'PUT' });
      showToast('School suspended');
    }

    if (action === 'activate-school') {
      await api(`/api/schools/${button.dataset.id}/activate`, { method: 'PUT' });
      showToast('School activated');
    }

    if (action === 'activate-devforge-user' || action === 'deactivate-devforge-user') {
      const nextAction = action === 'activate-devforge-user' ? 'activate' : 'deactivate';
      await api(`/api/users/devforge-users/${button.dataset.id}/${nextAction}`, { method: 'PUT' });
      showToast(nextAction === 'activate' ? 'User activated' : 'User deactivated');
    }

    await refreshData({ force: true });
  } catch (error) {
    showToast(error.message);
  }
});

elements.logoutButton.addEventListener('click', clearSession);

renderShell();
