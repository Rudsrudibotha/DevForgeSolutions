// Application Layer - Transaction routes

const express = require('express');
const TransactionService = require('../business/transactionService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const transactionService = new TransactionService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
      search: req.query.search || null,
      status: req.query.status || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      transactionType: req.query.transactionType || null
    };
    const transactions = await transactionService.getTransactions(req.user, options);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const summary = await transactionService.getSummary(req.user);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
