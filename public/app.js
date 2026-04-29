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

const state = {
  token: localStorage.getItem('smsToken'),
  user: JSON.parse(localStorage.getItem('smsUser') || 'null'),
  schools: [],
  invoices: [],
  selectedAccountSchoolId: null,
  selectedSettingsSchoolId: null
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
  registerMessage: document.getElementById('registerMessage'),
  schoolForm: document.getElementById('schoolForm'),
  accountSchoolForm: document.getElementById('accountSchoolForm'),
  accountSchoolSelect: document.getElementById('accountSchoolSelect'),
  accountSchoolSelector: document.getElementById('accountSchoolSelector'),
  accountLogoPreview: document.getElementById('accountLogoPreview'),
  accountLogoUrlInput: document.getElementById('accountLogoUrlInput'),
  accountLogoFileInput: document.getElementById('accountLogoFileInput'),
  logoLinkField: document.getElementById('logoLinkField'),
  logoUploadField: document.getElementById('logoUploadField'),
  accountSchoolStatus: document.getElementById('accountSchoolStatus'),
  settingsForm: document.getElementById('settingsForm'),
  settingsSchoolSelect: document.getElementById('settingsSchoolSelect'),
  settingsSchoolSelector: document.getElementById('settingsSchoolSelector'),
  currencySelect: document.getElementById('currencySelect'),
  invoiceForm: document.getElementById('invoiceForm'),
  invoiceSchool: document.getElementById('invoiceSchool'),
  schoolsTable: document.getElementById('schoolsTable'),
  invoicesTable: document.getElementById('invoicesTable'),
  toast: document.getElementById('toast')
};

function currencyByCode(code) {
  return CURRENCIES.find((currency) => currency.code === code) || CURRENCIES[0];
}

function currencyLabel(code) {
  const currency = currencyByCode(code);
  return `${currency.name} - ${currency.symbol}`;
}

function currencySymbol(school) {
  return school?.CurrencySymbol || currencyByCode(school?.CurrencyCode || 'ZAR').symbol;
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
    throw new Error(payload?.error?.message || payload?.error || 'Request failed');
  }

  return payload;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  window.setTimeout(() => elements.toast.classList.add('hidden'), 3200);
}

function showFormMessage(element, message, type = 'error') {
  element.textContent = message;
  element.className = `form-message ${type}`;
  element.classList.toggle('hidden', !message);
}

function setFormBusy(form, busy, busyLabel) {
  const submitButton = form.querySelector('[type="submit"]');

  if (!submitButton) {
    return;
  }

  if (!submitButton.dataset.defaultText) {
    submitButton.dataset.defaultText = submitButton.textContent;
  }

  submitButton.disabled = busy;
  submitButton.textContent = busy ? busyLabel : submitButton.dataset.defaultText;
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
  state.selectedAccountSchoolId = null;
  state.selectedSettingsSchoolId = null;
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
  elements.sessionLabel.textContent = signedIn ? `${state.user.username || state.user.email} (${state.user.role})` : 'Signed out';
  elements.statusPill.textContent = signedIn ? 'Signed in' : 'Ready';

  if (signedIn) {
    document.getElementById('profileUsername').textContent = state.user.username || '-';
    document.getElementById('profileEmail').textContent = state.user.email;
    document.getElementById('profileRole').textContent = state.user.role;
    document.getElementById('profileSchool').textContent = state.user.schoolId || 'Global';
    document.getElementById('profileSchoolName').textContent = '-';
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
  renderAccount();
  renderSettings();
  renderAdminControls();
}

function renderMetrics() {
  const displaySchool = getSettingsSchool();
  const pending = state.invoices
    .filter((invoice) => invoice.Status === 'Pending' || invoice.Status === 'Overdue')
    .reduce((total, invoice) => total + Number(invoice.Amount || 0), 0);

  const paid = state.invoices
    .filter((invoice) => invoice.Status === 'Paid')
    .reduce((total, invoice) => total + Number(invoice.Amount || 0), 0);

  document.getElementById('schoolCount').textContent = state.schools.length;
  document.getElementById('invoiceCount').textContent = state.invoices.length;
  document.getElementById('pendingValue').textContent = money(pending, displaySchool);
  document.getElementById('paidValue').textContent = money(paid, displaySchool);
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
        <td>
          <strong>${escapeHtml(school.ContactPerson || school.ContactEmail || '-')}</strong>
          <span class="table-subtext">${escapeHtml(school.ContactPhone || school.ContactEmail || '')}</span>
        </td>
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
        <td>${money(invoice.Amount, school)}</td>
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
        <span>${escapeHtml(school.ContactPerson || school.ContactEmail || 'No contact details')}</span>
      </div>
      <span>${escapeHtml(school.SubscriptionStatus || 'Active')}</span>
    </div>
  `).join('') || '<p>No schools yet.</p>';

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
  document.getElementById('profileSchoolName').textContent = school?.SchoolName || (isAdmin ? 'Global admin' : '-');

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

  elements.currencySelect.innerHTML = CURRENCIES.map((currency) => `
    <option value="${currency.code}">${escapeHtml(`${currency.name} - ${currency.symbol}`)}</option>
  `).join('');
  elements.currencySelect.value = school.CurrencyCode || 'ZAR';

  document.getElementById('settingsSchoolName').textContent = school.SchoolName || '-';
  document.getElementById('settingsCurrencyLabel').textContent = currencyLabel(school.CurrencyCode || 'ZAR');
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

function switchAuthMode(mode) {
  const showRegister = mode === 'register';

  elements.loginForm.classList.toggle('hidden', showRegister);
  elements.registerForm.classList.toggle('hidden', !showRegister);
  showFormMessage(elements.registerMessage, '');

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = formData(elements.loginForm);
    payload.schoolId = Number(payload.schoolId);
    payload.username = String(payload.username || '').trim().toLowerCase();

    if (!Number.isInteger(payload.schoolId) || payload.schoolId < 0 || !payload.username || !payload.password) {
      showToast('School ID, username, and password are required');
      return;
    }

    setFormBusy(elements.loginForm, true, 'Signing in...');
    const result = await api('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setSession(result);
    showToast('Signed in successfully');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.loginForm, false);
  }
});

elements.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = formData(elements.registerForm);
    payload.username = String(payload.username || '').trim().toLowerCase();

    if (!validateUsername(payload.username)) {
      showFormMessage(elements.registerMessage, 'Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
      return;
    }

    if (payload.password.length < 8) {
      showFormMessage(elements.registerMessage, 'Password must be at least 8 characters long');
      return;
    }

    if (payload.role === 'school') {
      payload.contactEmail = payload.email;
    }

    showFormMessage(elements.registerMessage, 'Checking school registration...', 'info');
    setFormBusy(elements.registerForm, true, 'Checking...');

    const result = await api('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showFormMessage(elements.registerMessage, '');
    setSession(result);
    showToast('Account created');
  } catch (error) {
    showFormMessage(elements.registerMessage, error.message);
    showToast(error.message);
  } finally {
    setFormBusy(elements.registerForm, false);
  }
});

let schoolNameCheckTimer;
let schoolNameAbortController;

elements.registerForm.elements.schoolName.addEventListener('input', () => {
  window.clearTimeout(schoolNameCheckTimer);
  showFormMessage(elements.registerMessage, '');

  const schoolName = elements.registerForm.elements.schoolName.value.trim();

  if (schoolName.length < 3) {
    return;
  }

  schoolNameCheckTimer = window.setTimeout(async () => {
    try {
      schoolNameAbortController?.abort();
      schoolNameAbortController = new AbortController();

      showFormMessage(elements.registerMessage, 'Checking school name...', 'info');

      const response = await fetch(`/api/schools/availability/school-name?schoolName=${encodeURIComponent(schoolName)}`, {
        signal: schoolNameAbortController.signal
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not check school name');
      }

      showFormMessage(
        elements.registerMessage,
        payload.available ? 'School name is available' : 'This school is already registered',
        payload.available ? 'success' : 'error'
      );
    } catch (error) {
      if (error.name !== 'AbortError') {
        showFormMessage(elements.registerMessage, '');
      }
    }
  }, 450);
});

elements.schoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    setFormBusy(elements.schoolForm, true, 'Creating...');
    await api('/api/schools', {
      method: 'POST',
      body: JSON.stringify(formData(elements.schoolForm))
    });

    elements.schoolForm.reset();
    await refreshData();
    showToast('School created');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(elements.schoolForm, false);
  }
});

elements.accountSchoolSelect.addEventListener('change', () => {
  state.selectedAccountSchoolId = Number(elements.accountSchoolSelect.value);
  renderAccount();
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
  } finally {
    setFormBusy(elements.invoiceForm, false);
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

elements.logoutButton.addEventListener('click', () => {
  clearSession();
  showToast('Signed out');
});

renderShell();
