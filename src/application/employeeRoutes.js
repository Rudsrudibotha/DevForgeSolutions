// Application Layer - Employee routes

const express = require('express');
const EmployeeService = require('../business/employeeService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const employeeService = new EmployeeService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const employees = await employeeService.getEmployees(req.user);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(parseInt(req.params.id, 10), req.user);
    res.json(employee);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const employee = await employeeService.createEmployee(req.body, req.user);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const employee = await employeeService.updateEmployee(parseInt(req.params.id, 10), req.body, req.user);
    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
