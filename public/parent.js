const state = {
  token: localStorage.getItem('smsToken'),
  user: JSON.parse(localStorage.getItem('smsUser') || 'null'),
  students: [],
  invoices: [],
  attendance: [],
  balance: null
};

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

  if (state.user.role !== 'parent') {
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

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('smsToken');
  localStorage.removeItem('smsUser');
  window.location.href = '/parent-login';
}

async function refreshData() {
  try {
    const [students, invoices, balance] = await Promise.all([
      api('/api/parent/students'),
      api('/api/parent/invoices'),
      api('/api/parent/balance')
    ]);

    state.students = students;
    state.invoices = invoices;
    state.balance = balance;
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
        <td><span class="${statusClass}">${escapeHtml(invoice.Status || '-')}</span></td>
        <td>${dateOnly(invoice.DueDate)}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6">No invoices found.</td></tr>';
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

function switchView(viewName) {
  if (!document.getElementById(`${viewName}View`)) {
    viewName = 'overview';
  }

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
