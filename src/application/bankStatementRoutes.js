// Application Layer - Bank statement routes

const express = require('express');
const BankStatementService = require('../business/bankStatementService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const bankStatementService = new BankStatementService();

router.post('/upload', authenticateToken, requireSchoolOrAdmin, audit('BankStatement', 'Upload'), async (req, res) => {
  try {
    const result = await bankStatementService.uploadStatement(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const statements = await bankStatementService.getStatements(req.user);
    res.json(statements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reconciliation', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const reconciliation = await bankStatementService.getReconciliation(req.user);
    res.json(reconciliation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reconciliation/transactions', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 100,
      status: req.query.status || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      search: req.query.search || null
    };
    const transactions = await bankStatementService.getReconciliationTransactions(req.user, options);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/allocation-search', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const results = await bankStatementService.searchForAllocation(req.query.q, req.user);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/outstanding-invoices/:studentId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const invoices = await bankStatementService.getOutstandingInvoicesForStudent(
      parseInt(req.params.studentId, 10), req.user
    );
    res.json(invoices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/match-suggestions', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const suggestions = await bankStatementService.getMatchSuggestions(req.user);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/matches/approve', authenticateToken, requireSchoolOrAdmin, audit('ReconciliationMatch', 'Approve'), async (req, res) => {
  try {
    const result = await bankStatementService.approveMatch(req.body.transactionId, req.body.invoiceId, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/allocate/debtor', authenticateToken, requireSchoolOrAdmin, audit('Transaction', 'AllocateDebtor'), async (req, res) => {
  try {
    const result = await bankStatementService.allocateToDebtor(req.body.transactionId, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/allocate/creditor', authenticateToken, requireSchoolOrAdmin, audit('Transaction', 'AllocateCreditor'), async (req, res) => {
  try {
    const result = await bankStatementService.allocateToCreditor(req.body.transactionId, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/unallocate', authenticateToken, requireSchoolOrAdmin, audit('Transaction', 'Unallocate'), async (req, res) => {
  try {
    const result = await bankStatementService.unallocateTransaction(req.body.transactionId, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
