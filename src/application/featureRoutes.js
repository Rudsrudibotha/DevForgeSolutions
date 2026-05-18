// Application Layer - Feature routes
// Covers: behaviour logs, academic notes, documents, credit notes, discounts,
// promise-to-pay, invoice templates, communication history, parent communication, parent detail changes

const express = require('express');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');
const { audit, auditLog } = require('../middleware/audit');
const {
  BehaviourLogRepository, AcademicNoteRepository, DocumentRepository,
  CreditNoteRepository, DiscountRepository, PromiseToPayRepository,
  InvoiceTemplateRepository, CommunicationHistoryRepository,
  ParentCommunicationLogRepository, ParentDetailChangeRepository
} = require('../data/featureRepositories');

const router = express.Router();

function schoolId(user) {
  if (user.Role === 'admin') return user.SchoolID;
  if (!user.SchoolID) throw new Error('School users must be linked to a school');
  return user.SchoolID;
}

// --- Behaviour Logs ---
const behaviourRepo = new BehaviourLogRepository();
router.get('/behaviour/:studentId', authenticateToken, requireSchoolPermission('school.students.view', 'school.students.manage'), async (req, res) => {
  try { res.json(await behaviourRepo.getByStudent(parseInt(req.params.studentId, 10), schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/behaviour', authenticateToken, requireSchoolPermission('school.students.manage'), audit('BehaviourLog', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await behaviourRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Academic Notes ---
const academicRepo = new AcademicNoteRepository();
router.get('/academic-notes/:studentId', authenticateToken, requireSchoolPermission('school.students.view', 'school.students.manage'), async (req, res) => {
  try { res.json(await academicRepo.getByStudent(parseInt(req.params.studentId, 10), schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/academic-notes', authenticateToken, requireSchoolPermission('school.students.manage'), audit('AcademicNote', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await academicRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Student Documents ---
const docRepo = new DocumentRepository();
router.get('/student-documents/:studentId', authenticateToken, requireSchoolPermission('documents.student.view', 'sensitive.student_documents.view'), async (req, res) => {
  try {
    auditLog.log({ userId: req.user.UserID, schoolId: schoolId(req.user), entityName: 'StudentDocument', entityId: req.params.studentId, action: 'View', ipAddress: req.ip });
    res.json(await docRepo.getStudentDocuments(parseInt(req.params.studentId, 10), schoolId(req.user)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/student-documents', authenticateToken, requireSchoolPermission('documents.student.upload', 'sensitive.student_documents.upload'), audit('StudentDocument', 'Upload'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), uploadedBy: req.user.UserID };
    res.status(201).json(await docRepo.createStudentDocument(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Staff Documents ---
router.get('/staff-documents/:employeeId', authenticateToken, requireSchoolPermission('documents.staff.view', 'sensitive.staff_documents.view'), async (req, res) => {
  try {
    auditLog.log({ userId: req.user.UserID, schoolId: schoolId(req.user), entityName: 'StaffDocument', entityId: req.params.employeeId, action: 'View', ipAddress: req.ip });
    res.json(await docRepo.getStaffDocuments(parseInt(req.params.employeeId, 10), schoolId(req.user)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/staff-documents', authenticateToken, requireSchoolPermission('documents.staff.upload', 'sensitive.staff_documents.upload'), audit('StaffDocument', 'Upload'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), uploadedBy: req.user.UserID };
    res.status(201).json(await docRepo.createStaffDocument(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Credit Notes ---
const creditNoteRepo = new CreditNoteRepository();
router.get('/credit-notes', authenticateToken, requireSchoolPermission('finance.credit_notes.create', 'finance.credit_notes.approve', 'finance.invoices.view'), async (req, res) => {
  try { res.json(await creditNoteRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/credit-notes', authenticateToken, requireSchoolPermission('finance.credit_notes.create'), audit('CreditNote', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID };
    res.status(201).json(await creditNoteRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Discounts / Bursaries ---
const discountRepo = new DiscountRepository();
router.get('/discounts', authenticateToken, requireSchoolPermission('finance.discounts.manage', 'finance.invoices.view'), async (req, res) => {
  try { res.json(await discountRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/discounts/student/:studentId', authenticateToken, requireSchoolPermission('finance.discounts.manage', 'finance.invoices.view'), async (req, res) => {
  try { res.json(await discountRepo.getActiveByStudent(parseInt(req.params.studentId, 10), schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/discounts', authenticateToken, requireSchoolPermission('finance.discounts.manage'), audit('Discount', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user) };
    res.status(201).json(await discountRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Promise to Pay ---
const promiseRepo = new PromiseToPayRepository();
router.get('/promise-to-pay', authenticateToken, requireSchoolPermission('finance.outstanding_fees.view', 'finance.payments.view'), async (req, res) => {
  try { res.json(await promiseRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/promise-to-pay', authenticateToken, requireSchoolPermission('finance.payments.allocate'), audit('PromiseToPay', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await promiseRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/promise-to-pay/:id/status', authenticateToken, requireSchoolPermission('finance.payments.allocate'), audit('PromiseToPay', 'UpdateStatus'), async (req, res) => {
  try {
    const result = await promiseRepo.updateStatus(parseInt(req.params.id, 10), schoolId(req.user), req.body.status);
    if (!result) return res.status(404).json({ error: 'Promise to pay not found for this school' });
    res.json(result);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Invoice Templates ---
const templateRepo = new InvoiceTemplateRepository();
router.get('/invoice-templates', authenticateToken, requireSchoolPermission('finance.invoices.view', 'finance.invoices.create'), async (req, res) => {
  try { res.json(await templateRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/invoice-templates', authenticateToken, requireSchoolPermission('finance.invoices.create'), audit('InvoiceTemplate', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user) };
    res.status(201).json(await templateRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/invoice-templates/:id', authenticateToken, requireSchoolPermission('finance.invoices.edit'), audit('InvoiceTemplate', 'Update'), async (req, res) => {
  try {
    const result = await templateRepo.update(parseInt(req.params.id, 10), schoolId(req.user), req.body);
    if (!result) return res.status(404).json({ error: 'Invoice template not found for this school' });
    res.json(result);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Communication History ---
const commHistoryRepo = new CommunicationHistoryRepository();
router.get('/communication-history', authenticateToken, requireSchoolPermission('communication.history.view', 'reports.view'), async (req, res) => {
  try { res.json(await commHistoryRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/communication-history', authenticateToken, requireSchoolPermission('communication.history.resend'), audit('CommunicationHistory', 'Create'), async (req, res) => {
  try {
    if (!req.body.communicationType) return res.status(400).json({ error: 'Communication type is required' });
    const data = { ...req.body, schoolId: schoolId(req.user) };
    res.status(201).json(await commHistoryRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Parent Communication Log ---
const parentCommRepo = new ParentCommunicationLogRepository();
router.get('/parent-communication', authenticateToken, requireSchoolPermission('communication.history.view'), async (req, res) => {
  try { res.json(await parentCommRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/parent-communication', authenticateToken, requireSchoolPermission('communication.history.resend'), audit('ParentCommunication', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await parentCommRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Parent Detail Changes ---
const parentChangeRepo = new ParentDetailChangeRepository();
router.get('/parent-detail-changes', authenticateToken, requireSchoolPermission('school.parent_updates.view', 'school.parent_updates.approve', 'school.parent_updates.reject'), async (req, res) => {
  try { res.json(await parentChangeRepo.getPendingBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/parent-detail-changes/:id/review', authenticateToken, requireSchoolPermission('school.parent_updates.approve', 'school.parent_updates.reject'), audit('ParentDetailChange', 'Review'), async (req, res) => {
  try {
    const result = await parentChangeRepo.review(parseInt(req.params.id, 10), schoolId(req.user), req.body.status, req.user.UserID);
    if (!result) return res.status(404).json({ error: 'Parent detail change not found for this school' });
    res.json(result);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
