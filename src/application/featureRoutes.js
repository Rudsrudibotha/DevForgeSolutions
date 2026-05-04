// Application Layer - Feature routes
// Covers: behaviour logs, academic notes, documents, credit notes, discounts,
// promise-to-pay, invoice templates, communication history, parent communication, parent detail changes

const express = require('express');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
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
router.get('/behaviour/:studentId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await behaviourRepo.getByStudent(parseInt(req.params.studentId, 10))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/behaviour', authenticateToken, requireSchoolOrAdmin, audit('BehaviourLog', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await behaviourRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Academic Notes ---
const academicRepo = new AcademicNoteRepository();
router.get('/academic-notes/:studentId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await academicRepo.getByStudent(parseInt(req.params.studentId, 10))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/academic-notes', authenticateToken, requireSchoolOrAdmin, audit('AcademicNote', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await academicRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Student Documents ---
const docRepo = new DocumentRepository();
router.get('/student-documents/:studentId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    auditLog.log({ userId: req.user.UserID, schoolId: schoolId(req.user), entityName: 'StudentDocument', entityId: req.params.studentId, action: 'View', ipAddress: req.ip });
    res.json(await docRepo.getStudentDocuments(parseInt(req.params.studentId, 10)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/student-documents', authenticateToken, requireSchoolOrAdmin, audit('StudentDocument', 'Upload'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), uploadedBy: req.user.UserID };
    res.status(201).json(await docRepo.createStudentDocument(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Staff Documents ---
router.get('/staff-documents/:employeeId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    auditLog.log({ userId: req.user.UserID, schoolId: schoolId(req.user), entityName: 'StaffDocument', entityId: req.params.employeeId, action: 'View', ipAddress: req.ip });
    res.json(await docRepo.getStaffDocuments(parseInt(req.params.employeeId, 10)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/staff-documents', authenticateToken, requireSchoolOrAdmin, audit('StaffDocument', 'Upload'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), uploadedBy: req.user.UserID };
    res.status(201).json(await docRepo.createStaffDocument(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Credit Notes ---
const creditNoteRepo = new CreditNoteRepository();
router.get('/credit-notes', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await creditNoteRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/credit-notes', authenticateToken, requireSchoolOrAdmin, audit('CreditNote', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID };
    res.status(201).json(await creditNoteRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Discounts / Bursaries ---
const discountRepo = new DiscountRepository();
router.get('/discounts', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await discountRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/discounts/student/:studentId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await discountRepo.getActiveByStudent(parseInt(req.params.studentId, 10))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/discounts', authenticateToken, requireSchoolOrAdmin, audit('Discount', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user) };
    res.status(201).json(await discountRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Promise to Pay ---
const promiseRepo = new PromiseToPayRepository();
router.get('/promise-to-pay', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await promiseRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/promise-to-pay', authenticateToken, requireSchoolOrAdmin, audit('PromiseToPay', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await promiseRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/promise-to-pay/:id/status', authenticateToken, requireSchoolOrAdmin, audit('PromiseToPay', 'UpdateStatus'), async (req, res) => {
  try { res.json(await promiseRepo.updateStatus(parseInt(req.params.id, 10), req.body.status)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Invoice Templates ---
const templateRepo = new InvoiceTemplateRepository();
router.get('/invoice-templates', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await templateRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/invoice-templates', authenticateToken, requireSchoolOrAdmin, audit('InvoiceTemplate', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user) };
    res.status(201).json(await templateRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/invoice-templates/:id', authenticateToken, requireSchoolOrAdmin, audit('InvoiceTemplate', 'Update'), async (req, res) => {
  try { res.json(await templateRepo.update(parseInt(req.params.id, 10), req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Communication History ---
const commHistoryRepo = new CommunicationHistoryRepository();
router.get('/communication-history', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await commHistoryRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Parent Communication Log ---
const parentCommRepo = new ParentCommunicationLogRepository();
router.get('/parent-communication', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await parentCommRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/parent-communication', authenticateToken, requireSchoolOrAdmin, audit('ParentCommunication', 'Create'), async (req, res) => {
  try {
    const data = { ...req.body, schoolId: schoolId(req.user), recordedBy: req.user.UserID };
    res.status(201).json(await parentCommRepo.create(data));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Parent Detail Changes ---
const parentChangeRepo = new ParentDetailChangeRepository();
router.get('/parent-detail-changes', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await parentChangeRepo.getPendingBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/parent-detail-changes/:id/review', authenticateToken, requireSchoolOrAdmin, audit('ParentDetailChange', 'Review'), async (req, res) => {
  try { res.json(await parentChangeRepo.review(parseInt(req.params.id, 10), req.body.status, req.user.UserID)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
