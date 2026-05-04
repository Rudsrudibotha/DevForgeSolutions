const LOGIN_CONFIG = {
  '/devforge-login': {
    type: 'devforge',
    title: 'DevForge Solutions Staff Login',
    subtitle: 'DevForge staff access only.',
    identifierLabel: 'Email Address',
    showSchoolId: false,
    redirect: '/devforge'
  },
  '/school-login': {
    type: 'school',
    title: 'School Management Staff Login',
    subtitle: 'Client school staff access.',
    identifierLabel: 'Email Address',
    showSchoolId: true,
    redirect: '/sms'
  },
  '/parent-login': {
    type: 'parent',
    title: 'Parent Management Login',
    subtitle: 'Parent account access.',
    identifierLabel: 'Email / Cell Number',
    showSchoolId: false,
    redirect: '/parent'
  }
};

const elements = {
  loginForm: document.getElementById('loginForm'),
  loginMessage: document.getElementById('loginMessage'),
  loginTitle: document.getElementById('loginTitle'),
  loginSubtitle: document.getElementById('loginSubtitle'),
  schoolIdField: document.getElementById('schoolIdField'),
  identifierLabel: document.getElementById('identifierLabel')
};

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

function dashboardPath(user) {
  if (user?.role === 'admin') {
    return '/devforge';
  }

  if (user?.role === 'parent') {
    return '/parent';
  }

  return '/sms';
}

function setSession(authPayload) {
  localStorage.setItem('smsToken', authPayload.token);
  localStorage.setItem('smsUser', JSON.stringify(authPayload.user));
  window.location.href = dashboardPath(authPayload.user);
}

function configureLoginPage() {
  const config = currentConfig();
  const fields = elements.loginForm.elements;

  elements.loginTitle.textContent = config.title;
  elements.loginSubtitle.textContent = config.subtitle;
  elements.identifierLabel.textContent = config.identifierLabel;
  fields.loginType.value = config.type;
  fields.schoolId.required = config.showSchoolId;
  fields.schoolId.disabled = !config.showSchoolId;
  elements.schoolIdField.classList.toggle('hidden', !config.showSchoolId);

  if (config.type === 'devforge') {
    fields.identifier.type = 'email';
    fields.identifier.autocomplete = 'email';
  } else {
    fields.identifier.type = 'text';
    fields.identifier.autocomplete = 'username';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  configureLoginPage();

  const token = localStorage.getItem('smsToken');
  const user = JSON.parse(localStorage.getItem('smsUser') || 'null');

  if (token && user) {
    window.location.href = dashboardPath(user);
  }
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const config = currentConfig();

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
