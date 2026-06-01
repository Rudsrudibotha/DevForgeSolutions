// Application Layer - Data export routes

const express = require('express');
const ExportService = require('../business/exportService');
const InvoiceService = require('../business/invoiceService');
const TransactionService = require('../business/transactionService');
const StudentService = require('../business/studentService');
const EmployeeService = require('../business/employeeService');
const InvoiceRepository = require('../data/invoiceRepository');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');
const { audit, auditLog } = require('../middleware/audit');
const { hasSchoolPermission } = require('../security/schoolPermissions');

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

function sendExcel(res, filename, workbookXml) {
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(workbookXml);
}

function sendHtml(res, filename, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(html);
}

router.get('/invoices', authenticateToken, requireSchoolPermission('reports.export', 'reports.finance.export'), async (req, res) => {
  try {
    const invoices = await invoiceService.getAllInvoices(req.user, { limit: 10000 });
    sendCsv(res, 'invoices.csv', exportService.toCsv(invoices, exportService.invoiceColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', authenticateToken, requireSchoolPermission('reports.export', 'reports.finance.export'), async (req, res) => {
  try {
    const transactions = await transactionService.getTransactions(req.user, { limit: 10000 });
    sendCsv(res, 'transactions.csv', exportService.toCsv(transactions, exportService.transactionColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/students', authenticateToken, requireSchoolPermission('reports.export', 'reports.demographics.export'), async (req, res) => {
  try {
    const students = await studentService.getStudents('all', req.user);
    sendCsv(res, 'students.csv', exportService.toCsv(students, exportService.studentColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/employees', authenticateToken, requireSchoolPermission('reports.export', 'sensitive.staff_documents.view'), async (req, res) => {
  try {
    const employees = await employeeService.getEmployees(req.user);
    sendCsv(res, 'employees.csv', exportService.toCsv(employees, exportService.employeeColumns()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/outstanding-fees', authenticateToken, requireSchoolPermission('finance.outstanding_fees.view', 'reports.finance.export'), audit('OutstandingFees', 'Export'), async (req, res) => {
  try {
    if (req.user.Role !== 'admin' && (
      !hasSchoolPermission(req.user, ['finance.outstanding_fees.view'])
      || !hasSchoolPermission(req.user, ['reports.finance.export'])
    )) {
      return res.status(403).json({ error: 'Outstanding fees export requires finance view and finance export permission' });
    }

    const schoolId = req.user.Role === 'admin'
      ? Number(req.query.schoolId || req.user.SchoolID)
      : req.user.SchoolID;

    if (!schoolId) {
      return res.status(403).json({ error: 'School context required for outstanding fees export' });
    }

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const rows = await invoiceRepository.getOutstandingFeesExport(schoolId, year);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No outstanding fees found for the selected filters' });
    }

    const exportDate = new Date().toISOString().slice(0, 10);
    const enriched = rows.map((row) => ({ ...row, ExportDate: exportDate }));

    const filename = `outstanding-fees-${schoolId}-${year}-${exportDate}.xls`;
    await auditLog.log({ userId: req.user.UserID, schoolId, entityName: 'OutstandingFees', entityId: year, action: 'Export', after: { rowCount: rows.length, filename }, ipAddress: req.ip });
    sendExcel(res, filename, exportService.toExcelXml(enriched, exportService.outstandingFeesColumns(), {
      title: `Outstanding Fees ${year}`,
      subtitle: `${rows[0].SchoolName || 'School'} - generated ${exportDate}`,
      sheetName: 'Outstanding Fees',
      generatedAt: exportDate
    }));
  } catch (error) {
    res.status(500).json({ error: 'Export failed: ' + error.message });
  }
});

router.get('/student-statement/:studentId/excel', authenticateToken, requireSchoolPermission('finance.invoices.view', 'finance.payments.view', 'finance.outstanding_fees.view', 'reports.finance.export'), audit('StudentStatement', 'ExportExcel'), async (req, res) => {
  try {
    if (req.user.Role !== 'admin' && (
      !hasSchoolPermission(req.user, ['finance.invoices.view', 'finance.payments.view', 'finance.outstanding_fees.view'])
      || !hasSchoolPermission(req.user, ['reports.finance.export'])
    )) {
      return res.status(403).json({ error: 'Student account statement export requires finance view and finance export permission' });
    }

    const statement = await invoiceService.getStudentFinanceStatement(parseInt(req.params.studentId, 10), req.user);
    const rows = exportService.studentStatementRows(statement);
    const student = statement.student || {};
    const school = statement.school || {};
    const exportDate = new Date().toISOString().slice(0, 10);
    const studentName = `${student.FirstName || ''}-${student.LastName || ''}`.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `student-${student.StudentID}`;
    await auditLog.log({ userId: req.user.UserID, schoolId: student.SchoolID, entityName: 'StudentStatement', entityId: student.StudentID, action: 'ExportExcel', after: { studentId: student.StudentID }, ipAddress: req.ip });
    sendExcel(res, `student-statement-${studentName}-${exportDate}.xls`, exportService.toExcelXml(rows, exportService.studentStatementColumns(), {
      title: `${school.SchoolName || 'School'} - Parent Account Statement`,
      subtitle: [
        school.RegistrationNumber ? `Reg: ${school.RegistrationNumber}` : '',
        school.ContactPhone ? `Cell: ${school.ContactPhone}` : '',
        school.ContactEmail ? `Email: ${school.ContactEmail}` : '',
        `${student.FirstName || ''} ${student.LastName || ''}`.trim(),
        `Generated ${exportDate}`
      ].filter(Boolean).join(' | '),
      sheetName: 'Account Statement',
      generatedAt: exportDate
    }));
  } catch (error) {
    res.status(500).json({ error: 'Statement export failed: ' + error.message });
  }
});

router.get('/student-statement/:studentId/pdf', authenticateToken, requireSchoolPermission('finance.invoices.view', 'finance.payments.view', 'finance.outstanding_fees.view', 'reports.finance.export'), audit('StudentStatement', 'ExportPdf'), async (req, res) => {
  try {
    if (req.user.Role !== 'admin' && (
      !hasSchoolPermission(req.user, ['finance.invoices.view', 'finance.payments.view', 'finance.outstanding_fees.view'])
      || !hasSchoolPermission(req.user, ['reports.finance.export'])
    )) {
      return res.status(403).json({ error: 'Student account statement export requires finance view and finance export permission' });
    }

    const statement = await invoiceService.getStudentFinanceStatement(parseInt(req.params.studentId, 10), req.user);
    const student = statement.student || {};
    const studentName = `${student.FirstName || ''}-${student.LastName || ''}`.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `student-${student.StudentID}`;
    await auditLog.log({ userId: req.user.UserID, schoolId: student.SchoolID, entityName: 'StudentStatement', entityId: student.StudentID, action: 'ExportPdf', after: { studentId: student.StudentID }, ipAddress: req.ip });
    sendHtml(res, `student-statement-${studentName}.html`, exportService.studentStatementHtml(statement));
  } catch (error) {
    res.status(500).json({ error: 'Statement export failed: ' + error.message });
  }
});

module.exports = router;
