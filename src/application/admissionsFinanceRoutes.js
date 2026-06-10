// Application Layer - Admissions, Consent, Adjustments, Refunds, Registration Fees routes

const express = require('express');
const { authenticateToken, requireParent, requireSchoolPermission } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const {
  AdmissionsRepository, ConsentRepository, FinancialAdjustmentRepository,
  RefundRepository, RegistrationFeeRepository
} = require('../data/admissionsFinanceRepositories');
const FinancePeriodLockRepository = require('../data/financePeriodLockRepository');

const router = express.Router();
const financePeriodLockRepo = new FinancePeriodLockRepository();

function schoolId(user) {
  if (user.Role === 'admin') return user.SchoolID;
  if (!user.SchoolID) throw new Error('School users must be linked to a school');
  return user.SchoolID;
}

function financePeriodFromBody(body) {
  const lockType = ['Month', 'Year', 'Custom'].includes(body.lockType) ? body.lockType : 'Month';
  const year = Number(body.year || body.financialYear || new Date().getFullYear());
  const month = Number(body.month || 0);

  if (lockType === 'Year') {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Year must be between 2000 and 2100');
    }
    return { lockType, periodStart: `${year}-01-01`, periodEnd: `${year}-12-31` };
  }

  if (lockType === 'Custom') {
    const periodStart = String(body.periodStart || '').slice(0, 10);
    const periodEnd = String(body.periodEnd || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
      throw new Error('Custom period start and end dates are required');
    }
    if (periodStart > periodEnd) {
      throw new Error('Period start cannot be after period end');
    }
    return { lockType, periodStart, periodEnd };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Month locks require a valid month and year');
  }
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    lockType,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10)
  };
}

// --- Finance Period Locks ---
router.get('/finance-period-locks', authenticateToken, requireSchoolPermission('finance.period_lock.manage', 'finance.year_end_close', 'finance.year_end_reopen', 'reports.year_end.view'), async (req, res) => {
  try { res.json(await financePeriodLockRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/finance-period-locks', authenticateToken, requireSchoolPermission('finance.period_lock.manage', 'finance.year_end_close'), audit('FinancePeriodLock', 'Create'), async (req, res) => {
  try {
    if (!req.body.reason) return res.status(400).json({ error: 'Reason is required when locking a finance period' });
    const period = financePeriodFromBody(req.body);
    res.status(201).json(await financePeriodLockRepo.create({
      schoolId: schoolId(req.user),
      ...period,
      reason: String(req.body.reason).trim().slice(0, 500),
      lockedBy: req.user.UserID
    }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/finance-period-locks/:id/reopen', authenticateToken, requireSchoolPermission('finance.period_lock.manage', 'finance.year_end_reopen'), audit('FinancePeriodLock', 'Reopen'), async (req, res) => {
  try {
    if (!req.body.reason) return res.status(400).json({ error: 'Reason is required when reopening a locked finance period' });
    const result = await financePeriodLockRepo.reopen(parseInt(req.params.id, 10), schoolId(req.user), String(req.body.reason).trim().slice(0, 500), req.user.UserID);
    if (!result) return res.status(404).json({ error: 'Locked finance period not found for this school' });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Admissions ---
const admissionsRepo = new AdmissionsRepository();

router.get('/admissions', authenticateToken, requireSchoolPermission('admissions.view', 'admissions.review'), async (req, res) => {
  try { res.json(await admissionsRepo.getBySchool(schoolId(req.user), req.query.status || null)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admissions/:id', authenticateToken, requireSchoolPermission('admissions.view', 'admissions.review'), async (req, res) => {
  try {
    const admission = await admissionsRepo.getById(parseInt(req.params.id, 10), schoolId(req.user));
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/admissions', authenticateToken, requireSchoolPermission('admissions.review'), audit('Admission', 'Create'), async (req, res) => {
  try {
    if (!req.body.firstName || !req.body.lastName) return res.status(400).json({ error: 'First name and last name are required' });
    res.status(201).json(await admissionsRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/admissions/:id/status', authenticateToken, requireSchoolPermission('admissions.review', 'admissions.accept', 'admissions.waitlist', 'admissions.refuse'), audit('Admission', 'UpdateStatus'), async (req, res) => {
  try {
    const { status, enrolledDate, convertedStudentId } = req.body;
    const valid = ['New', 'In Review', 'Accepted', 'Waitlisted', 'Refused', 'Enrolled'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    const updated = await admissionsRepo.updateStatus(parseInt(req.params.id, 10), schoolId(req.user), status, enrolledDate, convertedStudentId);
    if (!updated) return res.status(404).json({ error: 'Admission not found for this school' });
    res.json(updated);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Consent ---
const consentRepo = new ConsentRepository();

router.get('/consent', authenticateToken, requireSchoolPermission('school.consent.view', 'school.consent.manage'), async (req, res) => {
  try { res.json(await consentRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/consent/student/:studentId', authenticateToken, requireSchoolPermission('school.consent.view', 'school.consent.manage'), async (req, res) => {
  try { res.json(await consentRepo.getByStudent(parseInt(req.params.studentId, 10), schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/consent/missing', authenticateToken, requireSchoolPermission('school.consent.view', 'school.consent.manage'), async (req, res) => {
  try { res.json(await consentRepo.getMissing(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/consent/parent', authenticateToken, requireParent, async (req, res) => {
  try {
    res.json(await consentRepo.getByParent(req.user.UserID));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/consent', authenticateToken, requireSchoolPermission('school.consent.manage'), audit('Consent', 'Create'), async (req, res) => {
  try {
    if (!req.body.consentType) return res.status(400).json({ error: 'Consent type is required' });
    if (!req.body.title) return res.status(400).json({ error: 'Permission slip title is required' });
    res.status(201).json(await consentRepo.create({ ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/consent/:id/respond', authenticateToken, requireParent, audit('Consent', 'Respond'), async (req, res) => {
  try {
    const { response, signatureName, signatureRelationship, responseNotes } = req.body;
    if (!['Accepted', 'Declined'].includes(response)) return res.status(400).json({ error: 'Response must be Accepted or Declined' });
    if (!signatureName) return res.status(400).json({ error: 'Parent or guardian signature name is required' });
    const result = await consentRepo.respond(parseInt(req.params.id, 10), {
      response,
      signatureName,
      signatureRelationship,
      responseNotes,
      parentUserId: req.user.UserID
    });
    if (!result) return res.status(404).json({ error: 'Consent request not found for this parent account' });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Financial Adjustments ---
const adjustmentRepo = new FinancialAdjustmentRepository();

router.get('/adjustments', authenticateToken, requireSchoolPermission('finance.adjustments.create', 'finance.invoices.view'), async (req, res) => {
  try { res.json(await adjustmentRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/adjustments', authenticateToken, requireSchoolPermission('finance.adjustments.create'), audit('FinancialAdjustment', 'Create'), async (req, res) => {
  try {
    await financePeriodLockRepo.assertOpenForDate(schoolId(req.user), new Date(), 'Creating a financial adjustment');
    const valid = ['Write-off', 'Reversal', 'Credit Correction', 'Debit Correction', 'Fee Correction'];
    if (!valid.includes(req.body.adjustmentType)) return res.status(400).json({ error: `Type must be one of: ${valid.join(', ')}` });
    if (!req.body.reason) return res.status(400).json({ error: 'Reason is required' });
    if (!req.body.amount || Number(req.body.amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    res.status(201).json(await adjustmentRepo.create({ ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Refunds ---
const refundRepo = new RefundRepository();

router.get('/refunds', authenticateToken, requireSchoolPermission('finance.refunds.create', 'finance.refunds.approve', 'finance.refunds.complete'), async (req, res) => {
  try { res.json(await refundRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/refunds', authenticateToken, requireSchoolPermission('finance.refunds.create'), audit('Refund', 'Create'), async (req, res) => {
  try {
    await financePeriodLockRepo.assertOpenForDate(schoolId(req.user), new Date(), 'Creating a refund');
    if (!req.body.familyId) return res.status(400).json({ error: 'Family is required' });
    if (!req.body.reason) return res.status(400).json({ error: 'Reason is required' });
    if (!req.body.amount || Number(req.body.amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    res.status(201).json(await refundRepo.create({ ...req.body, schoolId: schoolId(req.user), createdBy: req.user.UserID }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/refunds/:id/approve', authenticateToken, requireSchoolPermission('finance.refunds.approve'), audit('Refund', 'Approve'), async (req, res) => {
  try {
    await financePeriodLockRepo.assertOpenForDate(schoolId(req.user), new Date(), 'Approving a refund');
    const result = await refundRepo.approve(parseInt(req.params.id, 10), schoolId(req.user), req.user.UserID);
    if (!result) return res.status(400).json({ error: 'Refund not found or not pending' });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/refunds/:id/complete', authenticateToken, requireSchoolPermission('finance.refunds.complete'), audit('Refund', 'Complete'), async (req, res) => {
  try {
    await financePeriodLockRepo.assertOpenForDate(schoolId(req.user), new Date(), 'Completing a refund');
    const result = await refundRepo.complete(parseInt(req.params.id, 10), schoolId(req.user));
    if (!result || !result.ok) {
      if (result && result.error === 'refund-exceeds-available-balance') {
        return res.status(409).json({
          error: 'refund-exceeds-available-balance',
          availableBalance: result.availableBalance,
          requestedAmount: result.requestedAmount,
          message: 'This refund is larger than the family\'s available balance. The school cannot refund more than the family has ever paid.'
        });
      }
      if (result && result.error === 'refund-not-approved') {
        return res.status(400).json({ error: 'Refund must be approved before it can be completed.' });
      }
      if (result && result.error === 'already-completed') {
        return res.status(400).json({ error: 'Refund is already completed.' });
      }
      if (result && result.error === 'refund-not-found') {
        return res.status(404).json({ error: 'Refund not found.' });
      }
      return res.status(400).json({ error: (result && result.error) || 'Refund could not be completed' });
    }
    res.json(result.refund);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- Registration / Deposit Fees ---
const regFeeRepo = new RegistrationFeeRepository();

router.get('/registration-fees', authenticateToken, requireSchoolPermission('finance.registration_fees.view', 'finance.registration_fees.manage'), async (req, res) => {
  try { res.json(await regFeeRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/registration-fees', authenticateToken, requireSchoolPermission('finance.registration_fees.manage'), audit('RegistrationFee', 'Create'), async (req, res) => {
  try {
    await financePeriodLockRepo.assertOpenForDate(schoolId(req.user), new Date(), 'Creating a registration fee');
    if (!req.body.feeType) return res.status(400).json({ error: 'Fee type is required' });
    if (!req.body.amount || Number(req.body.amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    res.status(201).json(await regFeeRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/registration-fees/:id/pay', authenticateToken, requireSchoolPermission('finance.registration_fees.mark_paid', 'finance.registration_fees.manage'), audit('RegistrationFee', 'MarkPaid'), async (req, res) => {
  try {
    await financePeriodLockRepo.assertOpenForDate(schoolId(req.user), new Date(), 'Marking a registration fee as paid');
    const result = await regFeeRepo.markPaid(parseInt(req.params.id, 10), schoolId(req.user));
    if (!result) return res.status(404).json({ error: 'Registration fee not found for this school' });
    res.json(result);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
