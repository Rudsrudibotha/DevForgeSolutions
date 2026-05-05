// Application Layer - Invoice routes

const express = require('express');
const InvoiceService = require('../business/invoiceService');
const InvoiceRepository = require('../data/invoiceRepository');
const { authenticateToken, requireAdmin, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const invoiceService = new InvoiceService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
      status: req.query.status || null,
      search: req.query.search || null,
      studentId: req.query.studentId ? parseInt(req.query.studentId, 10) : null,
      className: req.query.className || null,
      month: req.query.month ? parseInt(req.query.month, 10) : null,
      year: req.query.year ? parseInt(req.query.year, 10) : null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null
    };
    const invoices = await invoiceService.getAllInvoices(req.user, options);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/school/:schoolId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const invoices = await invoiceService.getInvoicesBySchool(parseInt(req.params.schoolId, 10), req.user);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Outstanding fees view data. Keep this before the numeric invoice ID route.
router.get('/outstanding-fees', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const schoolId = req.user.SchoolID;
    if (!schoolId && req.user.Role !== 'admin') {
      return res.status(403).json({ error: 'School context required' });
    }
    let year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const invoiceRepository = new InvoiceRepository();
    let rows = await invoiceRepository.getOutstandingFeesExport(schoolId, year);
    // If current year has no data, try the most recent year that does.
    if ((!rows || rows.length === 0) && !req.query.year) {
      const { getPool, sql: mssql } = require('../data/db');
      const pool = await getPool();
      const latestYear = await pool.request().input('schoolId', mssql.Int, schoolId)
        .query("SELECT TOP 1 YEAR(IssueDate) AS yr FROM Invoices WHERE SchoolID=@schoolId AND IsDeleted=0 AND Status<>'Paid' ORDER BY IssueDate DESC");
      if (latestYear.recordset[0]) {
        year = latestYear.recordset[0].yr;
        rows = await invoiceRepository.getOutstandingFeesExport(schoolId, year);
      }
    }
    res.json({ year, data: rows || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id(\\d+)', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(parseInt(req.params.id, 10), req.user);
    res.json(invoice);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, audit('Invoice', 'Create'), async (req, res) => {
  try {
    const newInvoice = await invoiceService.createInvoice(req.body, req.user);
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id(\\d+)', authenticateToken, requireSchoolOrAdmin, audit('Invoice', 'Update'), async (req, res) => {
  try {
    const updatedInvoice = await invoiceService.updateInvoice(parseInt(req.params.id, 10), req.body, req.user);
    res.json(updatedInvoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id(\\d+)', authenticateToken, requireSchoolOrAdmin, audit('Invoice', 'Delete'), async (req, res) => {
  try {
    const result = await invoiceService.deleteInvoice(parseInt(req.params.id, 10), req.user);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.put('/:id/pay', authenticateToken, requireSchoolOrAdmin, audit('Invoice', 'MarkPaid'), async (req, res) => {
  try {
    const result = await invoiceService.markAsPaid(parseInt(req.params.id, 10), req.user);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Partial payment
router.post('/:id/payment', authenticateToken, requireSchoolOrAdmin, audit('Invoice', 'PartialPayment'), async (req, res) => {
  try {
    const result = await invoiceService.recordPartialPayment(
      parseInt(req.params.id, 10),
      Number(req.body.amount),
      req.user
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Flag overdue invoices (admin or scheduled job)
router.post('/flag-overdue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const count = await invoiceService.flagOverdueInvoices();
    res.json({ message: `${count} invoices flagged as overdue` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-monthly', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const result = await invoiceService.generateMonthlyInvoices(req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
