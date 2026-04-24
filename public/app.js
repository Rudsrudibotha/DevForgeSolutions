const state = {
  token: localStorage.getItem('smsToken'),
  user: JSON.parse(localStorage.getItem('smsUser') || 'null'),
  schools: [],
  invoices: []
};

const elements = {
  authPanel: document.getElementById('authPanel'),
  workspace: document.getElementById('workspace'),
  statusPill: document.getElementById('statusPill'),
  sessionLabel: document.getElementById('sessionLabel'),
  logoutButton: document.getElementById('logoutButton'),
  viewTitle: document.getElementById('viewTitle'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  registerRole: document.getElementById('registerRole'),
  schoolNameGroup: document.getElementById('schoolNameGroup'),
  schoolForm: document.getElementById('schoolForm'),
  invoiceForm: document.getElementById('invoiceForm'),
  invoiceSchool: document.getElementById('invoiceSchool'),
  schoolsTable: document.getElementById('schoolsTable'),
  invoicesTable: document.getElementById('invoicesTable'),
  toast: document.getElementById('toast')
};

function money(value) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value || 0));
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
    throw new Error(payload?.error?.message || payload?.error || 'Request failed');
  }

  return payload;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  window.setTimeout(() => elements.toast.classList.add('hidden'), 3200);
}

function setSession(authPayload) {
  state.token = authPayload.token;
  state.user = authPayload.user;
  localStorage.setItem('smsToken', state.token);
  localStorage.setItem('smsUser', JSON.stringify(state.user));
  renderShell();
}

function clearSession() {
  state.token = null;
  state.user = null;
  state.schools = [];
  state.invoices = [];
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  renderShell();
}

function renderShell() {
  const signedIn = Boolean(state.token && state.user);

  document.body.classList.toggle('signed-out', !signedIn);
  elements.authPanel.classList.toggle('hidden', signedIn);
  elements.workspace.classList.toggle('hidden', !signedIn);
  elements.logoutButton.classList.toggle('hidden', !signedIn);
  elements.sessionLabel.textContent = signedIn ? `${state.user.email} (${state.user.role})` : 'Signed out';
  elements.statusPill.textContent = signedIn ? 'Signed in' : 'Ready';

  if (signedIn) {
    document.getElementById('profileEmail').textContent = state.user.email;
    document.getElementById('profileRole').textContent = state.user.role;
    document.getElementById('profileSchool').textContent = state.user.schoolId || 'Global';
    refreshData();
  }
}

async function refreshData() {
  try {
    const [schools, invoices] = await Promise.all([
      api('/api/schools'),
      api('/api/invoices')
    ]);

    state.schools = schools;
    state.invoices = invoices;
    renderData();
  } catch (error) {
    showToast(error.message);
  }
}

function renderData() {
  renderMetrics();
  renderSchoolOptions();
  renderSchoolsTable();
  renderInvoicesTable();
  renderRecentLists();
  renderAdminControls();
}

function renderMetrics() {
  const pending = state.invoices
    .filter((invoice) => invoice.Status === 'Pending' || invoice.Status === 'Overdue')
    .reduce((total, invoice) => total + Number(invoice.Amount || 0), 0);

  const paid = state.invoices
    .filter((invoice) => invoice.Status === 'Paid')
    .reduce((total, invoice) => total + Number(invoice.Amount || 0), 0);

  document.getElementById('schoolCount').textContent = state.schools.length;
  document.getElementById('invoiceCount').textContent = state.invoices.length;
  document.getElementById('pendingValue').textContent = money(pending);
  document.getElementById('paidValue').textContent = money(paid);
}

function renderSchoolOptions() {
  elements.invoiceSchool.innerHTML = state.schools
    .map((school) => `<option value="${school.SchoolID}">${escapeHtml(school.SchoolName)}</option>`)
    .join('');
}

function renderSchoolsTable() {
  elements.schoolsTable.innerHTML = state.schools.map((school) => {
    const isActive = school.SubscriptionStatus === 'Active';
    const statusClass = isActive ? 'badge' : 'badge danger';

    return `
      <tr>
        <td>${escapeHtml(school.SchoolName)}</td>
        <td>${escapeHtml(school.ContactEmail || '-')}</td>
        <td><span class="${statusClass}">${escapeHtml(school.SubscriptionStatus || 'Active')}</span></td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="${isActive ? 'suspend-school' : 'activate-school'}" data-id="${school.SchoolID}" type="button">
              ${isActive ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderInvoicesTable() {
  elements.invoicesTable.innerHTML = state.invoices.map((invoice) => {
    const school = state.schools.find((item) => item.SchoolID === invoice.SchoolID);
    const statusClass = invoice.Status === 'Paid' ? 'badge' : invoice.Status === 'Overdue' ? 'badge danger' : 'badge warn';

    return `
      <tr>
        <td>${escapeHtml(invoice.InvoiceNumber)}</td>
        <td>${escapeHtml(school?.SchoolName || `School ${invoice.SchoolID}`)}</td>
        <td>${money(invoice.Amount)}</td>
        <td><span class="${statusClass}">${escapeHtml(invoice.Status)}</span></td>
        <td>${dateOnly(invoice.DueDate)}</td>
        <td>
          <div class="actions">
            <button class="ghost-button" data-action="pay-invoice" data-id="${invoice.InvoiceID}" type="button">Mark paid</button>
            <button class="danger-button" data-action="delete-invoice" data-id="${invoice.InvoiceID}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRecentLists() {
  document.getElementById('recentSchools').innerHTML = state.schools.slice(0, 5).map((school) => `
    <div class="compact-item">
      <div>
        <strong>${escapeHtml(school.SchoolName)}</strong>
        <span>${escapeHtml(school.ContactEmail || 'No contact email')}</span>
      </div>
      <span>${escapeHtml(school.SubscriptionStatus || 'Active')}</span>
    </div>
  `).join('') || '<p>No schools yet.</p>';

  document.getElementById('recentInvoices').innerHTML = state.invoices.slice(0, 5).map((invoice) => `
    <div class="compact-item">
      <div>
        <strong>${escapeHtml(invoice.InvoiceNumber)}</strong>
        <span>${dateOnly(invoice.DueDate)}</span>
      </div>
      <span>${money(invoice.Amount)}</span>
    </div>
  `).join('') || '<p>No invoices yet.</p>';
}

function renderAdminControls() {
  const isAdmin = state.user?.role === 'admin';
  elements.schoolForm.classList.toggle('hidden', !isAdmin);
  elements.invoiceForm.classList.toggle('hidden', !isAdmin);

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.disabled = !isAdmin;
    button.classList.toggle('hidden', !isAdmin);
  });
}

function switchView(viewName) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `${viewName}View`);
  });

  elements.viewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function switchAuthMode(mode) {
  const showRegister = mode === 'register';

  elements.loginForm.classList.toggle('hidden', showRegister);
  elements.registerForm.classList.toggle('hidden', !showRegister);

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });
}

function renderRegistrationFields() {
  const isSchool = elements.registerRole.value === 'school';
  const schoolNameInput = elements.schoolNameGroup.querySelector('input');

  elements.schoolNameGroup.classList.toggle('hidden', !isSchool);
  schoolNameInput.required = isSchool;
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = formData(elements.loginForm);
    const result = await api('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setSession(result);
    showToast('Signed in successfully');
  } catch (error) {
    showToast(error.message);
  }
});

elements.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = formData(elements.registerForm);

    if (payload.role === 'school') {
      payload.contactEmail = payload.email;
    }

    const result = await api('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setSession(result);
    showToast('Account created');
  } catch (error) {
    showToast(error.message);
  }
});

elements.schoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await api('/api/schools', {
      method: 'POST',
      body: JSON.stringify(formData(elements.schoolForm))
    });

    elements.schoolForm.reset();
    await refreshData();
    showToast('School created');
  } catch (error) {
    showToast(error.message);
  }
});

elements.invoiceForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = formData(elements.invoiceForm);
    payload.schoolId = Number(payload.schoolId);
    payload.amount = Number(payload.amount);
    payload.dueDate = payload.dueDate || null;

    await api('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    elements.invoiceForm.reset();
    await refreshData();
    showToast('Invoice created');
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  try {
    if (action === 'pay-invoice') {
      await api(`/api/invoices/${id}/pay`, { method: 'PUT' });
      showToast('Invoice marked as paid');
    }

    if (action === 'delete-invoice') {
      await api(`/api/invoices/${id}`, { method: 'DELETE' });
      showToast('Invoice deleted');
    }

    if (action === 'suspend-school') {
      await api(`/api/schools/${id}/suspend`, { method: 'PUT' });
      showToast('School suspended');
    }

    if (action === 'activate-school') {
      await api(`/api/schools/${id}/activate`, { method: 'PUT' });
      showToast('School activated');
    }

    await refreshData();
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

document.querySelectorAll('[data-auth-mode]').forEach((button) => {
  button.addEventListener('click', () => switchAuthMode(button.dataset.authMode));
});

elements.registerRole.addEventListener('change', renderRegistrationFields);

elements.logoutButton.addEventListener('click', () => {
  clearSession();
  showToast('Signed out');
});

renderRegistrationFields();
renderShell();
