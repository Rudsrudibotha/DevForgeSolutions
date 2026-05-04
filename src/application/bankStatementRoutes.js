// Application Layer - Bank statement routes

const express = require('express');
const BankStatementService = require('../business/bankStatementService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const bankStatementService = new BankStatementService();

router.post('/upload', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
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
    const result = await bankStatementService.approveMatch(
      req.body.transactionId,
      req.body.invoiceId,
      req.user
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
