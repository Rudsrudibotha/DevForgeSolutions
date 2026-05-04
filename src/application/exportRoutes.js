// Application Layer - Data export routes

const express = require('express');
const ExportService = require('../business/exportService');
const InvoiceService = require('../business/invoiceService');
const TransactionService = require('../business/transactionService');
const StudentService = require('../business/studentService');
const EmployeeService = require('../business/employeeService');
const InvoiceRepository = require('../data/invoiceRepository');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const exportService = new ExportService();
const invoiceService = new InvoiceService();
const transactionService = new TransactionService();
const studentService = new StudentService();
const employeeService = new EmployeeService();
const invoiceRepository = new InvoiceRepository();

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get('/invoices', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const invoices = await invoiceService.getAllInvoices(req.user, { limit: 10000 });
    sendCsv(res, 'invoices.csv', exportService.toCsv(invoices, exportService.invoiceColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const transactions = await transactionService.getTransactions(req.user, { limit: 10000 });
    sendCsv(res, 'transactions.csv', exportService.toCsv(transactions, exportService.transactionColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/students', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const students = await studentService.getStudents('all', req.user);
    sendCsv(res, 'students.csv', exportService.toCsv(students, exportService.studentColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/employees', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const employees = await employeeService.getEmployees(req.user);
    sendCsv(res, 'employees.csv', exportService.toCsv(employees, exportService.employeeColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/outstanding-fees', authenticateToken, requireSchoolOrAdmin, audit('OutstandingFees', 'Export'), async (req, res) => {
  try {
    if (!req.user.SchoolID && req.user.Role !== 'admin') {
      return res.status(403).json({ error: 'School context required for outstanding fees export' });
    }

    const schoolId = req.user.SchoolID;
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const rows = await invoiceRepository.getOutstandingFeesExport(schoolId, year);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No outstanding fees found for the selected filters' });
    }

    const exportDate = new Date().toISOString().slice(0, 10);
    const enriched = rows.map((row) => ({ ...row, ExportDate: exportDate }));

    const filename = `outstanding-fees-${schoolId}-${year}-${exportDate}.csv`;
    sendCsv(res, filename, exportService.toCsv(enriched, exportService.outstandingFeesColumns()));
  } catch (error) {
    res.status(500).json({ error: 'Export failed: ' + error.message });
  }
});

module.exports = router;
