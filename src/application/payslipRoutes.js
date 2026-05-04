// Application Layer - Payslip routes
// All view, create, finalize, and download actions are audit-logged.

const express = require('express');
const PayslipService = require('../business/payslipService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const payslipService = new PayslipService();

// Get all payslips for the school (requires HR permission)
router.get('/', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'ListAll'), async (req, res) => {
  try {
    const payslips = await payslipService.getPayslips(req.user);
    res.json(payslips);
  } catch (error) {
    const status = error.message.includes('HR permission') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Get previous (finalized) payslips (requires HR permission)
router.get('/previous', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'ListPrevious'), async (req, res) => {
  try {
    const payslips = await payslipService.getPreviousPayslips(req.user);
    res.json(payslips);
  } catch (error) {
    const status = error.message.includes('HR permission') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Get my own payslips (staff self-service, school must allow it)
router.get('/mine', authenticateToken, audit('Payslip', 'ViewOwn'), async (req, res) => {
  try {
    const payslips = await payslipService.getMyPayslips(req.user);
    res.json(payslips);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// View a single payslip (audit-logged)
router.get('/:id', authenticateToken, audit('Payslip', 'ViewSingle'), async (req, res) => {
  try {
    const payslip = await payslipService.getPayslipById(parseInt(req.params.id, 10), req.user);
    res.json(payslip);
  } catch (error) {
    const status = error.message.includes('HR permission') || error.message.includes('not enabled') ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
});

// Create a payslip (requires HR permission)
router.post('/', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'Create'), async (req, res) => {
  try {
    const payslip = await payslipService.createPayslip(req.body, req.user);
    res.status(201).json(payslip);
  } catch (error) {
    const status = error.message.includes('HR permission') ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Finalize a payslip (makes it read-only, requires HR permission)
router.put('/:id/finalize', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'Finalize'), async (req, res) => {
  try {
    const payslip = await payslipService.finalizePayslip(parseInt(req.params.id, 10), req.user);
    res.json(payslip);
  } catch (error) {
    const status = error.message.includes('HR permission') ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
