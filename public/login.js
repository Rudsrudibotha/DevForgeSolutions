const LOGIN_CONFIG = {
  '/devforge-login': {
    type: 'devforge',
    title: 'Kinder Care Hub',
    subtitle: 'AAD Login',
    identifierLabel: 'Email Address',
    showSchoolId: false,
    redirect: '/devforge',
    brandMark: 'Kinder Care Hub',
    pageClass: 'devforge-login',
    usePasswordLogin: false
  },
  '/school-login': {
    type: 'school',
    title: 'Kinder Care Hub',
    subtitle: 'School Portal Login',
    identifierLabel: 'Email Address',
    showSchoolId: true,
    redirect: '/sms',
    brandMark: 'Kinder Care Hub',
    pageClass: 'school-login',
    usePasswordLogin: false
  },
  '/parent-login': {
    type: 'parent',
    title: 'Kinder Care Hub',
    subtitle: 'Parent Portal Login',
    identifierLabel: 'Email / Cell Number',
    showSchoolId: false,
    redirect: '/parent',
    brandMark: 'Kinder Care Hub',
    pageClass: 'parent-login',
    usePasswordLogin: false
  }
};

const elements = {
  loginForm: document.getElementById('loginForm'),
  loginMessage: document.getElementById('loginMessage'),
  loginTitle: document.getElementById('loginTitle'),
  loginSubtitle: document.getElementById('loginSubtitle'),
  brandMark: document.getElementById('brandMark'),
  schoolIdField: document.getElementById('schoolIdField'),
  identifierField: document.getElementById('identifierField'),
  identifierLabel: document.getElementById('identifierLabel'),
  passwordField: document.getElementById('passwordField'),
  passwordSignIn: document.getElementById('passwordSignIn'),
  azureSignIn: document.getElementById('azureSignIn'),
  googleSignIn: document.getElementById('googleSignIn'),
  microsoftSignIn: document.getElementById('microsoftSignIn'),
  schoolRegisterLink: document.getElementById('schoolRegisterLink'),
  parentRegisterLink: document.getElementById('parentRegisterLink')
};

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

function currentConfig() {
  return LOGIN_CONFIG[window.location.pathname] || LOGIN_CONFIG['/school-login'];
}

function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  return fetch(path, { ...options, headers }).then(async (response) => {
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.error || 'Request failed');
    }

    return payload;
  });
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
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

  form.setAttribute('aria-busy', String(busy));
  submitButton.disabled = busy;
  submitButton.textContent = busy ? busyLabel : submitButton.dataset.defaultText;
}

function canUseConfiguredDashboard(user, config = currentConfig()) {
  if (config.type === 'devforge') {
    return user?.role === 'admin';
  }

  if (config.type === 'school') {
    return user?.role === 'school' || user?.role === 'admin';
  }

  if (config.type === 'parent') {
    return user?.role === 'parent';
  }

  return false;
}

function dashboardPath(user, config = currentConfig()) {
  if (canUseConfiguredDashboard(user, config)) {
    return config.redirect;
  }

  if (user?.role === 'admin') {
    return '/devforge';
  }

  if (user?.role === 'parent') {
    return '/parent';
  }

  return '/sms';
}

function setSession(authPayload) {
  const config = currentConfig();
  localStorage.setItem('smsToken', authPayload.token);
  localStorage.setItem('smsUser', JSON.stringify(authPayload.user));
  localStorage.setItem('smsLastActivity', String(Date.now()));
  window.location.href = dashboardPath(authPayload.user, config);
}

function clearSession() {
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  localStorage.removeItem('smsLastActivity');
}

function schoolIdForProvider(config) {
  if (config.type !== 'school') {
    return '';
  }

  const schoolId = Number(elements.loginForm.elements.schoolId.value);

  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    showFormMessage(elements.loginMessage, 'School ID is required for school login');
    elements.loginForm.elements.schoolId.focus();
    return null;
  }

  return String(schoolId);
}

function startProviderSignIn(provider, config) {
  const schoolId = schoolIdForProvider(config);

  if (schoolId === null) {
    return;
  }

  const params = new URLSearchParams({ type: config.type });

  if (schoolId) {
    params.set('schoolId', schoolId);
  }

  window.location.href = `/auth/${provider}?${params.toString()}`;
}

function configureLoginPage() {
  const config = currentConfig();
  const fields = elements.loginForm.elements;

  document.body.className = config.pageClass;
  document.title = `${config.title} - ${config.subtitle}`;
  elements.loginTitle.textContent = config.title;
  elements.loginSubtitle.textContent = config.subtitle;
  elements.brandMark.alt = config.brandMark;
  elements.identifierLabel.textContent = config.identifierLabel;
  fields.loginType.value = config.type;
  fields.schoolId.required = config.showSchoolId;
  fields.schoolId.disabled = !config.showSchoolId;
  elements.schoolIdField.classList.toggle('hidden', !config.showSchoolId);
  fields.identifier.required = config.usePasswordLogin;
  fields.identifier.disabled = !config.usePasswordLogin;
  fields.password.required = config.usePasswordLogin;
  fields.password.disabled = !config.usePasswordLogin;
  elements.identifierField.classList.toggle('hidden', !config.usePasswordLogin);
  elements.passwordField.classList.toggle('hidden', !config.usePasswordLogin);
  elements.passwordSignIn.classList.toggle('hidden', !config.usePasswordLogin);
  elements.passwordSignIn.disabled = !config.usePasswordLogin;

  if (config.type === 'devforge') {
    fields.identifier.type = 'email';
    fields.identifier.autocomplete = 'email';
  } else {
    fields.identifier.type = 'text';
    fields.identifier.autocomplete = 'username';
  }

  if (elements.azureSignIn) {
    elements.azureSignIn.classList.toggle('hidden', config.type !== 'devforge');
    elements.azureSignIn.onclick = () => {
      window.location.href = '/auth/azure';
    };
  }

  const providerVisible = config.type === 'school' || config.type === 'parent';

  if (elements.googleSignIn) {
    elements.googleSignIn.classList.toggle('hidden', !providerVisible);
    elements.googleSignIn.onclick = () => startProviderSignIn('google', config);
  }

  if (elements.microsoftSignIn) {
    elements.microsoftSignIn.classList.toggle('hidden', !providerVisible);
    elements.microsoftSignIn.onclick = () => startProviderSignIn('microsoft', config);
  }

  if (elements.schoolRegisterLink) {
    elements.schoolRegisterLink.classList.toggle('hidden', config.type !== 'school');
  }

  if (elements.parentRegisterLink) {
    elements.parentRegisterLink.classList.toggle('hidden', config.type !== 'parent');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  configureLoginPage();
  const notice = sessionStorage.getItem('loginNotice');

  if (notice) {
    sessionStorage.removeItem('loginNotice');
    showFormMessage(elements.loginMessage, notice, 'info');
  }

  const token = localStorage.getItem('smsToken');
  const user = readStoredUser();
  const config = currentConfig();

  if (token && user) {
    // Verify token is still valid before redirecting
    fetch('/api/users/session', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => {
        if (!r.ok) {
          clearSession();
          return;
        }

        if (canUseConfiguredDashboard(user, config)) {
          window.location.href = config.redirect;
        }
      })
      .catch(clearSession);
  }
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const config = currentConfig();

  if (!config.usePasswordLogin) {
    return;
  }

  try {
    const payload = formData(elements.loginForm);
    payload.identifier = String(payload.identifier || '').trim().toLowerCase();
    payload.loginType = config.type;

    if (config.showSchoolId) {
      payload.schoolId = Number(payload.schoolId);

      if (!Number.isInteger(payload.schoolId) || payload.schoolId <= 0) {
        showFormMessage(elements.loginMessage, 'School ID is required');
        return;
      }
    } else {
      delete payload.schoolId;
    }

    if (!payload.identifier || !payload.password) {
      showFormMessage(elements.loginMessage, 'Login identifier and password are required');
      return;
    }

    showFormMessage(elements.loginMessage, '');
    setFormBusy(elements.loginForm, true, 'Signing in...');
    const result = await api('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setSession(result);
  } catch (error) {
    showFormMessage(elements.loginMessage, error.message);
  } finally {
    setFormBusy(elements.loginForm, false);
  }
});
