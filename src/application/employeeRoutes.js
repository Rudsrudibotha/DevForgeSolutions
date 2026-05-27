// Application Layer - Employee routes

const express = require('express');
const EmployeeService = require('../business/employeeService');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');

const router = express.Router();
const employeeService = new EmployeeService();

const STAFF_PAYROLL_READ_PERMISSIONS = [
  'school.staff.view',
  'school.staff.manage',
  'hr.view_payslips',
  'hr.manage_payslips',
  'payroll.generate',
  'payroll.review',
  'payroll.finalize',
  'payroll.view_previous',
  'sensitive.payroll.view'
];

router.get('/', authenticateToken, requireSchoolPermission(...STAFF_PAYROLL_READ_PERMISSIONS), async (req, res) => {
  try {
    const employees = await employeeService.getEmployees(req.user);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payroll-options', authenticateToken, requireSchoolPermission(...STAFF_PAYROLL_READ_PERMISSIONS), async (req, res) => {
  try {
    const employees = await employeeService.getPayrollOptions(req.user);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolPermission(...STAFF_PAYROLL_READ_PERMISSIONS), async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(parseInt(req.params.id, 10), req.user);
    res.json(employee);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolPermission('school.staff.manage'), async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body, req.user);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolPermission('school.staff.manage'), async (req, res) => {
  try {
    const employee = await employeeService.updateEmployee(parseInt(req.params.id, 10), req.body, req.user);
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
