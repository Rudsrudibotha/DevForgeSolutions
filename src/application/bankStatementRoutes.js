// Application Layer - Bank statement routes
// SECURITY (C1): every route that accepts schoolId from the URL must be
// clamped to the authenticated user's tenant. School staff may never pass
// another school's id to read cross-tenant data.

const express = require('express');
const BankStatementService = require('../business/bankStatementService');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { perSchoolRateLimit } = require('../middleware/perSchoolRateLimit');

const router = express.Router();
const bankStatementService = new BankStatementService();

// SECURITY: clamp any inbound schoolId to the caller's own school for
// non-admin roles. Admins can pass any schoolId.
function safeSchoolId(req, requestedSchoolId) {
  if (!req.user) return null;
  if (req.user.Role === 'admin') return Number(requestedSchoolId) || null;
  if (requestedSchoolId && Number(requestedSchoolId) !== Number(req.user.SchoolID)) {
    return null; // mismatch -> service will deny
  }
  return Number(req.user.SchoolID);
}

const schoolScoping = perSchoolRateLimit({ windowMs: 60_000, max: 600 });

router.use(authenticateToken);
router.use(schoolScoping);

router.post('/upload', requireSchoolPermission('finance.bank_reconciliation.correct', 'finance.payments.allocate'), audit('BankStatement', 'Upload'), async (req, res) => {
  try {
    req.body.schoolId = safeSchoolId(req, req.body.schoolId);
    const result = await bankStatementService.uploadStatement(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', requireSchoolPermission('finance.bank_reconciliation.view'), async (req, res) => {
  try {
    const statements = await bankStatementService.getStatements(req.user, {
      schoolId: safeSchoolId(req, req.query.schoolId),
      month: req.query.month || null,
      year: req.query.year || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null
    });
    res.json(statements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reconciliation', authenticateToken, requireSchoolPermission('finance.bank_reconciliation.view'), async (req, res) => {
  try {
    const reconciliation = await bankStatementService.getReconciliation(req.user, {
      month: req.query.month || null,
      year: req.query.year || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null
    });
    res.json(reconciliation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reconciliation/transactions', authenticateToken, requireSchoolPermission('finance.bank_reconciliation.view', 'finance.payments.view'), async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 100,
      status: req.query.status || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      month: req.query.month || null,
      year: req.query.year || null,
      search: req.query.search || null
    };
    const period = bankStatementService.resolvePeriodOptions(options);
    options.fromDate = period.fromDate || options.fromDate;
    options.toDate = period.toDate || options.toDate;
    const transactions = await bankStatementService.getReconciliationTransactions(req.user, options);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/allocation-search', authenticateToken, requireSchoolPermission('finance.payments.allocate'), async (req, res) => {
  try {
    const results = await bankStatementService.searchForAllocation(req.query.q, req.user);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/outstanding-invoices/:studentId', authenticateToken, requireSchoolPermission('finance.payments.allocate', 'finance.outstanding_fees.view'), async (req, res) => {
  try {
    const invoices = await bankStatementService.getOutstandingInvoicesForStudent(
      parseInt(req.params.studentId, 10), req.user
    );
    res.json(invoices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/match-suggestions', authenticateToken, requireSchoolPermission('finance.bank_reconciliation.view', 'finance.bank_reconciliation.approve_match'), async (req, res) => {
  try {
    const suggestions = await bankStatementService.getMatchSuggestions(req.user);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolPermission('finance.bank_reconciliation.view'), async (req, res) => {
  try {
    const detail = await bankStatementService.getStatementDetail(req.params.id, req.user);
    res.json(detail);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/matches/approve', authenticateToken, requireSchoolPermission('finance.bank_reconciliation.approve_match', 'finance.payments.allocate'), audit('ReconciliationMatch', 'Approve'), async (req, res) => {
  try {
    const result = await bankStatementService.approveMatch(req.body.transactionId, req.body.invoiceId, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/allocate/debtor', authenticateToken, requireSchoolPermission('finance.payments.allocate'), audit('Transaction', 'AllocateDebtor'), async (req, res) => {
  try {
    const result = await bankStatementService.allocateToDebtor(req.body.transactionId, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/allocate/creditor', authenticateToken, requireSchoolPermission('finance.payments.allocate'), audit('Transaction', 'AllocateCreditor'), async (req, res) => {
  try {
    const result = await bankStatementService.allocateToCreditor(req.body.transactionId, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reallocate', authenticateToken, requireSchoolPermission('finance.bank_reconciliation.correct', 'finance.payments.allocate'), audit('Transaction', 'Reallocate'), async (req, res) => {
  try {
    const result = await bankStatementService.reallocateTransaction(req.body.transactionId, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
