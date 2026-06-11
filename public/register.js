const REGISTER_CONFIG = {
  '/school-register': {
    formId: 'schoolRegistrationForm',
    title: 'School registration',
    subtitle: 'Kinder Care Hub onboarding',
    messageId: 'schoolRegistrationMessage',
    endpoint: '/api/registrations/schools'
  },
  '/parent-register': {
    formId: 'parentRegistrationForm',
    title: 'Parent registration',
    subtitle: 'Kinder Care Hub access request',
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
  parentSchoolSelect: document.getElementById('parentSchoolSelect'),
  schoolBack: document.getElementById('schoolRegistrationBack'),
  schoolNext: document.getElementById('schoolRegistrationNext'),
  schoolReview: document.getElementById('schoolRegistrationReview')
};

let schoolStep = 0;

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

function schoolStepPanels() {
  return Array.from(elements.schoolForm.querySelectorAll('[data-registration-step]'));
}

function schoolStepIndicators() {
  return Array.from(document.querySelectorAll('[data-school-step-indicator]'));
}

function labelForField(field) {
  const label = field.closest('label');
  return label ? String(label.childNodes[0]?.textContent || field.name).trim() : field.name;
}

function validateSchoolStep() {
  const panel = schoolStepPanels()[schoolStep];
  if (!panel) return true;

  const fields = Array.from(panel.querySelectorAll('input, select, textarea'));
  const invalid = fields.find((field) => !field.checkValidity());

  if (invalid) {
    invalid.reportValidity();
    invalid.focus();
    return false;
  }

  return true;
}

function reviewValue(form, name, fallback = 'Not supplied') {
  const value = String(form.elements[name]?.value || '').trim();
  return value || fallback;
}

function renderSchoolReview() {
  if (!elements.schoolReview) return;

  const form = elements.schoolForm;
  const items = [
    ['School', reviewValue(form, 'schoolName')],
    ['Registration no.', reviewValue(form, 'registrationNumber')],
    ['Address', reviewValue(form, 'address')],
    ['Website', reviewValue(form, 'website')],
    ['Primary contact', reviewValue(form, 'contactPerson')],
    ['Contact email', reviewValue(form, 'contactEmail')],
    ['Contact phone', reviewValue(form, 'contactPhone')],
    ['Billing contact', reviewValue(form, 'billingContactName')],
    ['Billing email', reviewValue(form, 'billingContactEmail')],
    ['Requested plan', reviewValue(form, 'requestedPlan')],
    ['Payment status', reviewValue(form, 'paymentProvider')]
  ];

  elements.schoolReview.innerHTML = items.map(([label, value]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join('');
}

function syncPlanChoiceStyles() {
  const selected = elements.schoolForm.elements.requestedPlan?.value || '';
  document.querySelectorAll('[data-plan-choice]').forEach((card) => {
    card.classList.toggle('selected', card.dataset.planChoice === selected);
  });
}

function choosePlan(card) {
  const plan = card?.dataset?.planChoice;
  if (!plan || !elements.schoolForm.elements.requestedPlan) return;

  elements.schoolForm.elements.requestedPlan.value = plan;
  syncPlanChoiceStyles();
}

function setSchoolStep(nextStep) {
  const panels = schoolStepPanels();
  const maxStep = panels.length - 1;
  schoolStep = Math.max(0, Math.min(nextStep, maxStep));

  panels.forEach((panel, index) => {
    panel.classList.toggle('active', index === schoolStep);
    panel.hidden = index !== schoolStep;
  });

  schoolStepIndicators().forEach((indicator, index) => {
    indicator.classList.toggle('active', index === schoolStep);
    indicator.classList.toggle('complete', index < schoolStep);
  });

  elements.schoolBack.hidden = schoolStep === 0;
  elements.schoolNext.hidden = schoolStep === maxStep;
  elements.schoolForm.querySelector('[type="submit"]').hidden = schoolStep !== maxStep;

  if (schoolStep === maxStep) {
    renderSchoolReview();
  }

  syncPlanChoiceStyles();
}

function nextSchoolStep() {
  if (!validateSchoolStep()) return;
  setSchoolStep(schoolStep + 1);
}

function previousSchoolStep() {
  setSchoolStep(schoolStep - 1);
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

  if (config.formId === 'schoolRegistrationForm') {
    setSchoolStep(0);
  }

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
    if (config.formId === 'schoolRegistrationForm' && schoolStep < schoolStepPanels().length - 1) {
      nextSchoolStep();
      return;
    }

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

    if (config.formId === 'schoolRegistrationForm') {
      setSchoolStep(0);
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
  elements.schoolNext?.addEventListener('click', nextSchoolStep);
  elements.schoolBack?.addEventListener('click', previousSchoolStep);
  elements.schoolForm.elements.requestedPlan?.addEventListener('change', syncPlanChoiceStyles);
  document.querySelectorAll('[data-plan-choice]').forEach((card) => {
    card.addEventListener('click', () => choosePlan(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choosePlan(card);
      }
    });
  });
});
