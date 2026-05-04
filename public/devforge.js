const state = {
  token: localStorage.getItem('smsToken'),
  user: JSON.parse(localStorage.getItem('smsUser') || 'null'),
  schools: [],
  users: [],
  auditLogs: [],
  dashboard: null
};

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
  schoolForm: document.getElementById('schoolForm'),
  devforgeUserForm: document.getElementById('devforgeUserForm'),
  schoolSearchInput: document.getElementById('schoolSearchInput'),
  userSearchInput: document.getElementById('userSearchInput'),
  auditSearchInput: document.getElementById('auditSearchInput'),
  auditTypeFilter: document.getElementById('auditTypeFilter'),
  auditDateFrom: document.getElementById('auditDateFrom'),
  auditDateTo: document.getElementById('auditDateTo'),
  toast: document.getElementById('toast')
};

const VIEW_TITLES = {
  overview: 'DevForge Solutions Management Dashboard',
  schools: 'Schools',
  users: 'Users',
  audit: 'Audit',
  account: 'Account'
};

let toastTimer = null;

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

  if (state.user.role !== 'admin') {
    window.location.href = dashboardPath(state.user);
    return false;
  }

  return true;
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
    const message = payload?.error?.message || payload?.error || 'Request failed';

    if ([401, 403].includes(response.status) && /token|session/i.test(message)) {
      clearSession();
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
  window.location.href = '/devforge-login';
}

async function refreshData() {
  try {
    const [dashboard, schools, users, auditLogs] = await Promise.all([
      api('/api/dashboard'),
      api('/api/schools'),
      api('/api/users/devforge-users'),
      api('/api/audit?limit=100')
    ]);

    state.dashboard = dashboard;
    state.schools = schools;
    state.users = users;
    state.auditLogs = auditLogs;
    renderData();
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
  elements.sessionLabel.textContent = `${state.user.username || state.user.email} (DevForge)`;
  elements.statusPill.textContent = 'Platform';
  document.getElementById('profileUsername').textContent = state.user.username || '-';
  document.getElementById('profileEmail').textContent = state.user.email || '-';
  document.getElementById('profileRole').textContent = 'DevForge admin';
  refreshData();
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
    school.SubscriptionStatus
  ].some((value) => String(value || '').toLowerCase().includes(search)));
}

function renderSchoolsTable() {
  const schools = filteredSchools();

  elements.schoolsTable.innerHTML = schools.map((school) => {
    const isActive = (school.SubscriptionStatus || 'Active') === 'Active';
    const statusClass = isActive ? 'badge' : 'badge danger';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(school.SchoolName)}</strong>
          <span class="table-subtext">School ID ${school.SchoolID}</span>
        </td>
        <td><span class="${statusClass}">${escapeHtml(school.SubscriptionStatus || 'Active')}</span></td>
        <td>${escapeHtml(school.UserCount || '-')}</td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="${isActive ? 'suspend-school' : 'activate-school'}" data-id="${school.SchoolID}" type="button">
              ${isActive ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4">No schools found.</td></tr>';
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
  }).join('') || '<tr><td colspan="4">No DevForge users found.</td></tr>';
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

function switchView(viewName) {
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
    await refreshData();
    showToast('School added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.schoolForm, false);
  }
});

elements.devforgeUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.devforgeUserForm, true, 'Adding...');
    await api('/api/users/devforge-users', {
      method: 'POST',
      body: JSON.stringify(formData(elements.devforgeUserForm))
    });

    elements.devforgeUserForm.reset();
    await refreshData();
    showToast('DevForge user added');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.devforgeUserForm, false);
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

    await refreshData();
  } catch (error) {
    showToast(error.message);
  }
});

elements.logoutButton.addEventListener('click', clearSession);

renderShell();
