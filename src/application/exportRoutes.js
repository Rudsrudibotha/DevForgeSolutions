// Application Layer - Data export routes

const express = require('express');
const ExportService = require('../business/exportService');
const InvoiceService = require('../business/invoiceService');
const TransactionService = require('../business/transactionService');
const StudentService = require('../business/studentService');
const EmployeeService = require('../business/employeeService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const exportService = new ExportService();
const invoiceService = new InvoiceService();
const transactionService = new TransactionService();
const studentService = new StudentService();
const employeeService = new EmployeeService();

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

module.exports = router;
