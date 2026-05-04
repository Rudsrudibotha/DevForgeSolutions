// Application Layer - Parent portal routes

const express = require('express');
const ParentService = require('../business/parentService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const parentService = new ParentService();

// Get my children
router.get('/students', authenticateToken, async (req, res) => {
  try {
    const students = await parentService.getMyStudents(req.user);
    res.json(students);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

// Get my invoices across all children
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await parentService.getMyInvoices(req.user);
    res.json(invoices);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

// Get my balance summary
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await parentService.getMyBalance(req.user);
    res.json(balance);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

module.exports = router;
