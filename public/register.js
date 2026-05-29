const REGISTER_CONFIG = {
  '/school-register': {
    formId: 'schoolRegistrationForm',
    title: 'Kinder Care Hub',
    subtitle: 'School Registration',
    messageId: 'schoolRegistrationMessage',
    endpoint: '/api/registrations/schools'
  },
  '/parent-register': {
    formId: 'parentRegistrationForm',
    title: 'Kinder Care Hub',
    subtitle: 'Parent Registration',
    messageId: 'parentRegistrationMessage',
    endpoint: '/api/registrations/parents'
  }
};

const elements = {
  title: document.getElementById('registerTitle'),
  subtitle: document.getElementById('registerSubtitle'),
  schoolForm: document.getElementById('schoolRegistrationForm'),
  parentForm: document.getElementById('parentRegistrationForm'),
  schoolMessage: document.getElementById('schoolRegistrationMessage'),
  parentMessage: document.getElementById('parentRegistrationMessage'),
  parentSchoolSelect: document.getElementById('parentSchoolSelect')
};

function currentConfig() {
  return REGISTER_CONFIG[window.location.pathname] || REGISTER_CONFIG['/school-register'];
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showFormMessage(element, message, type = 'error') {
  element.textContent = message;
  element.className = `form-message ${type}`;
  element.classList.toggle('hidden', !message);
}

function setFormBusy(form, busy, busyLabel = 'Submitting...') {
  const submitButton = form.querySelector('[type="submit"]');

  if (!submitButton) return;

  if (!submitButton.dataset.defaultText) {
    submitButton.dataset.defaultText = submitButton.textContent;
  }

  form.setAttribute('aria-busy', String(busy));
  submitButton.disabled = busy;
  submitButton.textContent = busy ? busyLabel : submitButton.dataset.defaultText;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Request failed');
  }

  return payload;
}

async function loadSchools() {
  if (!elements.parentSchoolSelect) return;

  try {
    const schools = await api('/api/registrations/schools');
    elements.parentSchoolSelect.innerHTML = '<option value="">Select school</option>'
      + schools.map((school) => `<option value="${school.SchoolID}">${escapeHtml(school.SchoolName)}</option>`).join('');
  } catch (error) {
    elements.parentSchoolSelect.innerHTML = '<option value="">Schools unavailable</option>';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function configurePage() {
  const config = currentConfig();

  document.title = `${config.title} - ${config.subtitle}`;
  elements.title.textContent = config.title;
  elements.subtitle.textContent = config.subtitle;
  elements.schoolForm.classList.toggle('hidden', config.formId !== 'schoolRegistrationForm');
  elements.parentForm.classList.toggle('hidden', config.formId !== 'parentRegistrationForm');

  if (config.formId === 'parentRegistrationForm') {
    loadSchools();
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const config = currentConfig();
  const message = document.getElementById(config.messageId);

  try {
    const payload = formData(form);

    if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
    if (payload.contactEmail) payload.contactEmail = String(payload.contactEmail).trim().toLowerCase();
    if (payload.billingContactEmail) payload.billingContactEmail = String(payload.billingContactEmail).trim().toLowerCase();
    if (payload.schoolId) payload.schoolId = Number(payload.schoolId);

    showFormMessage(message, '');
    setFormBusy(form, true);

    const result = await api(config.endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    form.reset();

    if (config.formId === 'parentRegistrationForm') {
      await loadSchools();
    }

    showFormMessage(message, result.message || 'Registration submitted', result.matched === false ? 'info' : 'success');
  } catch (error) {
    showFormMessage(message, error.message);
  } finally {
    setFormBusy(form, false);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  configurePage();
  elements.schoolForm.addEventListener('submit', handleSubmit);
  elements.parentForm.addEventListener('submit', handleSubmit);
});
