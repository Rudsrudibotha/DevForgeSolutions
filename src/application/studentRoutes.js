// Application Layer - Student routes

const express = require('express');
const StudentService = require('../business/studentService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const studentService = new StudentService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const students = await studentService.getStudents(req.query.status, req.user);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const student = await studentService.getStudentById(parseInt(req.params.id, 10), req.user);
    res.json(student);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const student = await studentService.createStudent(req.body, req.user);
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const student = await studentService.updateStudent(parseInt(req.params.id, 10), req.body, req.user);
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/inactivate', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const student = await studentService.makeInactive(parseInt(req.params.id, 10), req.body, req.user);
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
