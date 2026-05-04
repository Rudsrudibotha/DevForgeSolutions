// Application Layer - Payslip routes
// All view, create, update, finalize, and download actions are audit-logged.

const express = require('express');
const PayslipService = require('../business/payslipService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const payslipService = new PayslipService();

router.get('/', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'ListAll'), async (req, res) => {
  try {
    const options = {
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId, 10) : null,
      payPeriod: req.query.payPeriod || null,
      status: req.query.status || null
    };
    const payslips = await payslipService.getPayslips(req.user, options);
    res.json(payslips);
  } catch (error) {
    res.status(error.message.includes('HR permission') ? 403 : 500).json({ error: error.message });
  }
});

router.get('/previous', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'ListPrevious'), async (req, res) => {
  try {
    const payslips = await payslipService.getPreviousPayslips(req.user);
    res.json(payslips);
  } catch (error) {
    res.status(error.message.includes('HR permission') ? 403 : 500).json({ error: error.message });
  }
});

router.get('/mine', authenticateToken, audit('Payslip', 'ViewOwn'), async (req, res) => {
  try {
    const payslips = await payslipService.getMyPayslips(req.user);
    res.json(payslips);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, audit('Payslip', 'ViewSingle'), async (req, res) => {
  try {
    const payslip = await payslipService.getPayslipById(parseInt(req.params.id, 10), req.user);
    res.json(payslip);
  } catch (error) {
    const status = error.message.includes('HR permission') || error.message.includes('not enabled') ? 403 : 404;
    res.status(status).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'Create'), async (req, res) => {
  try {
    const payslip = await payslipService.createPayslip(req.body, req.user);
    res.status(201).json(payslip);
  } catch (error) {
    res.status(error.message.includes('HR permission') ? 403 : 400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'Edit'), async (req, res) => {
  try {
    const payslip = await payslipService.updatePayslip(parseInt(req.params.id, 10), req.body, req.user);
    if (!payslip) return res.status(400).json({ error: 'Payslip could not be updated. It may already be finalized.' });
    res.json(payslip);
  } catch (error) {
    res.status(error.message.includes('HR permission') ? 403 : 400).json({ error: error.message });
  }
});

router.put('/:id/finalize', authenticateToken, requireSchoolOrAdmin, audit('Payslip', 'Finalize'), async (req, res) => {
  try {
    const payslip = await payslipService.finalizePayslip(parseInt(req.params.id, 10), req.user);
    res.json(payslip);
  } catch (error) {
    res.status(error.message.includes('HR permission') ? 403 : 400).json({ error: error.message });
  }
});

module.exports = router;
