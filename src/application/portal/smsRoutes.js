'use strict';

const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../../data/db');
const StudentPortalService = require('../../business/studentPortalService');
const FamilyPortalService = require('../../business/familyPortalService');
const ClassPortalService = require('../../business/classPortalService');
const AttendancePortalService = require('../../business/attendancePortalService');
const InvoicePortalService = require('../../business/invoicePortalService');
const PaymentPortalService = require('../../business/paymentPortalService');
const BankStatementPortalService = require('../../business/bankStatementPortalService');
const StaffPortalService = require('../../business/staffPortalService');
const ReportPortalService = require('../../business/reportPortalService');
const SettingsPortalService = require('../../business/settingsPortalService');
const DashboardService = require('../../business/dashboardService');
const { demoOr } = require('../../business/demoData');
const parentInvitationService = require('../../business/parentInvitationService');
const parentGate = require('../../data/parentVerificationGateRepository');
const { requireFeature } = require('../../middleware/requireFeature');
const { getAudit } = require('../../middleware/auditTrail');
const NotificationService = require('../../business/notificationService');
const { formatDate, formatMoney } = require('./render');

const studentService = new StudentPortalService();
const notificationService = new NotificationService();
const familyService = new FamilyPortalService();
const classService = new ClassPortalService();
const attendanceService = new AttendancePortalService();
const invoiceService = new InvoicePortalService();
const paymentService = new PaymentPortalService();
const bankStatementService = new BankStatementPortalService();
const staffService = new StaffPortalService();
const reportService = new ReportPortalService();
const settingsService = new SettingsPortalService();
const dashboardService = new DashboardService();

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}

function requireRoleMw(req, res, next) {
  if (!req.user) return res.redirect('/login');
  if (!['school', 'admin'].includes(req.user.role)) {
    return res.status(403).render('errors/forbidden', { user: req.user, message: 'School access required.' });
  }
  next();
}

function safeCall(promise, fallback) {
  return promise.catch(err => {
    console.warn('[sms/students] data call failed, returning fallback:', err.message);
    return fallback;
  });
}

function requireSchoolScope(req, res, next) {
  if (!req.schoolDb) return res.status(500).render('errors/offline', { message: 'School context is missing.' });
  if (req.user.role === 'school' && !req.schoolDb.schoolId) {
    return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school is linked to your account.' });
  }
  // Admins can also use req.schoolDb; they pass an explicit schoolId
  // (TODO: add a school picker for admin cross-school browsing)
  next();
}

// ========================================================
// Students
// ========================================================

// The filter bar uses "Current" / "Left" checkboxes; map them onto the
// service's status values. An explicit ?status= still wins (back-compat
// with pagination links and older bookmarks).
function studentStatusFromQuery(query) {
  if (query.status) return query.status;
  const current = query.showCurrent === 'on' || query.showCurrent === '1';
  const left = query.showLeft === 'on' || query.showLeft === '1';
  if (current && left) return 'all';
  if (left && !current) return 'inactive';
  return 'active';
}

router.get('/students', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Students | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'students';
    const data = await safeCall(studentService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      classId: req.query.classId,
      status: studentStatusFromQuery(req.query),
      page: req.query.page,
      pageSize: 25
    }), demoOr('smsStudents', { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', classId: '', status: 'active' } }));

    const classes = await safeCall(studentService.listClasses({ schoolDb: req.schoolDb }), demoOr('smsClasses', []));
    res.render('sms/students/list', { ...data, classes });
  } catch (err) { next(err); }
});

// HTMX partial: refresh the table body
router.get('/students/partials/table', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const data = await safeCall(studentService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      classId: req.query.classId,
      status: studentStatusFromQuery(req.query),
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', classId: '', status: 'active' } });
    res.render('sms/students/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

// Outstanding fees as a year calendar: one row per student grouped
// under their family, one column per month.
router.get('/students/outstanding', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Outstanding by month | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'students';
    const data = await safeCall(studentService.outstandingByMonth({
      schoolDb: req.schoolDb,
      year: req.query.year
    }), {
      year: Number(req.query.year) || new Date().getFullYear(),
      families: [], monthTotals: new Array(13).fill(0), grandTotal: 0
    });
    res.render('sms/students/outstanding', data);
  } catch (err) { next(err); }
});

// New student form
router.get('/students/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'New student | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'students';
    const families = await safeCall(studentService.listFamilies({ schoolDb: req.schoolDb, search: req.query.familySearch }), []);
    const classes = await safeCall(studentService.listClasses({ schoolDb: req.schoolDb }), []);
    const billingCategories = await safeCall(settingsService.listBillingCategories({ schoolDb: req.schoolDb }), []);
    res.render('sms/students/form', {
      mode: 'create', student: null, families, classes, errors: {},
      billingCategories: billingCategories.filter(c => c.IsActive),
      assignedCategoryIds: []
    });
  } catch (err) { next(err); }
});

// Billing-category ids arrive as hidden inputs; one value posts as a
// string, several as an array.
function parseCategoryIds(body) {
  return [].concat(body.billingCategoryIds || [])
    .map(Number)
    .filter(id => Number.isInteger(id) && id > 0);
}

// Create student (HTMX form post)
router.post('/students', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const sid = req.schoolDb.schoolId;
    if (sid == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const errors = validateStudent(req.body);
    if (Object.keys(errors).length > 0) {
      const families = await safeCall(studentService.listFamilies({ schoolDb: req.schoolDb }), []);
      const classes = await safeCall(studentService.listClasses({ schoolDb: req.schoolDb }), []);
      const billingCategories = await safeCall(settingsService.listBillingCategories({ schoolDb: req.schoolDb }), []);
      return res.status(400).render('sms/students/form', {
        mode: 'create', student: req.body, families, classes, errors,
        billingCategories: billingCategories.filter(c => c.IsActive),
        assignedCategoryIds: parseCategoryIds(req.body)
      });
    }

    // Parent gate: the chosen family must have at least one verified
    // parent (a parent user who completed email + cellphone 2FA and is
    // linked to this family). Otherwise we reject the create.
    const familyId = Number(req.body.familyId);
    const familyOk = await safeCall(parentGate.hasVerifiedParent({ schoolId: sid, familyId }), false);
    if (!familyOk) {
      const families = await safeCall(studentService.listFamilies({ schoolDb: req.schoolDb }), []);
      const classes = await safeCall(studentService.listClasses({ schoolDb: req.schoolDb }), []);
      const billingCategories = await safeCall(settingsService.listBillingCategories({ schoolDb: req.schoolDb }), []);
      const verifiedCount = await safeCall(parentGate.countVerifiedParentsForFamily({ schoolId: sid, familyId }), 0);
      return res.status(400).render('sms/students/form', {
        mode: 'create',
        student: req.body,
        families,
        classes,
        errors: {},
        billingCategories: billingCategories.filter(c => c.IsActive),
        assignedCategoryIds: parseCategoryIds(req.body),
        parentGate: {
          familyId,
          verifiedCount,
          inviteUrl: '/sms/families/' + familyId + '/invite-parent'
        }
      });
    }

    const request = await req.schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('familyId', sql.Int, Number(req.body.familyId));
    request.input('firstName', sql.NVarChar, req.body.firstName.trim());
    request.input('lastName', sql.NVarChar, req.body.lastName.trim());
    request.input('dateOfBirth', sql.Date, req.body.dateOfBirth || null);
    request.input('classId', sql.Int, req.body.classId ? Number(req.body.classId) : null);
    request.input('medicalNotes', sql.NVarChar, req.body.medicalNotes || null);
    request.input('homePhone', sql.NVarChar, req.body.homePhone ? String(req.body.homePhone).trim().slice(0, 50) : null);
    request.input('homeAddress', sql.NVarChar, req.body.homeAddress ? String(req.body.homeAddress).trim().slice(0, 500) : null);
    request.input('grandmotherName', sql.NVarChar, req.body.grandmotherName ? String(req.body.grandmotherName).trim().slice(0, 255) : null);
    request.input('grandmotherPhone', sql.NVarChar, req.body.grandmotherPhone ? String(req.body.grandmotherPhone).trim().slice(0, 50) : null);
    request.input('grandfatherName', sql.NVarChar, req.body.grandfatherName ? String(req.body.grandfatherName).trim().slice(0, 255) : null);
    request.input('grandfatherPhone', sql.NVarChar, req.body.grandfatherPhone ? String(req.body.grandfatherPhone).trim().slice(0, 50) : null);
    request.input('familyFriendName', sql.NVarChar, req.body.familyFriendName ? String(req.body.familyFriendName).trim().slice(0, 255) : null);
    request.input('familyFriendPhone', sql.NVarChar, req.body.familyFriendPhone ? String(req.body.familyFriendPhone).trim().slice(0, 50) : null);
    const today = new Date().toISOString().slice(0, 10);
    request.input('enrolledDate', sql.Date, req.body.enrolledDate || today);

    const text = `
      INSERT INTO Students
        (SchoolID, FamilyID, FirstName, LastName, DateOfBirth, ClassID, MedicalNotes, EnrolledDate,
         HomePhone, HomeAddress, GrandmotherName, GrandmotherPhone, GrandfatherName, GrandfatherPhone,
         FamilyFriendName, FamilyFriendPhone, IsActive, CurrentAcademicYear, BillingDate)
      OUTPUT INSERTED.StudentID
      VALUES
        (@schoolId, @familyId, @firstName, @lastName, @dateOfBirth, @classId, @medicalNotes, @enrolledDate,
         @homePhone, @homeAddress, @grandmotherName, @grandmotherPhone, @grandfatherName, @grandfatherPhone,
         @familyFriendName, @familyFriendPhone, 1, YEAR(GETDATE()), GETDATE())
    `;
    req.schoolDb.guardTableScope(text);
    const result = await request.query(text);
    const newId = result.recordset[0] ? result.recordset[0].StudentID : null;

    if (newId) {
      await studentService.syncBillingCategories({
        schoolDb: req.schoolDb,
        studentId: newId,
        categoryIds: parseCategoryIds(req.body)
      });
    }

    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/students/' + newId);
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Student created.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/students/' + newId);
  } catch (err) { next(err); }
});

// Send a custom email to the parents of selected students, a class, or
// every active student. Each parent is emailed individually so addresses
// are never disclosed to other recipients (POPIA).
const EMAIL_MAX_RECIPIENTS = 500;
router.post('/students/email', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const sid = req.schoolDb.schoolId;
    if (sid == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }

    const scope = String(req.body.scope || '');
    const subject = String(req.body.subject || '').trim().slice(0, 200);
    const message = String(req.body.message || '').trim().slice(0, 5000);

    function fail(text) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: text } }));
      if (req.headers['hx-request'] === 'true') return res.status(400).end();
      return res.redirect('/sms/students');
    }

    if (!['selected', 'class', 'all'].includes(scope)) return fail('Choose who to send to.');
    if (!subject) return fail('A subject is required.');
    if (!message) return fail('A message is required.');
    const studentIds = [].concat(req.body.studentIds || []).map(Number).filter(id => Number.isInteger(id) && id > 0);
    if (scope === 'selected' && !studentIds.length) return fail('Select at least one student first.');
    if (scope === 'class' && !(Number(req.body.classId) > 0)) return fail('Choose a class first.');

    const { emails, studentCount } = await safeCall(studentService.listParentEmails({
      schoolDb: req.schoolDb,
      scope,
      studentIds,
      classId: Number(req.body.classId)
    }), { emails: [], studentCount: 0 });

    if (!emails.length) return fail('No parent email addresses found for that selection.');
    if (emails.length > EMAIL_MAX_RECIPIENTS) return fail(`Too many recipients (${emails.length}). The limit is ${EMAIL_MAX_RECIPIENTS}.`);

    // One email per parent; enqueue without polling for delivery so a
    // large send doesn't hold the request open.
    let sentCount = 0;
    for (const email of emails) {
      try {
        const result = await notificationService.sendEmail(email, subject, message, { waitForResult: false });
        if (result && result.sent) sentCount += 1;
      } catch (err) {
        console.warn('[sms/students] email send failed for one recipient:', err.message);
      }
    }

    if (sentCount === 0) return fail('No emails could be sent. Check the email provider settings.');

    // Audit the broadcast (counts only — never recipient addresses).
    try {
      await getAudit().recordWrite(req.user, sid, 'student-email', null, 'CREATE', null, null, {
        scope, students: studentCount, recipients: emails.length, sent: sentCount
      });
    } catch (err) {
      console.warn('[sms/students] audit write failed:', err.message);
    }

    const note = `Email sent to ${sentCount} parent${sentCount === 1 ? '' : 's'}.`;
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: note }, 'email-sent': {} }));
      return res.status(204).end();
    }
    res.redirect('/sms/students');
  } catch (err) { next(err); }
});

// Email each family their invoice statement: every invoice this year
// ('all') or only unpaid balances ('outstanding'). Parents only ever see
// their own family's invoices, and each address gets its own copy.
router.post('/students/email-invoices', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const sid = req.schoolDb.schoolId;
    if (sid == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }

    const scope = String(req.body.scope || '');

    function fail(text) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: text } }));
      if (req.headers['hx-request'] === 'true') return res.status(400).end();
      return res.redirect('/sms/students');
    }

    if (!['all', 'outstanding'].includes(scope)) return fail('Choose which invoices to send.');

    const [statements, school] = await Promise.all([
      safeCall(invoiceService.listFamilyStatements({ schoolDb: req.schoolDb, scope }), []),
      safeCall(settingsService.getSchool({ schoolDb: req.schoolDb }), null)
    ]);
    if (!statements.length) {
      return fail(scope === 'outstanding' ? 'No outstanding invoices found.' : 'No invoices found for this year.');
    }

    const schoolName = (school && school.SchoolName) || 'your school';
    const currency = school && school.CurrencyCode;
    const year = new Date().getFullYear();
    const subject = scope === 'outstanding'
      ? `Outstanding fees statement — ${schoolName}`
      : `Invoice statement ${year} — ${schoolName}`;

    let familiesSent = 0;
    let sentCount = 0;
    for (const fam of statements) {
      if (!fam.emails.length) continue;
      const body = buildStatementEmail(fam, { schoolName, school, scope, currency });
      let famSent = 0;
      for (const email of fam.emails) {
        try {
          const result = await notificationService.sendEmail(email, subject, body, { waitForResult: false });
          if (result && result.sent) famSent += 1;
        } catch (err) {
          console.warn('[sms/students] statement send failed for one recipient:', err.message);
        }
      }
      if (famSent > 0) familiesSent += 1;
      sentCount += famSent;
    }

    if (sentCount === 0) return fail('No emails could be sent. Check the email provider settings.');

    try {
      await getAudit().recordWrite(req.user, sid, 'invoice-statement-email', null, 'CREATE', null, null, {
        scope, families: familiesSent, recipients: sentCount
      });
    } catch (err) {
      console.warn('[sms/students] audit write failed:', err.message);
    }

    const note = `Invoice statements sent to ${familiesSent} famil${familiesSent === 1 ? 'y' : 'ies'} (${sentCount} email${sentCount === 1 ? '' : 's'}).`;
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: note }, 'email-sent': {} }));
      return res.status(204).end();
    }
    res.redirect('/sms/students');
  } catch (err) { next(err); }
});

// Plain-text statement body for one family. Amounts use the school's
// configured currency via the shared formatMoney helper.
function buildStatementEmail(fam, { schoolName, school, scope, currency }) {
  const lines = [];
  lines.push(`Dear ${fam.familyName} family,`);
  lines.push('');
  lines.push(scope === 'outstanding'
    ? `Here is a summary of the outstanding school fees for your family at ${schoolName}.`
    : `Here is your ${new Date().getFullYear()} invoice statement from ${schoolName}.`);
  lines.push('');

  let totalOutstanding = 0;
  let currentStudent = null;
  for (const line of fam.lines) {
    if (line.studentName !== currentStudent) {
      currentStudent = line.studentName;
      lines.push(currentStudent);
    }
    const outstanding = Math.max(0, line.amount - line.amountPaid);
    totalOutstanding += outstanding;
    lines.push(
      `  ${line.invoiceNumber} | issued ${formatDate(line.issueDate)}` +
      (line.dueDate ? ` | due ${formatDate(line.dueDate)}` : '') +
      ` | ${formatMoney(line.amount, currency)} | paid ${formatMoney(line.amountPaid, currency)}` +
      ` | outstanding ${formatMoney(outstanding, currency)}`
    );
  }

  lines.push('');
  lines.push(`Total outstanding: ${formatMoney(totalOutstanding, currency)}`);

  if (school && (school.BankName || school.BankAccountNumber)) {
    lines.push('');
    lines.push('Payment details:');
    if (school.BankName) lines.push(`  Bank: ${school.BankName}`);
    if (school.BankAccountHolder) lines.push(`  Account holder: ${school.BankAccountHolder}`);
    if (school.BankAccountNumber) lines.push(`  Account number: ${school.BankAccountNumber}`);
    if (school.BankBranchCode) lines.push(`  Branch code: ${school.BankBranchCode}`);
    lines.push(`  Reference: ${fam.familyName}`);
  }

  lines.push('');
  lines.push(`— ${schoolName}`);
  return lines.join('\n');
}

// Student detail
router.get('/students/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Student | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'students';
    const student = await safeCall(studentService.getById({
      schoolDb: req.schoolDb,
      studentId: Number(req.params.id)
    }), null);
    if (!student) {
      return res.status(404).render('errors/csrf', { message: 'Student not found.' });
    }
    const assignedCategories = await safeCall(studentService.listAssignedBillingCategories({
      schoolDb: req.schoolDb,
      studentId: Number(req.params.id)
    }), []);
    res.render('sms/students/detail', { student, assignedCategories });
  } catch (err) { next(err); }
});

// Edit form
router.get('/students/:id(\\d+)/edit', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Edit student | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'students';
    const student = await safeCall(studentService.getById({ schoolDb: req.schoolDb, studentId: Number(req.params.id) }), null);
    if (!student) return res.status(404).render('errors/csrf', { message: 'Student not found.' });
    const families = await safeCall(studentService.listFamilies({ schoolDb: req.schoolDb }), []);
    const classes = await safeCall(studentService.listClasses({ schoolDb: req.schoolDb }), []);
    const billingCategories = await safeCall(settingsService.listBillingCategories({ schoolDb: req.schoolDb }), []);
    const assigned = await safeCall(studentService.listAssignedBillingCategories({ schoolDb: req.schoolDb, studentId: Number(req.params.id) }), []);
    res.render('sms/students/form', {
      mode: 'edit', student, families, classes, errors: {},
      billingCategories: billingCategories.filter(c => c.IsActive),
      assignedCategoryIds: assigned.map(a => Number(a.BillingCategoryID))
    });
  } catch (err) { next(err); }
});

// Update student
router.post('/students/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const sid = req.schoolDb.schoolId;
    if (sid == null) return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });

    const id = Number(req.params.id);
    const errors = validateStudent(req.body, { partial: true });
    if (Object.keys(errors).length > 0) {
      const families = await safeCall(studentService.listFamilies({ schoolDb: req.schoolDb }), []);
      const classes = await safeCall(studentService.listClasses({ schoolDb: req.schoolDb }), []);
      const billingCategories = await safeCall(settingsService.listBillingCategories({ schoolDb: req.schoolDb }), []);
      return res.status(400).render('sms/students/form', {
        mode: 'edit', student: { ...req.body, StudentID: id }, families, classes, errors,
        billingCategories: billingCategories.filter(c => c.IsActive),
        assignedCategoryIds: parseCategoryIds(req.body)
      });
    }

    const request = await req.schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('studentId', sql.Int, id);
    request.input('firstName', sql.NVarChar, req.body.firstName.trim());
    request.input('lastName', sql.NVarChar, req.body.lastName.trim());
    request.input('dateOfBirth', sql.Date, req.body.dateOfBirth || null);
    request.input('classId', sql.Int, req.body.classId ? Number(req.body.classId) : null);
    request.input('medicalNotes', sql.NVarChar, req.body.medicalNotes || null);
    request.input('enrolledDate', sql.Date, req.body.enrolledDate || null);
    request.input('homePhone', sql.NVarChar, req.body.homePhone ? String(req.body.homePhone).trim().slice(0, 50) : null);
    request.input('homeAddress', sql.NVarChar, req.body.homeAddress ? String(req.body.homeAddress).trim().slice(0, 500) : null);
    request.input('grandmotherName', sql.NVarChar, req.body.grandmotherName ? String(req.body.grandmotherName).trim().slice(0, 255) : null);
    request.input('grandmotherPhone', sql.NVarChar, req.body.grandmotherPhone ? String(req.body.grandmotherPhone).trim().slice(0, 50) : null);
    request.input('grandfatherName', sql.NVarChar, req.body.grandfatherName ? String(req.body.grandfatherName).trim().slice(0, 255) : null);
    request.input('grandfatherPhone', sql.NVarChar, req.body.grandfatherPhone ? String(req.body.grandfatherPhone).trim().slice(0, 50) : null);
    request.input('familyFriendName', sql.NVarChar, req.body.familyFriendName ? String(req.body.familyFriendName).trim().slice(0, 255) : null);
    request.input('familyFriendPhone', sql.NVarChar, req.body.familyFriendPhone ? String(req.body.familyFriendPhone).trim().slice(0, 50) : null);
    request.input('isActive', sql.Bit, req.body.isActive === 'on' || req.body.isActive === 'true' ? 1 : 0);

    const text = `
      UPDATE Students SET
        FirstName = @firstName,
        LastName = @lastName,
        DateOfBirth = @dateOfBirth,
        ClassID = @classId,
        MedicalNotes = @medicalNotes,
        EnrolledDate = COALESCE(@enrolledDate, EnrolledDate),
        HomePhone = @homePhone,
        HomeAddress = @homeAddress,
        GrandmotherName = @grandmotherName,
        GrandmotherPhone = @grandmotherPhone,
        GrandfatherName = @grandfatherName,
        GrandfatherPhone = @grandfatherPhone,
        FamilyFriendName = @familyFriendName,
        FamilyFriendPhone = @familyFriendPhone,
        IsActive = @isActive,
        UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId AND StudentID = @studentId AND IsDeleted = 0
    `;
    req.schoolDb.guardTableScope(text);
    await request.query(text);

    await studentService.syncBillingCategories({
      schoolDb: req.schoolDb,
      studentId: id,
      categoryIds: parseCategoryIds(req.body)
    });

    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/students/' + id);
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Student updated.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/students/' + id);
  } catch (err) { next(err); }
});

// Soft delete (HTMX delete button)
router.delete('/students/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const ok = await safeCall(studentService.softDelete({
      schoolDb: req.schoolDb,
      studentId: Number(req.params.id),
      actor: req.user
    }), false);
    if (!ok) return res.status(404).send('Not found');
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Student removed.' } }));
    res.set('HX-Redirect', '/sms/students');
    return res.status(204).end();
  } catch (err) { next(err); }
});

function validateStudent(body, { partial = false } = {}) {
  const errors = {};
  if (!partial || body.firstName !== undefined) {
    if (!body.firstName || !String(body.firstName).trim()) errors.firstName = 'First name is required';
  }
  if (!partial || body.lastName !== undefined) {
    if (!body.lastName || !String(body.lastName).trim()) errors.lastName = 'Last name is required';
  }
  if (!partial || body.familyId !== undefined) {
    const fid = Number(body.familyId);
    if (!Number.isInteger(fid) || fid <= 0) errors.familyId = 'A family is required';
  }
  if (body.dateOfBirth) {
    const d = new Date(body.dateOfBirth);
    if (isNaN(d.getTime())) errors.dateOfBirth = 'Invalid date of birth';
  }
  if (body.enrolledDate) {
    const d = new Date(body.enrolledDate);
    if (isNaN(d.getTime())) errors.enrolledDate = 'Invalid enrolment date';
  }
  return errors;
}

// ========================================================
// Families
// ========================================================
router.get('/families', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Families | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'families';
    const data = await safeCall(familyService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '' } });
    res.render('sms/families/list', data);
  } catch (err) { next(err); }
});

router.get('/families/partials/table', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const data = await safeCall(familyService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '' } });
    res.render('sms/families/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

router.get('/families/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'New family | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'families';
    res.render('sms/families/form', { mode: 'create', family: emptyFamily(), errors: {} });
  } catch (err) { next(err); }
});

router.post('/families', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const errors = validateFamily(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).render('sms/families/form', { mode: 'create', family: req.body, errors });
    }
    const newId = await safeCall(familyService.create({
      schoolDb: req.schoolDb,
      data: req.body,
      actor: req.user
    }), null);
    if (!newId) return res.status(500).render('errors/offline', { message: 'Could not create family.' });

    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/families/' + newId);
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Family created.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/families/' + newId);
  } catch (err) { next(err); }
});

// ============================================================
// Family -> parents (school-initiated invite flow)
// ============================================================

async function loadFamilyParentsContext(schoolDb, familyId) {
  const family = await safeCall(familyService.getById({ schoolDb, familyId }), null);
  if (!family) return null;
  const parents = await safeCall(parentGate.listParentsForFamily({ schoolId: schoolDb.schoolId, familyId }), []);
  const pendingInvitations = await safeCall(parentGate.listPendingInvitationsForFamily({ schoolId: schoolDb.schoolId, familyId }), []);
  const verifiedCount = parents.filter(p => p.IsVerified && p.IsActive).length;
  return { family, parents, pendingInvitations, verifiedCount };
}

router.get('/families/:id(\\d+)/parents', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Parents | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'families';
    const familyId = Number(req.params.id);
    const ctx = await loadFamilyParentsContext(req.schoolDb, familyId);
    if (!ctx) return res.status(404).render('errors/csrf', { message: 'Family not found.' });
    res.render('sms/families/parents', { ...ctx, errors: {}, inviteSent: req.query.inviteSent || null });
  } catch (err) { next(err); }
});

router.get('/families/:id(\\d+)/invite-parent', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Invite parent | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'families';
    const familyId = Number(req.params.id);
    const ctx = await loadFamilyParentsContext(req.schoolDb, familyId);
    if (!ctx) return res.status(404).render('errors/csrf', { message: 'Family not found.' });
    res.render('sms/families/invite-parent', { ...ctx, form: { email: '', cellphone: '' }, errors: {} });
  } catch (err) { next(err); }
});

router.post('/families/:id(\\d+)/invite-parent', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const familyId = Number(req.params.id);
    const result = await parentInvitationService.createInvitation({
      schoolId: req.schoolDb.schoolId,
      familyId,
      email: (req.body || {}).email,
      cellphone: (req.body || {}).cellphone,
      invitedByUserId: req.user.id || req.user.UserID
    });
    const ctx = await loadFamilyParentsContext(req.schoolDb, familyId);
    if (!ctx) return res.status(404).render('errors/csrf', { message: 'Family not found.' });
    if (!result.ok) {
      const errors = {};
      if (result.body && result.body.error) errors._form = result.body.error;
      return res.status(result.status || 400).render('sms/families/invite-parent', {
        ...ctx,
        form: req.body || {},
        errors
      });
    }
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/families/' + familyId + '/parents?inviteSent=1');
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Invitation sent. The parent will be linked once they verify their email and cellphone.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/families/' + familyId + '/parents?inviteSent=1');
  } catch (err) { next(err); }
});

router.delete('/families/:id(\\d+)/invitations/:invitationId', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const familyId = Number(req.params.id);
    const invitationId = Number(req.params.invitationId);
    await parentInvitationService.revokeInvitation({
      schoolId: req.schoolDb.schoolId,
      familyId,
      invitationId
    });
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Invitation revoked.' } }));
    res.status(204).end();
  } catch (err) { next(err); }
});

router.get('/families/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Family | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'families';
    const familyId = Number(req.params.id);
    const family = await safeCall(familyService.getById({ schoolDb: req.schoolDb, familyId }), null);
    if (!family) return res.status(404).render('errors/csrf', { message: 'Family not found.' });
    const children = await safeCall(familyService.getChildren({ schoolDb: req.schoolDb, familyId }), []);
    const verifiedParentCount = await safeCall(parentGate.countVerifiedParentsForFamily({ schoolId: req.schoolDb.schoolId, familyId }), 0);
    const pendingInvitations = await safeCall(parentGate.listPendingInvitationsForFamily({ schoolId: req.schoolDb.schoolId, familyId }), []);
    res.render('sms/families/detail', {
      family,
      children,
      verifiedParentCount,
      pendingInvitationCount: pendingInvitations.length
    });
  } catch (err) { next(err); }
});

router.get('/families/:id(\\d+)/edit', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Edit family | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'families';
    const family = await safeCall(familyService.getById({ schoolDb: req.schoolDb, familyId: Number(req.params.id) }), null);
    if (!family) return res.status(404).render('errors/csrf', { message: 'Family not found.' });
    res.render('sms/families/form', { mode: 'edit', family, errors: {} });
  } catch (err) { next(err); }
});

router.post('/families/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const id = Number(req.params.id);
    const errors = validateFamily(req.body, { partial: true });
    if (Object.keys(errors).length > 0) {
      return res.status(400).render('sms/families/form', { mode: 'edit', family: { ...req.body, FamilyID: id }, errors });
    }
    const ok = await safeCall(familyService.update({
      schoolDb: req.schoolDb,
      familyId: id,
      data: req.body,
      actor: req.user
    }), false);
    if (!ok) return res.status(404).render('errors/csrf', { message: 'Family not found.' });

    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/families/' + id);
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Family updated.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/families/' + id);
  } catch (err) { next(err); }
});

router.delete('/families/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const ok = await safeCall(familyService.softDelete({
      schoolDb: req.schoolDb,
      familyId: Number(req.params.id),
      actor: req.user
    }), false);
    if (!ok) return res.status(404).send('Not found');
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Family removed.' } }));
    res.set('HX-Redirect', '/sms/families');
    return res.status(204).end();
  } catch (err) { next(err); }
});

function emptyFamily() {
  return {
    FamilyName: '', PrimaryParentName: '', PrimaryParentPhone: '', PrimaryParentEmail: '',
    HomeAddress: '', EmergencyContactName: '', EmergencyContactPhone: '',
    SecondaryParentName: '', SecondaryParentPhone: '', SecondaryParentEmail: ''
  };
}

function validateFamily(body, { partial = false } = {}) {
  const errors = {};
  if (!partial || body.familyName !== undefined) {
    if (!body.familyName || !String(body.familyName).trim()) errors.familyName = 'Family name is required';
  }
  if (!partial || body.primaryParentName !== undefined) {
    if (!body.primaryParentName || !String(body.primaryParentName).trim()) errors.primaryParentName = 'Primary parent name is required';
  }
  if (body.primaryParentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.primaryParentEmail)) {
    errors.primaryParentEmail = 'Invalid email address';
  }
  if (body.secondaryParentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.secondaryParentEmail)) {
    errors.secondaryParentEmail = 'Invalid email address';
  }
  return errors;
}

// ========================================================
// Classes
// ========================================================
router.get('/classes', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Classes | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'classes';
    const data = await safeCall(classService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      grade: req.query.grade,
      status: req.query.status || 'active',
      year: req.query.year ? Number(req.query.year) : null,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, currentYear: new Date().getFullYear(), filters: { search: '', grade: '', status: 'active', year: new Date().getFullYear() } });
    const grades = await safeCall(classService.listGrades({ schoolDb: req.schoolDb }), []);
    res.render('sms/classes/list', { ...data, grades });
  } catch (err) { next(err); }
});

router.get('/classes/partials/table', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const data = await safeCall(classService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      grade: req.query.grade,
      status: req.query.status || 'active',
      year: req.query.year ? Number(req.query.year) : null,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, currentYear: new Date().getFullYear(), filters: { search: '', grade: '', status: 'active', year: new Date().getFullYear() } });
    res.render('sms/classes/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

router.get('/classes/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'New class | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'classes';
    const teachers = await safeCall(classService.listTeachers({ schoolDb: req.schoolDb }), []);
    res.render('sms/classes/form', {
      mode: 'create',
      klass: { ClassName: '', Grade: '', Room: '', Capacity: '', TeacherID: '', ActiveYear: new Date().getFullYear(), IsActive: true },
      teachers,
      errors: {}
    });
  } catch (err) { next(err); }
});

router.post('/classes', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const errors = validateClass(req.body);
    if (Object.keys(errors).length > 0) {
      const teachers = await safeCall(classService.listTeachers({ schoolDb: req.schoolDb }), []);
      return res.status(400).render('sms/classes/form', { mode: 'create', klass: req.body, teachers, errors });
    }
    const newId = await safeCall(classService.create({ schoolDb: req.schoolDb, data: req.body, actor: req.user }), null);
    if (!newId) return res.status(500).render('errors/offline', { message: 'Could not create class.' });

    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/classes/' + newId);
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Class created.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/classes/' + newId);
  } catch (err) { next(err); }
});

router.get('/classes/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Class | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'classes';
    const klass = await safeCall(classService.getById({ schoolDb: req.schoolDb, classId: Number(req.params.id) }), null);
    if (!klass) return res.status(404).render('errors/csrf', { message: 'Class not found.' });
    const roster = await safeCall(classService.getRoster({ schoolDb: req.schoolDb, classId: Number(req.params.id) }), []);
    res.render('sms/classes/detail', { klass, roster });
  } catch (err) { next(err); }
});

router.get('/classes/:id(\\d+)/edit', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Edit class | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'classes';
    const klass = await safeCall(classService.getById({ schoolDb: req.schoolDb, classId: Number(req.params.id) }), null);
    if (!klass) return res.status(404).render('errors/csrf', { message: 'Class not found.' });
    const teachers = await safeCall(classService.listTeachers({ schoolDb: req.schoolDb }), []);
    res.render('sms/classes/form', { mode: 'edit', klass, teachers, errors: {} });
  } catch (err) { next(err); }
});

router.post('/classes/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const id = Number(req.params.id);
    const errors = validateClass(req.body, { partial: true });
    if (Object.keys(errors).length > 0) {
      const teachers = await safeCall(classService.listTeachers({ schoolDb: req.schoolDb }), []);
      return res.status(400).render('sms/classes/form', { mode: 'edit', klass: { ...req.body, ClassID: id }, teachers, errors });
    }
    const ok = await safeCall(classService.update({ schoolDb: req.schoolDb, classId: id, data: req.body, actor: req.user }), false);
    if (!ok) return res.status(404).render('errors/csrf', { message: 'Class not found.' });

    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/classes/' + id);
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Class updated.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/classes/' + id);
  } catch (err) { next(err); }
});

router.delete('/classes/:id(\\d+)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const ok = await safeCall(classService.softDelete({ schoolDb: req.schoolDb, classId: Number(req.params.id), actor: req.user }), false);
    if (!ok) return res.status(404).send('Not found');
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Class removed. Students unassigned.' } }));
    res.set('HX-Redirect', '/sms/classes');
    return res.status(204).end();
  } catch (err) { next(err); }
});

function validateClass(body, { partial = false } = {}) {
  const errors = {};
  if (!partial || body.className !== undefined) {
    if (!body.className || !String(body.className).trim()) errors.className = 'Class name is required';
  }
  if (body.capacity) {
    const c = Number(body.capacity);
    if (!Number.isInteger(c) || c <= 0 || c > 200) errors.capacity = 'Capacity must be a number between 1 and 200';
  }
  if (body.activeYear) {
    const y = Number(body.activeYear);
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(y) || y < thisYear - 5 || y > thisYear + 5) errors.activeYear = 'Year must be within 5 years of ' + thisYear;
  }
  return errors;
}

// ========================================================
// Attendance
// ========================================================
// Whole-school register for a date, filterable by class and status.
// Per-class capture stays on /sms/attendance/:classId.
router.get('/attendance', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Attendance | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'attendance';
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const filters = {
      date,
      classId: req.query.classId || '',
      status: req.query.status || ''
    };
    const [register, classes] = await Promise.all([
      safeCall(attendanceService.getSchoolRegister({
        schoolDb: req.schoolDb, date, classId: req.query.classId, status: req.query.status
      }), demoOr('smsRegister', { date, rows: [], counts: { Present: 0, Absent: 0, Late: 0, Excused: 0, NotCaptured: 0, total: 0 } })),
      safeCall(classService.list({ schoolDb: req.schoolDb, status: 'active', pageSize: 100 }), demoOr('smsRegisterClasses', { rows: [] }))
    ]);
    res.render('sms/attendance/landing', { register, classes: classes.rows, filters });
  } catch (err) { next(err); }
});

// Take attendance for a class on a date
router.get('/attendance/:classId([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Take attendance | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'attendance';
    const klass = await safeCall(classService.getById({ schoolDb: req.schoolDb, classId: Number(req.params.classId) }), null);
    if (!klass) return res.status(404).render('errors/csrf', { message: 'Class not found.' });
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const sheet = await safeCall(attendanceService.getClassSheet({ schoolDb: req.schoolDb, classId: Number(req.params.classId), date }), { date, rows: [] });
    res.render('sms/attendance/sheet', { klass, sheet, date });
  } catch (err) { next(err); }
});

// Bulk save (HTMX form post)
router.post('/attendance/:classId([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    const date = String(req.body.date || '').trim() || new Date().toISOString().slice(0, 10);

    // Parse the posted form: studentId_N = status, studentId_N_notes = notes
    const records = [];
    for (const [key, value] of Object.entries(req.body)) {
      const m = /^student_(\d+)$/.exec(key);
      if (m) {
        const studentId = Number(m[1]);
        const status = String(value).trim();
        if (!status) continue;
        const notes = req.body[`notes_${studentId}`];
        records.push({ studentId, status, notes: notes || null });
      }
    }

    if (records.length === 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'warning', message: 'No attendance recorded.' } }));
      return res.status(204).end();
    }

    // Validate status values
    for (const r of records) {
      if (!['Present', 'Absent', 'Late', 'Excused'].includes(r.status)) {
        res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Invalid status value.' } }));
        return res.status(400).end();
      }
    }

    const klass = await safeCall(classService.getById({ schoolDb: req.schoolDb, classId }), null);
    if (!klass) return res.status(404).render('errors/csrf', { message: 'Class not found.' });

    const result = await safeCall(attendanceService.recordBulk({
      schoolDb: req.schoolDb,
      classId,
      date,
      records,
      actor: req.user
    }), null);
    const updatedCount = (result && result.updated) || 0;
    const insertedCount = (result && result.inserted) || 0;
    const total = updatedCount + insertedCount;
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: `Attendance saved: ${total} record(s).` } }));
    return res.status(204).end();
  } catch (err) { next(err); }
});

// History for a class (date range)
router.get('/attendance/:classId([1-9]\\d*)/history', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Attendance history | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'attendance';
    const klass = await safeCall(classService.getById({ schoolDb: req.schoolDb, classId: Number(req.params.classId) }), null);
    if (!klass) return res.status(404).render('errors/csrf', { message: 'Class not found.' });
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const summary = await safeCall(attendanceService.getClassSummary({ schoolDb: req.schoolDb, classId: Number(req.params.classId), days }), null);
    res.render('sms/attendance/history', { klass, summary, days });
  } catch (err) { next(err); }
});

// ========================================================
// Invoices
// ========================================================
router.get('/invoices', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Invoices | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'invoices';
    const data = await safeCall(invoiceService.list({
      schoolDb: req.schoolDb,
      status: req.query.status,
      studentId: req.query.studentId,
      familyId: req.query.familyId,
      overdueOnly: req.query.overdueOnly,
      from: req.query.from,
      to: req.query.to,
      search: req.query.q,
      page: req.query.page,
      pageSize: 25
    }), demoOr('smsInvoices', { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, kpis: { totalOutstanding: 0, totalOverdue: 0, count: 0 }, filters: { status: '', studentId: '', familyId: '', overdueOnly: false, from: '', to: '', search: '' } }));
    res.render('sms/invoices/list', data);
  } catch (err) { next(err); }
});

router.get('/invoices/partials/table', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const data = await safeCall(invoiceService.list({
      schoolDb: req.schoolDb,
      status: req.query.status,
      studentId: req.query.studentId,
      familyId: req.query.familyId,
      overdueOnly: req.query.overdueOnly,
      from: req.query.from,
      to: req.query.to,
      search: req.query.q,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, kpis: { totalOutstanding: 0, totalOverdue: 0, count: 0 }, filters: { status: '', studentId: '', familyId: '', overdueOnly: false, from: '', to: '', search: '' } });
    res.render('sms/invoices/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

router.get('/invoices/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Generate invoices | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'invoices';
    const [classes, categories, students] = await Promise.all([
      safeCall(classService.list({ schoolDb: req.schoolDb, status: 'active', pageSize: 100 }), { rows: [] }),
      safeCall(invoiceService.listBillingCategories({ schoolDb: req.schoolDb }), []),
      safeCall(invoiceService.listStudentsForBilling({ schoolDb: req.schoolDb, classId: req.query.classId }), [])
    ]);
    res.render('sms/invoices/generate', {
      classes: classes.rows, categories, students,
      defaults: { amount: '', dueDate: req.query.dueDate || '', description: '', classId: req.query.classId || '' }
    });
  } catch (err) { next(err); }
});

router.get('/invoices/new/students', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const students = await safeCall(invoiceService.listStudentsForBilling({ schoolDb: req.schoolDb, classId: req.query.classId }), []);
    res.render('sms/invoices/partials/student-checklist', { students, layout: false });
  } catch (err) { next(err); }
});

router.post('/invoices/generate', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds : (req.body.studentIds ? [req.body.studentIds] : []);
    if (studentIds.length === 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'warning', message: 'No students selected.' } }));
      return res.status(204).end();
    }
    // Up-front validation
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Amount must be a positive number.' } }));
      return res.status(400).end();
    }
    const dueDate = String(req.body.dueDate || '').trim();
    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Valid due date required.' } }));
      return res.status(400).end();
    }
    const result = await safeCall(invoiceService.generateBulk({
      schoolDb: req.schoolDb,
      data: {
        studentIds,
        amount: req.body.amount,
        dueDate: req.body.dueDate,
        description: req.body.description,
        billingCategoryId: req.body.billingCategoryId
      },
      actor: req.user
    }), { generated: [], skipped: [] });
    const msg = `Generated ${result.generated.length} invoice(s)` + (result.skipped.length ? `, skipped ${result.skipped.length} (already have pending).` : '.');
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: msg } }));
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/invoices');
      return res.status(204).end();
    }
    res.redirect('/sms/invoices');
  } catch (err) { next(err); }
});

router.get('/invoices/:id([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Invoice | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'invoices';
    const invoice = await safeCall(invoiceService.getById({ schoolDb: req.schoolDb, invoiceId: Number(req.params.id) }), null);
    if (!invoice) return res.status(404).render('errors/csrf', { message: 'Invoice not found.' });
    const payments = await safeCall(invoiceService.getPayments({ schoolDb: req.schoolDb, invoiceId: Number(req.params.id) }), []);
    res.render('sms/invoices/detail', { invoice, payments });
  } catch (err) { next(err); }
});

// Document-style invoice for printing or saving as PDF from the browser.
// Carries the school's letterhead and banking details so parents know
// where to pay.
router.get('/invoices/:id([1-9]\\d*)/print', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Invoice | School Management';
    res.locals.portal = 'sms';
    const invoice = await safeCall(invoiceService.getById({ schoolDb: req.schoolDb, invoiceId: Number(req.params.id) }), null);
    if (!invoice) return res.status(404).render('errors/csrf', { message: 'Invoice not found.' });
    const [payments, school] = await Promise.all([
      safeCall(invoiceService.getPayments({ schoolDb: req.schoolDb, invoiceId: Number(req.params.id) }), []),
      safeCall(settingsService.getSchool({ schoolDb: req.schoolDb }), null)
    ]);
    res.render('sms/invoices/print', { invoice, payments, school: school || {} });
  } catch (err) { next(err); }
});

router.post('/invoices/:id([1-9]\\d*)/status', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const newStatus = String(req.body.status || '').trim();
    const ok = await safeCall(invoiceService.updateStatus({ schoolDb: req.schoolDb, invoiceId: id, status: newStatus, actor: req.user }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not update status.' } }));
      return res.status(404).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Status updated to ' + newStatus + '.' } }));
    return res.status(204).end();
  } catch (err) { next(err); }
});

// ========================================================
// Payments
// ========================================================
router.get('/payments', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Payments | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'payments';
    const data = await safeCall(paymentService.list({
      schoolDb: req.schoolDb,
      allocationStatus: req.query.allocationStatus,
      paymentMethod: req.query.paymentMethod,
      search: req.query.q,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, kpis: { totalAllocated: 0, totalUnallocated: 0, totalPending: 0, count: 0 }, filters: { allocationStatus: '', paymentMethod: '', search: '', from: '', to: '' } });
    res.render('sms/payments/list', data);
  } catch (err) { next(err); }
});

router.get('/payments/partials/table', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const data = await safeCall(paymentService.list({
      schoolDb: req.schoolDb,
      allocationStatus: req.query.allocationStatus,
      paymentMethod: req.query.paymentMethod,
      search: req.query.q,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, kpis: { totalAllocated: 0, totalUnallocated: 0, totalPending: 0, count: 0 }, filters: { allocationStatus: '', paymentMethod: '', search: '', from: '', to: '' } });
    res.render('sms/payments/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

router.get('/payments/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Record payment | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'payments';
    // Provide a list of Pending/Partial invoices for the optional invoice picker
    const invoices = await safeCall(invoiceService.list({
      schoolDb: req.schoolDb,
      status: 'Pending', pageSize: 200
    }), { rows: [] });
    res.render('sms/payments/form', { invoices: invoices.rows, defaults: { amount: '', paymentMethod: 'EFT', payeeName: '', transactionDate: new Date().toISOString().slice(0,10), invoiceId: req.query.invoiceId || '' } });
  } catch (err) { next(err); }
});

router.post('/payments', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    // Up-front validation so we can return 400 cleanly
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Amount must be a positive number.' } }));
      return res.status(400).end();
    }
    if (req.body.paymentMethod && !['EFT','Cash','Card','Cheque','DebitOrder','Mobile','Other'].includes(req.body.paymentMethod)) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Invalid payment method.' } }));
      return res.status(400).end();
    }

    const result = await safeCall(paymentService.record({
      schoolDb: req.schoolDb,
      data: req.body,
      actor: req.user
    }), null);
    if (!result) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not record payment.' } }));
      return res.status(500).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Payment recorded: ' + result.receiptNumber } }));
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/payments');
      return res.status(204).end();
    }
    res.redirect('/sms/payments');
  } catch (err) { next(err); }
});

router.post('/payments/:id([1-9]\\d*)/allocate', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const invoiceId = Number(req.body.invoiceId);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Invoice id required.' } }));
      return res.status(400).end();
    }
    const ok = await safeCall(paymentService.allocate({
      schoolDb: req.schoolDb,
      transactionId: Number(req.params.id),
      invoiceId,
      actor: req.user
    }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not allocate.' } }));
      return res.status(404).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Payment allocated.' } }));
    return res.status(204).end();
  } catch (err) { next(err); }
});

// ========================================================
// Bank Statements
// ========================================================
router.get('/bank-statements', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.bank_reconciliation.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Bank statements | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'bank-statements';
    const data = await safeCall(bankStatementService.listStatements({ schoolDb: req.schoolDb, page: req.query.page, pageSize: 25 }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false });
    res.render('sms/bank-statements/list', data);
  } catch (err) { next(err); }
});

router.get('/bank-statements/new', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.bank_reconciliation.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Upload statement | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'bank-statements';
    res.render('sms/bank-statements/upload');
  } catch (err) { next(err); }
});

router.post('/bank-statements', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.bank_reconciliation.view'), async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const csvText = String(req.body.csv || '').trim();
    const fileName = String(req.body.fileName || 'statement.csv').trim().slice(0, 255);
    if (!csvText) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'CSV text is empty.' } }));
      return res.status(400).end();
    }
    const result = await safeCall(bankStatementService.ingestCSV({ schoolDb: req.schoolDb, fileName, csvText, actor: req.user }), null);
    if (!result) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not import statement.' } }));
      return res.status(500).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Imported ' + result.linesImported + ' lines from statement.' } }));
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/bank-statements/' + result.statementId);
      return res.status(204).end();
    }
    res.redirect('/sms/bank-statements/' + result.statementId);
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message || 'Import failed' } }));
    if (req.headers['hx-request'] === 'true') return res.status(400).end();
    next(err);
  }
});

router.get('/bank-statements/:id([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Statement detail | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'bank-statements';
    const statement = await safeCall(bankStatementService.getStatement({ schoolDb: req.schoolDb, statementId: Number(req.params.id) }), null);
    if (!statement) return res.status(404).render('errors/csrf', { message: 'Statement not found.' });
    const lines = await safeCall(bankStatementService.getLines({ schoolDb: req.schoolDb, statementId: Number(req.params.id) }), []);
    res.render('sms/bank-statements/detail', { statement, lines });
  } catch (err) { next(err); }
});

router.get('/bank-statements/lines/:id([1-9]\\d*)/suggest', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const matches = await safeCall(bankStatementService.suggestMatches({ schoolDb: req.schoolDb, transactionId: Number(req.params.id), limit: 5 }), []);
    res.render('sms/bank-statements/partials/match-suggestions', { matches, transactionId: Number(req.params.id), layout: false });
  } catch (err) { next(err); }
});

router.delete('/bank-statements/:id([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const ok = await safeCall(bankStatementService.deleteStatement({ schoolDb: req.schoolDb, statementId: Number(req.params.id), actor: req.user }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not delete statement.' } }));
      return res.status(404).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Statement removed.' } }));
    res.set('HX-Redirect', '/sms/bank-statements');
    return res.status(204).end();
  } catch (err) { next(err); }
});

// ========================================================
// Staff (Employees, Leave, Payslips)
// ========================================================
router.get('/staff', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Staff | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'staff';
    const data = await safeCall(staffService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      department: req.query.department,
      status: req.query.status || 'active',
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', department: '', status: 'active' } });
    const departments = await safeCall(staffService.listDepartments({ schoolDb: req.schoolDb }), []);
    res.render('sms/staff/list', { ...data, departments });
  } catch (err) { next(err); }
});

router.get('/staff/partials/table', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const data = await safeCall(staffService.list({
      schoolDb: req.schoolDb,
      search: req.query.q,
      department: req.query.department,
      status: req.query.status || 'active',
      page: req.query.page,
      pageSize: 25
    }), { rows: [], total: 0, page: 1, pageSize: 25, hasMore: false, filters: { search: '', department: '', status: 'active' } });
    res.render('sms/staff/partials/table', { ...data, layout: false });
  } catch (err) { next(err); }
});

router.get('/staff/:id([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Staff member | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'staff';
    const employee = await safeCall(staffService.getById({ schoolDb: req.schoolDb, employeeId: Number(req.params.id) }), null);
    if (!employee) return res.status(404).render('errors/csrf', { message: 'Employee not found.' });
    const [leaveRequests, payslips] = await Promise.all([
      safeCall(staffService.getLeaveRequests({ schoolDb: req.schoolDb, employeeId: Number(req.params.id), limit: 10 }), []),
      safeCall(staffService.getPayslips({ schoolDb: req.schoolDb, employeeId: Number(req.params.id), limit: 12 }), [])
    ]);
    res.render('sms/staff/detail', { employee, leaveRequests, payslips });
  } catch (err) { next(err); }
});

router.get('/staff/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'New staff | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'staff';
    res.render('sms/staff/new');
  } catch (err) { next(err); }
});

router.post('/staff', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const result = await staffService.create({ schoolDb: req.schoolDb, data: req.body, actor: req.user });
    res.redirect('/sms/staff/' + (result.EmployeeID || result.id));
  } catch (err) {
    res.status(400).render('errors/offline', { message: err.message });
  }
});

// ========================================================
// Reports
// ========================================================
router.get('/reports', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('reports.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Reports | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'reports';
    const reports = reportService.listReports();
    res.render('sms/reports/list', { reports });
  } catch (err) { next(err); }
});

router.get('/reports/:type', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('reports.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Report | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'reports';
    const type = req.params.type;
    const reports = reportService.listReports();
    const def = reports.find(r => r.id === type);
    if (!def) return res.status(404).render('errors/csrf', { message: 'Report not found.' });

    // For class-roster we need the class list for the picker
    let classes = [];
    if (type === 'class-roster' || type === 'attendance-rate') {
      classes = (await safeCall(classService.list({ schoolDb: req.schoolDb, status: 'active', pageSize: 200 }), { rows: [] })).rows;
    }

    let report = null;
    let runError = null;
    if (Object.keys(req.query).length > 1 || req.query.run) {
      try {
        report = await safeCall(reportService.run({
          schoolDb: req.schoolDb,
          type,
          from: req.query.from,
          to: req.query.to,
          classId: req.query.classId,
          familyId: req.query.familyId
        }), null);
      } catch (e) {
        runError = e.message;
      }
    }
    res.render('sms/reports/run', { def, type, classes, report, runError, query: req.query });
  } catch (err) { next(err); }
});

router.get('/reports/:type/export.csv', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('reports.view'), async (req, res, next) => {
  try {
    const type = req.params.type;
    const report = await safeCall(reportService.run({
      schoolDb: req.schoolDb,
      type,
      from: req.query.from,
      to: req.query.to,
      classId: req.query.classId,
      familyId: req.query.familyId
    }), null);
    if (!report) return res.status(500).send('Could not generate report');
    const csv = reportService.toCSV(report);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="' + type + '-' + new Date().toISOString().slice(0,10) + '.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

// ========================================================
// Settings
// ========================================================
router.get('/settings', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Settings | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'settings';
    const [school, categories] = await Promise.all([
      safeCall(settingsService.getSchool({ schoolDb: req.schoolDb }), null),
      safeCall(settingsService.listBillingCategories({ schoolDb: req.schoolDb }), [])
    ]);
    res.render('sms/settings/index', { school, categories });
  } catch (err) { next(err); }
});

router.post('/settings/school', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    // Up-front validation
    if (!req.body.schoolName || !String(req.body.schoolName).trim()) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'School name is required.' } }));
      return res.status(400).end();
    }
    if (req.body.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.contactEmail)) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Invalid contact email.' } }));
      return res.status(400).end();
    }
    if (req.body.defaultMonthlyFee && Number(req.body.defaultMonthlyFee) < 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Default fee must be a non-negative number.' } }));
      return res.status(400).end();
    }
    const ok = await safeCall(settingsService.updateSchool({ schoolDb: req.schoolDb, data: req.body, actor: req.user }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not save school.' } }));
      return res.status(500).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'School settings saved.' } }));
    res.set('HX-Redirect', '/sms/settings');
    return res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/settings/billing-categories', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const newId = await safeCall(settingsService.createBillingCategory({ schoolDb: req.schoolDb, data: req.body, actor: req.user }), null);
    if (!newId) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not create category.' } }));
      return res.status(500).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Category created.' } }));
    res.set('HX-Redirect', '/sms/settings');
    return res.status(204).end();
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message || 'Create failed' } }));
    if (req.headers['hx-request'] === 'true') return res.status(400).end();
    next(err);
  }
});

router.post('/settings/billing-categories/:id([1-9]\\d*)/toggle', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    if (req.schoolDb.schoolId == null) {
      return res.status(403).render('errors/forbidden', { user: req.user, message: 'No school context.' });
    }
    const isActive = req.body.isActive === 'true' || req.body.isActive === '1';
    const ok = await safeCall(settingsService.updateBillingCategory({
      schoolDb: req.schoolDb,
      categoryId: Number(req.params.id),
      data: { isActive },
      actor: req.user
    }), false);
    if (!ok) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Could not update.' } }));
      return res.status(404).end();
    }
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: isActive ? 'Category enabled.' : 'Category disabled.' } }));
    return res.status(204).end();
  } catch (err) { next(err); }
});

// ========================================================
// Dashboard + placeholders for screens not yet migrated
// ========================================================
router.get('/', requireAuth, requireRoleMw, async (req, res, next) => {
  try {
    res.locals.title = 'Dashboard | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'home';
    const schoolId = req.user.schoolId || (req.schoolDb && req.schoolDb.schoolId);
    const dashboard = schoolId
      ? await safeCall(dashboardService.getSchoolDashboard(schoolId), demoOr('schoolDashboard', null))
      : demoOr('schoolDashboard', null);
    res.render('sms/dashboard', { dashboard });
  } catch (err) { next(err); }
});

// Kinder Care Hub inside the SMS portal
router.get('/kch', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('messaging.school.use'), async (req, res, next) => {
  try {
    res.locals.title = 'Kinder Care Hub | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'kch';
    res.locals.showAi = true;
    res.render('partials/kch-chat', { showAi: true, sidebarOverride: 'school', currentUserId: req.user.id });
  } catch (err) { next(err); }
});

// ========================================================
// Leave Management (HR) - critical HR/Leave dashboard
// ========================================================
const LeaveService = require('../../business/leaveService');
const PayslipService = require('../../business/payslipService');
const leaveService = new LeaveService();
const payslipService = new PayslipService();

router.get('/leave', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Leave | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'leave';
    const pending = await safeCall(leaveService.getLeaves(req.user, { status: 'Pending' }), []);
    const recent = await safeCall(leaveService.getLeaves(req.user, { pageSize: 50 }), []);
    const types = await safeCall(leaveService.getLeaveTypes ? leaveService.getLeaveTypes(req.user) : Promise.resolve([]), []);
    const balances = await safeCall(leaveService.getAllBalances ? leaveService.getAllBalances(req.user, new Date().getFullYear()) : Promise.resolve([]), []);
    res.render('sms/leave/list', { pending, recent, types, balances });
  } catch (err) { next(err); }
});

router.post('/leave/:id([1-9]\\d*)/review', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const status = String(req.body.status || '').trim();
    if (!['Approved', 'Declined'].includes(status)) {
      return res.status(400).json({ error: 'invalid-status' });
    }
    await leaveService.reviewLeave(id, status, req.user);
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Leave ' + status.toLowerCase() } }));
    res.status(204).end();
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message } }));
    res.status(400).end();
  }
});

// ========================================================
// HR / Payslips - critical Finance + HR
// ========================================================
router.get('/payslips', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Payslips | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'payslips';
    const list = await safeCall(payslipService.getPayslips(req.user, req.query || {}), []);
    res.render('sms/payslips/list', { list });
  } catch (err) { next(err); }
});

router.get('/payslips/:id([1-9]\\d*)', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Payslip | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'payslips';
    const payslip = await safeCall(payslipService.getPayslipById(parseInt(req.params.id, 10), req.user), null);
    if (!payslip) return res.status(404).render('errors/404', { path: req.originalUrl });
    res.render('sms/payslips/detail', { payslip });
  } catch (err) { next(err); }
});

router.get('/payslips/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'New payslip | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'payslips';
    const employees = await safeCall((new (require('../../business/staffPortalService'))()).list({ schoolDb: req.schoolDb, pageSize: 500 }), { items: [] });
    res.render('sms/payslips/new', { employees: employees.items || [] });
  } catch (err) { next(err); }
});

router.post('/payslips', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const result = await payslipService.createPayslip({ ...req.body, schoolId: req.schoolDb.schoolId }, req.user);
    res.redirect('/sms/payslips/' + result.PayslipID);
  } catch (err) {
    res.status(400).render('errors/offline', { message: err.message });
  }
});

router.post('/payslips/:id([1-9]\\d*)/finalize', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    await payslipService.finalizePayslip(parseInt(req.params.id, 10), req.user);
    res.redirect('/sms/payslips/' + req.params.id);
  } catch (err) {
    res.status(400).render('errors/offline', { message: err.message });
  }
});

// ========================================================
// Bank reconciliation (Tasks 1-15 simplified monthly model)
// ========================================================
const { BankReconciliationService } = require('../../business/bankReconciliationService');

async function reconciliationContext(req) {
  const schoolId = req.schoolDb.schoolId;
  let tenantId = req.user.tenantId || null;
  if (!tenantId && schoolId) {
    tenantId = await BankReconciliationService.resolveTenantIdForSchool(schoolId);
  }
  return { tenantId, schoolId };
}

async function loadBankAccounts(schoolId) {
  try {
    const pool = await getPool();
    const result = await pool.request().input('s', sql.Int, schoolId).query(`
      SELECT ba.BankAccountID AS BankAccountId, ba.AccountName, ba.AccountNumber, ba.BankName,
             (SELECT MAX(bt.BankEffectiveDate)
              FROM dbo.BankTransactions bt
              WHERE bt.BankAccountId = ba.BankAccountID AND bt.SchoolId = ba.SchoolID) AS LastImportedDate
      FROM dbo.BankAccounts ba
      WHERE ba.SchoolID = @s AND ba.IsActive = 1
      ORDER BY ba.AccountName
    `);
    return result.recordset;
  } catch (err) {
    return [];
  }
}

router.get('/bank-reconciliation', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Reconciliation | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'bank-reconciliation';
    const sid = req.schoolDb.schoolId;
    const bankAccounts = await loadBankAccounts(sid);
    const selectedBankAccountId = req.query.bankAccountId ? Number(req.query.bankAccountId) : null;
    if (!selectedBankAccountId) {
      return res.render('sms/bank-statements/reconciliation-landing', { bankAccounts, selectedBankAccountId: null });
    }
    const filter = String(req.query.filter || 'all');
    const ctx = await reconciliationContext(req);
    const service = new BankReconciliationService();
    const statusFilter = filter === 'open' ? 'open' : (filter === 'reconciled' ? 'reconciled' : null);
    const statements = await safeCall(service.listStatements({
      tenantId: ctx.tenantId, schoolId: ctx.schoolId, bankAccountId: selectedBankAccountId, statusFilter
    }), []);
    const bankAccount = bankAccounts.find(b => b.BankAccountId === selectedBankAccountId) || null;
    res.render('sms/bank-statements/reconciliation-list', { bankAccounts, bankAccount, statements, filter, selectedBankAccountId });
  } catch (err) { next(err); }
});

router.get('/bank-reconciliation/:id', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Reconciliation | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'bank-reconciliation';
    const id = Number(req.params.id);
    const ctx = await reconciliationContext(req);
    const service = new BankReconciliationService();
    const statement = await service.getStatement(id, ctx.tenantId, ctx.schoolId);
    if (!statement) return res.status(404).render('errors/404', { path: req.originalUrl });
    const txList = await safeCall(service.listTransactionsForStatement(id, ctx.tenantId, ctx.schoolId), []);
    const bankAccounts = await loadBankAccounts(req.schoolDb.schoolId);
    const bankAccount = bankAccounts.find(b => b.BankAccountId === statement.BankAccountId) || null;
    const selectedBankTransactionId = req.query.tx ? Number(req.query.tx) : null;
    res.render('sms/bank-statements/reconciliation-detail', { statement, bankAccount, transactions: txList, selectedBankTransactionId });
  } catch (err) { next(err); }
});

router.post('/bank-reconciliation/:id/reconcile', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ctx = await reconciliationContext(req);
    const service = new BankReconciliationService();
    await service.markReconciled(id, ctx.tenantId, ctx.schoolId, req.user.id);
    res.redirect('/sms/bank-reconciliation/' + id);
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message } }));
    res.status(400).render('errors/offline', { message: err.message });
  }
});

router.post('/bank-reconciliation/:id/transactions/:txId/match', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const ctx = await reconciliationContext(req);
    const service = new BankReconciliationService();
    await service.matchBankTransactionToInvoice({
      statementId: Number(req.params.id),
      bankTransactionId: Number(req.params.txId),
      invoiceId: Number(req.body.invoiceId),
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      userId: req.user.id
    });
    res.redirect('/sms/bank-reconciliation/' + req.params.id + '?tx=' + req.params.txId);
  } catch (err) {
    res.status(400).render('errors/offline', { message: err.message });
  }
});

router.get('/bank-statements/import', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.bank_reconciliation.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Import Bank Statement | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'bank-import';
    const bankAccounts = await loadBankAccounts(req.schoolDb.schoolId);
    res.render('sms/bank-statements/import', { bankAccounts });
  } catch (err) { next(err); }
});

const placeholders = [];
placeholders.forEach(function (slug) {
  const title = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  router.get('/' + slug, requireAuth, requireRoleMw, function (req, res) {
    res.locals.title = title + ' | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = slug;
    res.locals.sectionTitle = title;
    res.locals.legacyPath = '/school/' + slug;
    res.render('sms/placeholder', { slug, title });
  });
});

// ========================================================
// Outstanding Fees (year calendar + Excel export)
// ========================================================
const OutstandingInvoiceService = require('../../business/invoiceService');
// ========================================================
// Refunds / Adjustments / Registration Fees / Period Locks / Year-End
// ========================================================
const Facades = require('../../business/smsPortalFacades');
const admissionsFinanceService = new Facades.AdmissionsFinanceService();
const permissionLeaveYearEndService = new Facades.PermissionLeaveYearEndService();
const rolloverService = new Facades.RolloverTemplateService();
const adminAuditService = new Facades.AdminAuditService();
const schoolServiceFacade = new Facades.SchoolServiceFacade();
const userServiceFacade = new Facades.UserServiceFacade();

router.get('/refunds', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.refunds.create'), async (req, res, next) => {
  try {
    res.locals.title = 'Refunds | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'refunds';
    const list = await safeCall(admissionsFinanceService.getRefunds(req.user), []);
    res.render('sms/refunds/list', { list });
  } catch (err) { next(err); }
});

router.get('/refunds/new', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'New refund | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'refunds';
    const families = await safeCall(admissionsFinanceService.getFamiliesWithBalance(req.user), []);
    res.render('sms/refunds/new', { families, form: req.body || { familyId: '', amount: '', reason: '' }, errors: {} });
  } catch (err) { next(err); }
});

router.post('/refunds', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const result = await safeCall(admissionsFinanceService.createRefund(req.user, {
      familyId: req.body.familyId,
      studentId: req.body.studentId || null,
      amount: req.body.amount,
      reason: req.body.reason
    }), { ok: false, error: 'service-unavailable' });
    if (!result || !result.ok) {
      const families = await safeCall(admissionsFinanceService.getFamiliesWithBalance(req.user), []);
      const errors = {};
      if (result && result.error === 'refund-exceeds-available-balance') {
        errors._form = `Refund exceeds the family's available balance of ${(result.availableBalance || 0).toFixed(2)}. Pending refunds (${(result.availableBalance || 0).toFixed(2)} available).`;
      } else {
        errors._form = (result && result.error) || 'Could not create refund';
      }
      return res.status(400).render('sms/refunds/new', { families, form: req.body, errors });
    }
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/refunds');
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Refund created. Awaiting approval.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/refunds');
  } catch (err) { next(err); }
});

router.post('/refunds/:id/approve', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    await safeCall(admissionsFinanceService.approveRefund(req.user, Number(req.params.id)), { ok: false });
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Refund approved.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/refunds');
  } catch (err) { next(err); }
});

router.post('/refunds/:id/complete', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const result = await safeCall(admissionsFinanceService.completeRefund(req.user, Number(req.params.id)), { ok: false, error: 'service-unavailable' });
    if (!result || !result.ok) {
      if (req.headers['hx-request'] === 'true') {
        const msg = (result && result.error === 'refund-exceeds-available-balance')
          ? `Cannot complete: refund exceeds available balance (${(result.availableBalance || 0).toFixed(2)}).`
          : `Cannot complete refund: ${result && result.error}`;
        res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: msg } }));
        return res.status(204).end();
      }
      return res.redirect('/sms/refunds');
    }
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Refund completed.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/refunds');
  } catch (err) { next(err); }
});

router.get('/adjustments', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.adjustments.create'), async (req, res, next) => {
  try {
    res.locals.title = 'Adjustments | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'adjustments';
    const list = await safeCall(admissionsFinanceService.getAdjustments(req.user), []);
    res.render('sms/adjustments/list', { list });
  } catch (err) { next(err); }
});

router.get('/adjustments/new', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.adjustments.create'), async (req, res, next) => {
  try {
    res.locals.title = 'New adjustment | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'adjustments';
    const families = await safeCall(admissionsFinanceService.getFamiliesWithBalance(req.user), []);
    const familyId = req.query.familyId ? Number(req.query.familyId) : (families[0] ? families[0].FamilyID : null);
    const students = familyId ? await safeCall(admissionsFinanceService.getStudentsForFamily(req.user, familyId), []) : [];
    res.render('sms/adjustments/new', { families, students, selectedFamilyId: familyId, form: { reason: '', items: [] }, errors: {} });
  } catch (err) { next(err); }
});

router.get('/adjustments/students', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.adjustments.create'), async (req, res, next) => {
  try {
    const students = await safeCall(admissionsFinanceService.getStudentsForFamily(req.user, Number(req.query.familyId)), []);
    res.render('sms/adjustments/partials/student-rows', { students, layout: false }, (err, html) => {
      if (err) return next(err);
      res.send(html);
    });
  } catch (err) { next(err); }
});

router.post('/adjustments', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.adjustments.create'), async (req, res, next) => {
  try {
    // Collect items from the dynamic form: students[N][id], students[N][amount], students[N][type]
    const items = [];
    Object.keys(req.body || {}).forEach((key) => {
      const m = /^students\[(\d+)\]\[id\]$/.exec(key);
      if (m) {
        const i = m[1];
        const id = req.body[`students[${i}][id]`];
        const amount = req.body[`students[${i}][amount]`];
        const adjustmentType = req.body[`students[${i}][type]`];
        const invoiceId = req.body[`students[${i}][invoiceId]`];
        if (id && amount) items.push({ studentId: id, amount, adjustmentType, invoiceId });
      }
    });
    const result = await safeCall(admissionsFinanceService.createAdjustment(req.user, {
      familyId: req.body.familyId,
      reason: req.body.reason,
      items
    }), { ok: false, error: 'service-unavailable' });
    if (!result || !result.ok) {
      const families = await safeCall(admissionsFinanceService.getFamiliesWithBalance(req.user), []);
      const students = req.body.familyId ? await safeCall(admissionsFinanceService.getStudentsForFamily(req.user, Number(req.body.familyId)), []) : [];
      return res.status(400).render('sms/adjustments/new', {
        families,
        students,
        selectedFamilyId: Number(req.body.familyId),
        form: req.body,
        errors: { _form: (result && result.error) || 'Could not create adjustment' }
      });
    }
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Redirect', '/sms/adjustments');
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: `${result.created.length} adjustment(s) created.` } }));
      return res.status(204).end();
    }
    res.redirect('/sms/adjustments');
  } catch (err) { next(err); }
});

router.get('/outstanding', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('finance.outstanding_fees.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Outstanding fees | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'outstanding';
    const { buildOutstandingPivot } = require('../../data/outstandingRepository');
    const pivot = await safeCall(buildOutstandingPivot({
      schoolId: req.schoolDb.schoolId,
      tenantId: req.user.TenantId || req.user.tenantId || 0
    }), { years: [], months: [], families: [], grandYearTotals: {}, grandTotal: 0 });
    res.render('sms/outstanding/list', { pivot });
  } catch (err) { next(err); }
});

router.get('/outstanding/export.csv', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    const { buildOutstandingCsv } = require('../../data/outstandingRepository');
    const csv = await safeCall(buildOutstandingCsv({
      schoolId: req.schoolDb.schoolId,
      tenantId: req.user.TenantId || req.user.tenantId || 0
    }), '');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="outstanding-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

router.get('/registration-fees', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Registration fees | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'registration-fees';
    const list = await safeCall(admissionsFinanceService.getRegistrationFees(req.user), []);
    res.render('sms/registration-fees/list', { list });
  } catch (err) { next(err); }
});

router.get('/period-locks', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Finance period locks | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'period-locks';
    const list = await safeCall(admissionsFinanceService.getFinancePeriodLocks(req.user), []);
    res.render('sms/period-locks/list', { list });
  } catch (err) { next(err); }
});

router.get('/year-end', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Year-end closing | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'year-end';
    const list = await safeCall(permissionLeaveYearEndService.getYearEndClosings(req.user), []);
    res.render('sms/year-end/list', { list });
  } catch (err) { next(err); }
});

// ========================================================
// Re-enrolment / Year Rollover
// ========================================================
router.get('/reenrolment', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Re-enrolment | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'reenrolment';
    const year = Number(req.query.year) || new Date().getFullYear();
    const pending = await safeCall(rolloverService.getPendingStudentsForYear(req.user, year), []);
    res.render('sms/reenrolment/list', { year, pending });
  } catch (err) { next(err); }
});

// ========================================================
// Consents & Permissions
// ========================================================
router.get('/consents', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Consents | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'consents';
    const list = await safeCall(admissionsFinanceService.getConsents(req.user), []);
    res.render('sms/consents/list', { list });
  } catch (err) { next(err); }
});

router.get('/permissions', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('permissions.view'), async (req, res, next) => {
  try {
    res.locals.title = 'Permissions | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'permissions';
    const roles = await safeCall(permissionLeaveYearEndService.getStaffRoles(req.user), []);
    // Build a map roleId -> { key -> decision } from overrides
    const overrideRepo = require('../../data/rolePermissionOverrideRepository');
    const overridesByRole = {};
    for (const r of (roles || [])) {
      overridesByRole[r.StaffRoleID] = {};
    }
    try {
      const allRoleIds = (roles || []).map(r => r.StaffRoleID);
      const overrides = await overrideRepo.listForRoles(allRoleIds);
      for (const o of overrides) {
        if (!overridesByRole[o.RoleId]) overridesByRole[o.RoleId] = {};
        overridesByRole[o.RoleId][o.PermissionKey] = o.Decision;
      }
    } catch (_) { /* DB unavailable in test mode */ }
    const { FEATURE_CATALOG, DEFAULT_GRANTS } = require('../../security/featureCatalog');
    res.render('sms/permissions/list', { roles, overridesByRole, catalog: FEATURE_CATALOG, defaults: DEFAULT_GRANTS });
  } catch (err) { next(err); }
});

router.post('/permissions/:roleId', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('school.staff.permissions.manage'), async (req, res, next) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: 'invalid-role-id' });
    }
    const decisions = [];
    const overrideRepo = require('../../data/rolePermissionOverrideRepository');
    const { allPermissionKeys } = require('../../security/featureCatalog');
    for (const key of allPermissionKeys()) {
      const raw = req.body[`decision[${key}]`];
      const value = (raw === 'Allow' || raw === 'Deny') ? raw : 'Inherit';
      decisions.push({ permissionKey: key, decision: value });
    }
    const result = await safeCall(overrideRepo.bulkReplace({ roleId, decisions }), { ok: true, count: 0 });
    const { clearCache } = require('../../security/permissionResolver');
    clearCache();
    if (req.headers['hx-request'] === 'true') {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Permission matrix saved.' } }));
      return res.status(204).end();
    }
    res.redirect('/sms/permissions?role=' + roleId);
  } catch (err) { next(err); }
});

// ========================================================
// Audit log (school-scoped)
// ========================================================
router.get('/audit', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Audit log | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'audit';
    const rows = await safeCall(adminAuditService.getSchoolAudit(req.user, {
      from: req.query.from,
      to: req.query.to,
      entityName: req.query.entityName,
      action: req.query.action
    }), []);
    res.render('sms/audit/list', { rows, filters: req.query });
  } catch (err) { next(err); }
});

// ========================================================
// System users (school-scoped)
// ========================================================
router.get('/users', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('school.staff.manage'), async (req, res, next) => {
  try {
    res.locals.title = 'System users | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'users';
    const users = await safeCall(userServiceFacade.getSchoolUsers(req.user, req.schoolDb.schoolId), []);
    res.render('sms/users/list', { users });
  } catch (err) { next(err); }
});

// ========================================================
// School account settings (banking + financial year + logo)
// ========================================================
router.get('/settings/school-account', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('school.account.view'), async (req, res, next) => {
  try {
    res.locals.title = 'School account | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'settings';
    const school = await safeCall(schoolServiceFacade.getSchoolById(req.schoolDb.schoolId), null);
    res.render('sms/settings/school-account', { school: school || {} });
  } catch (err) { next(err); }
});

router.post('/settings/school-account', requireAuth, requireRoleMw, requireSchoolScope, requireFeature('school.account.view'), async (req, res, next) => {
  try {
    await schoolServiceFacade.updateSchool(req.schoolDb.schoolId, req.body, req.user);
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'School account saved' } }));
    res.redirect('/sms/settings/school-account');
  } catch (err) {
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message } }));
    res.status(400).render('errors/offline', { message: err.message });
  }
});

// ========================================================
// Subscription (current plan + available plans)
// ========================================================
router.get('/settings/subscription', requireAuth, requireRoleMw, requireSchoolScope, async (req, res, next) => {
  try {
    res.locals.title = 'Subscription | School Management';
    res.locals.portal = 'sms';
    res.locals.activeNav = 'settings';
    // Plan cards mirror the real gating: every plan gets the full school
    // management + finance platform; Kinder Care Hub messaging and AI are
    // included on Pro+ only (messagingPackageService) and available to the
    // other plans as paid messaging packages.
    const currentPlan = (req.currentSchool && req.currentSchool.SubscriptionPlan) || 'Standard';
    const core = [
      { FeatureName: 'Students, families, classes & attendance', IsEnabled: true },
      { FeatureName: 'Invoicing, payments & outstanding fees', IsEnabled: true },
      { FeatureName: 'Bank statement reconciliation', IsEnabled: true },
      { FeatureName: 'Staff, leave & payslips', IsEnabled: true },
      { FeatureName: 'Parent portal with online payments', IsEnabled: true },
      { FeatureName: 'Reports & audit log', IsEnabled: true },
      { FeatureName: 'Report a Fault support channel', IsEnabled: true }
    ];
    const messaging = (included) => [
      { FeatureName: 'Kinder Care Hub messaging' + (included ? '' : ' (paid add-on packages)'), IsEnabled: included },
      { FeatureName: 'Parent & staff broadcasts', IsEnabled: included },
      { FeatureName: 'AI assistant & AI reconciliation', IsEnabled: included }
    ];
    const plans = [
      { PlanCode: 'STANDARD', PlanName: 'Standard', Description: 'The full school management and finance platform.', PricePerMonth: '899', IsCurrent: currentPlan === 'Standard', features: core.concat(messaging(false)) },
      { PlanCode: 'PRO', PlanName: 'Pro', Description: 'For growing schools - higher usage limits and priority support.', PricePerMonth: null, IsCurrent: currentPlan === 'Pro', features: core.concat(messaging(false)) },
      { PlanCode: 'PRO_PLUS', PlanName: 'Pro+', Description: 'Everything, including Kinder Care Hub messaging and AI.', PricePerMonth: null, IsCurrent: currentPlan === 'Pro+', features: core.concat(messaging(true)) }
    ];
    res.render('sms/settings/subscription', { plans, currentPlan });
  } catch (err) { next(err); }
});

module.exports = router;
