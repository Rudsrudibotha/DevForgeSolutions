const state = {
  token: localStorage.getItem('smsToken'),
  user: JSON.parse(localStorage.getItem('smsUser') || 'null'),
  students: [],
  invoices: [],
  attendance: [],
  consentRecords: [],
  balance: null
};

document.body.classList.remove('platform-user');
document.body.classList.add('school-user');

const elements = {
  workspace: document.getElementById('workspace'),
  statusPill: document.getElementById('statusPill'),
  sessionLabel: document.getElementById('sessionLabel'),
  logoutButton: document.getElementById('logoutButton'),
  viewTitle: document.getElementById('viewTitle'),
  totalOwed: document.getElementById('totalOwed'),
  totalPaid: document.getElementById('totalPaid'),
  invoiceCount: document.getElementById('invoiceCount'),
  outstandingCount: document.getElementById('outstandingCount'),
  studentSummary: document.getElementById('studentSummary'),
  studentsTable: document.getElementById('studentsTable'),
  invoicesTable: document.getElementById('invoicesTable'),
  childSelect: document.getElementById('childSelect'),
  attendanceChildSelect: document.getElementById('attendanceChildSelect'),
  attendanceMonthInput: document.getElementById('attendanceMonthInput'),
  attendanceTable: document.getElementById('attendanceTable'),
  parentDetailsForm: document.getElementById('parentDetailsForm'),
  toast: document.getElementById('toast')
};

let toastTimer = null;
let inactivityTimer = null;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function rememberActivity() {
  if (state.token) {
    localStorage.setItem('smsLastActivity', String(Date.now()));
  }
}

function redirectToParentLogin() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  localStorage.removeItem('smsLastActivity');
  window.location.href = '/parent-login';
}

function enforceInactivityTimeout() {
  if (!state.token) return false;
  const lastActivity = Number(localStorage.getItem('smsLastActivity') || Date.now());
  if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
    redirectToParentLogin();
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

function requireParentSession() {
  if (!state.token || !state.user) {
    window.location.href = '/parent-login';
    return false;
  }

  if (enforceInactivityTimeout()) {
    return false;
  }

  if (state.user.role !== 'parent') {
    window.location.href = dashboardPath(state.user);
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
      redirectToParentLogin();
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

function setFormBusy(form, busy, busyLabel) {
  const submitButtons = form.querySelectorAll('[type="submit"]');
  form.setAttribute('aria-busy', String(busy));
  submitButtons.forEach((button) => {
    if (!button.dataset.defaultText) {
      button.dataset.defaultText = button.textContent;
    }
    button.disabled = busy;
    button.textContent = busy ? busyLabel : button.dataset.defaultText;
  });
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
  window.location.href = '/parent-login';
}

async function refreshData() {
  try {
    const [students, invoices, balance, consentRecords] = await Promise.all([
      api('/api/parent/students'),
      api('/api/parent/invoices'),
      api('/api/parent/balance'),
      api('/api/school-features/consent/parent')
    ]);

    state.students = students;
    state.invoices = invoices;
    state.balance = balance;
    state.consentRecords = consentRecords;
    await refreshAttendance();
    renderData();
  } catch (error) {
    showToast(error.message);
    renderData();
  }
}

function renderShell() {
  if (!requireParentSession()) {
    return;
  }

  elements.workspace.classList.remove('hidden');
  elements.logoutButton.classList.remove('hidden');
  elements.sessionLabel.textContent = `${state.user.username || state.user.email} (parent)`;
  elements.statusPill.textContent = 'Parent portal';
  startInactivityTimer();
  document.getElementById('profileUsername').textContent = state.user.username || '-';
  document.getElementById('profileEmail').textContent = state.user.email || '-';
  document.getElementById('profileRole').textContent = 'Parent';
  refreshData();
}

function renderData() {
  const balance = state.balance || {};

  elements.totalOwed.textContent = money(balance.totalOwed || 0);
  elements.totalPaid.textContent = money(balance.totalPaid || 0);
  elements.invoiceCount.textContent = balance.invoiceCount || state.invoices.length;
  elements.outstandingCount.textContent = balance.outstandingCount || 0;
  renderChildSelectors();
  renderStudentSummary();
  renderStudents();
  renderAttendance();
  renderInvoices();
  renderConsent();
}

function renderChildSelectors() {
  const options = state.students.length
    ? state.students.map((student) => `
      <option value="${student.StudentID}">${escapeHtml(`${student.FirstName || ''} ${student.LastName || ''}`.trim())}</option>
    `).join('')
    : '<option value="">No linked children</option>';

  if (elements.childSelect) {
    elements.childSelect.innerHTML = options;
  }

  if (elements.attendanceChildSelect) {
    elements.attendanceChildSelect.innerHTML = options;
  }
}

function selectedAttendanceStudentId() {
  return Number(elements.attendanceChildSelect?.value || elements.childSelect?.value || state.students[0]?.StudentID || 0);
}

async function refreshAttendance() {
  const studentId = selectedAttendanceStudentId();

  if (!studentId) {
    state.attendance = [];
    return;
  }

  const monthValue = elements.attendanceMonthInput?.value;
  let query = '';

  if (monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    query = `?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
  }

  try {
    state.attendance = await api(`/api/attendance/student/${studentId}${query}`);
  } catch (error) {
    state.attendance = [];
    showToast(error.message);
  }
}

function renderStudentSummary() {
  elements.studentSummary.innerHTML = state.students.map((student) => `
    <div class="compact-item">
      <div>
        <strong>${escapeHtml(`${student.FirstName || ''} ${student.LastName || ''}`.trim())}</strong>
        <span>${escapeHtml(student.FamilyName || 'Linked student')}</span>
      </div>
      <span>${escapeHtml(student.ClassName || '-')}</span>
    </div>
  `).join('') || '<p>No students are linked to this parent account yet.</p>';
}

function renderStudents() {
  elements.studentsTable.innerHTML = state.students.map((student) => `
    <tr>
      <td>
        <strong>${escapeHtml(`${student.FirstName || ''} ${student.LastName || ''}`.trim())}</strong>
        <span class="table-subtext">${escapeHtml(student.CategoryName || '')}</span>
      </td>
      <td>${escapeHtml(student.FamilyName || '-')}</td>
      <td>${escapeHtml(student.ClassName || '-')}</td>
      <td>${dateOnly(student.BillingDate)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No linked students found.</td></tr>';
}

function renderInvoices() {
  elements.invoicesTable.innerHTML = state.invoices.map((invoice) => {
    const statusClass = invoice.Status === 'Paid' ? 'badge' : invoice.Status === 'Overdue' ? 'badge danger' : 'badge warn';

    return `
      <tr>
        <td>${escapeHtml(invoice.InvoiceNumber || '-')}</td>
        <td>${escapeHtml(invoice.Description || '-')}</td>
        <td>${money(invoice.Amount || 0)}</td>
        <td>${money(invoice.AmountPaid || 0)}</td>
        <td>${dateOnly(invoice.PaidDate) || '-'}</td>
        <td><span class="${statusClass}">${escapeHtml(invoice.Status || '-')}</span></td>
        <td>${dateOnly(invoice.DueDate)}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7">No invoices found.</td></tr>';
}

function renderAttendance() {
  if (!elements.attendanceTable) {
    return;
  }

  elements.attendanceTable.innerHTML = state.attendance.map((record) => {
    const statusClass = record.Status === 'Present' ? 'badge' : record.Status === 'Absent' ? 'badge danger' : 'badge warn';

    return `
      <tr>
        <td>${dateOnly(record.AttendanceDate)}</td>
        <td><span class="${statusClass}">${escapeHtml(record.Status || '-')}</span></td>
        <td>${escapeHtml(record.Notes || '-')}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="3">No attendance records are available yet.</td></tr>';
}

function renderConsent() {
  const panel = document.querySelector('#consentView .page-table-panel');
  if (!panel) {
    return;
  }

  const rows = state.consentRecords.map((item) => {
    const studentName = `${item.FirstName || ''} ${item.LastName || ''}`.trim();
    const statusClass = item.Response === 'Accepted' ? 'badge' : item.Response === 'Declined' ? 'badge danger' : 'badge warn';
    const body = item.DocumentBody || item.Notes || 'No permission slip details were supplied.';
    const riskNotes = item.RiskNotes || 'None recorded';
    const medicalInstructions = item.MedicalInstructions || 'Use learner emergency details on record.';
    const responseForm = (item.Response || 'Pending') === 'Pending' ? `
      <form class="module-form consent-response-form" data-consent-id="${item.ConsentID}">
        <div class="form-grid">
          <label>Parent/guardian full name<input name="signatureName" type="text" required></label>
          <label>Relationship<input name="signatureRelationship" type="text" placeholder="Mother, father, guardian"></label>
          <label class="wide">Response notes<textarea name="responseNotes" rows="2"></textarea></label>
        </div>
        <div class="actions">
          <button class="primary-button compact-button" data-response="Accepted" type="submit">Grant Permission</button>
          <button class="danger-button compact-button" data-response="Declined" type="submit">Decline Permission</button>
        </div>
      </form>
    ` : `
      <div class="compact-item">
        <div><strong>Signed by ${escapeHtml(item.SignatureName || 'Parent/guardian')}</strong><span>${escapeHtml(item.SignatureRelationship || 'Guardian response recorded')}</span></div>
        <span>${dateOnly(item.ResponseDate)}</span>
      </div>
    `;

    return `
      <section class="permission-slip-document">
        <div class="permission-slip-heading">
          <span>${escapeHtml(studentName || 'Linked learner')}</span>
          <strong>${escapeHtml(item.RequestTitle || `${item.ConsentType || 'Consent'} request`)}</strong>
        </div>
        <div class="permission-slip-grid">
          <div><span>Type</span><strong>${escapeHtml(item.ConsentType || '-')}</strong></div>
          <div><span>Activity date</span><strong>${dateOnly(item.ActivityDate)}</strong></div>
          <div><span>Response due</span><strong>${dateOnly(item.DueDate)}</strong></div>
          <div><span>Status</span><strong><span class="${statusClass}">${escapeHtml(item.Response || 'Pending')}</span></strong></div>
        </div>
        <p>${escapeHtml(body).replaceAll('\n', '<br>')}</p>
        <div class="permission-slip-clause"><span>Risk / transport / supervision notes</span><p>${escapeHtml(riskNotes).replaceAll('\n', '<br>')}</p></div>
        <div class="permission-slip-clause"><span>Medical / emergency instructions</span><p>${escapeHtml(medicalInstructions).replaceAll('\n', '<br>')}</p></div>
        ${responseForm}
      </section>
    `;
  }).join('');

  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Consent</h3>
        <p>Permission slips and parent responses for linked children only.</p>
      </div>
    </div>
    <div class="consent-list">${rows || '<p>No consent requests are available yet.</p>'}</div>
  `;
}

function switchView(viewName) {
  if (!document.getElementById(`${viewName}View`)) {
    viewName = 'overview';
  }

  document.body.dataset.portal = 'parent';
  document.body.dataset.section = viewName;
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

  const titles = {
    overview: 'Parent Management Dashboard',
    students: 'My Child',
    account: 'Account',
    notifications: 'Notifications',
    admissions: 'Admissions / Re-Enrolment',
    consent: 'Consent'
  };

  elements.viewTitle.textContent = titles[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
  elements.viewTitle.focus({ preventScroll: true });
}

function money(value) {
  return `R${Number(value || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
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

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');

  if (!button) {
    return;
  }

  const actions = {
    'open-child': 'students',
    'open-account': 'account',
    'open-notifications': 'notifications',
    'open-admissions': 'admissions',
    'open-consent': 'consent'
  };
  const viewName = actions[button.dataset.action];

  if (viewName) {
    switchView(viewName);
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('.consent-response-form');
  if (!form) {
    return;
  }

  event.preventDefault();
  const submitter = event.submitter;
  const data = Object.fromEntries(new FormData(form).entries());
  data.response = submitter?.dataset.response || 'Accepted';

  try {
    setFormBusy(form, true, 'Saving...');
    await api(`/api/school-features/consent/${form.dataset.consentId}/respond`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    state.consentRecords = await api('/api/school-features/consent/parent');
    renderConsent();
    showToast(data.response === 'Accepted' ? 'Permission granted' : 'Permission declined');
  } catch (error) {
    showToast(error.message);
  } finally {
    setFormBusy(form, false);
  }
});

elements.parentDetailsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  showToast('Details submitted for school review');
});

elements.attendanceChildSelect.addEventListener('change', async () => {
  await refreshAttendance();
  renderAttendance();
});

elements.attendanceMonthInput.addEventListener('change', async () => {
  await refreshAttendance();
  renderAttendance();
});

elements.logoutButton.addEventListener('click', clearSession);

renderShell();
