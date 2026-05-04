// Application Layer - Admissions, Consent, Adjustments, Refunds, Registration Fees routes

const express = require('express');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const {
  AdmissionsRepository, ConsentRepository, FinancialAdjustmentRepository,
  RefundRepository, RegistrationFeeRepository
} = require('../data/admissionsFinanceRepositories');

const router = express.Router();

function schoolId(user) {
  if (user.Role === 'admin') return user.SchoolID;
  if (!user.SchoolID) throw new Error('School users must be linked to a school');
  return user.SchoolID;
}

// --- Admissions ---
const admissionsRepo = new AdmissionsRepository();

router.get('/admissions', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await admissionsRepo.getBySchool(schoolId(req.user), req.query.status || null)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admissions/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const admission = await admissionsRepo.getById(parseInt(req.params.id, 10));
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/admissions', authenticateToken, requireSchoolOrAdmin, audit('Admission', 'Create'), async (req, res) => {
  try {
    if (!req.body.firstName || !req.body.lastName) return res.status(400).json({ error: 'First name and last name are required' });
    res.status(201).json(await admissionsRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/admissions/:id/status', authenticateToken, requireSchoolOrAdmin, audit('Admission', 'UpdateStatus'), async (req, res) => {
  try {
    const { status, enrolledDate, convertedStudentId } = req.body;
    const valid = ['New', 'In Review', 'Accepted', 'Waitlisted', 'Refused', 'Enrolled'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    res.json(await admissionsRepo.updateStatus(parseInt(req.params.id, 10), status, enrolledDate, convertedStudentId));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Consent ---
const consentRepo = new ConsentRepository();

router.get('/consent', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await consentRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/consent/student/:studentId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await consentRepo.getByStudent(parseInt(req.params.studentId, 10))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/consent/missing', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await consentRepo.getMissing(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/consent/parent', authenticateToken, async (req, res) => {
  try {
    if (req.user.Role !== 'parent') return res.status(403).json({ error: 'Parent access required' });
    res.json(await consentRepo.getByParent(req.user.UserID));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/consent', authenticateToken, requireSchoolOrAdmin, audit('Consent', 'Create'), async (req, res) => {
  try {
    if (!req.body.studentId || !req.body.consentType) return res.status(400).json({ error: 'Student and consent type are required' });
    res.status(201).json(await consentRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/consent/:id/respond', authenticateToken, audit('Consent', 'Respond'), async (req, res) => {
  try {
    const { response } = req.body;
    if (!['Accepted', 'Declined'].includes(response)) return res.status(400).json({ error: 'Response must be Accepted or Declined' });
    res.json(await consentRepo.respond(parseInt(req.params.id, 10), response, req.user.UserID));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Financial Adjustments ---
const adjustmentRepo = new FinancialAdjustmentRepository();

router.get('/adjustments', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await adjustmentRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/adjustments', authenticateToken, requireSchoolOrAdmin, audit('FinancialAdjustment', 'Create'), async (req, res) => {
  try {
    const valid = ['Write-off', 'Reversal', 'Credit Correction', 'Debit Correction', 'Fee Correction'];
    if (!valid.includes(req.body.adjustmentType)) return res.status(400).json({ error: `Type must be one of: ${valid.join(', ')}` });
    if (!req.body.reason) return res.status(400).json({ error: 'Reason is required' });
    if (!req.body.amount || Number(req.body.amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    res.status(201).json(await adjustmentRepo.create({ ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Refunds ---
const refundRepo = new RefundRepository();

router.get('/refunds', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await refundRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/refunds', authenticateToken, requireSchoolOrAdmin, audit('Refund', 'Create'), async (req, res) => {
  try {
    if (!req.body.familyId) return res.status(400).json({ error: 'Family is required' });
    if (!req.body.reason) return res.status(400).json({ error: 'Reason is required' });
    if (!req.body.amount || Number(req.body.amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    res.status(201).json(await refundRepo.create({ ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/refunds/:id/approve', authenticateToken, requireSchoolOrAdmin, audit('Refund', 'Approve'), async (req, res) => {
  try {
    const result = await refundRepo.approve(parseInt(req.params.id, 10), req.user.UserID);
    if (!result) return res.status(400).json({ error: 'Refund not found or not pending' });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/refunds/:id/complete', authenticateToken, requireSchoolOrAdmin, audit('Refund', 'Complete'), async (req, res) => {
  try {
    const result = await refundRepo.complete(parseInt(req.params.id, 10));
    if (!result) return res.status(400).json({ error: 'Refund not found or not approved' });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Registration / Deposit Fees ---
const regFeeRepo = new RegistrationFeeRepository();

router.get('/registration-fees', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await regFeeRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/registration-fees', authenticateToken, requireSchoolOrAdmin, audit('RegistrationFee', 'Create'), async (req, res) => {
  try {
    if (!req.body.feeType) return res.status(400).json({ error: 'Fee type is required' });
    if (!req.body.amount || Number(req.body.amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    res.status(201).json(await regFeeRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/registration-fees/:id/pay', authenticateToken, requireSchoolOrAdmin, audit('RegistrationFee', 'MarkPaid'), async (req, res) => {
  try { res.json(await regFeeRepo.markPaid(parseInt(req.params.id, 10))); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
