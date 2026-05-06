// Application Layer - Attendance routes

const express = require('express');
const AttendanceService = require('../business/attendanceService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const attendanceService = new AttendanceService();

router.get('/date/:date', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await attendanceService.getByDate(req.params.date, req.user)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try { res.json(await attendanceService.getByStudent(parseInt(req.params.studentId, 10), req.query.from, req.query.to, req.user)); }
  catch (e) {
    const status = e.message.includes('only view attendance') ? 403 : 500;
    res.status(status).json({ error: e.message });
  }
});

router.get('/summary', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await attendanceService.getSummary(req.query.from, req.query.to, req.user)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, audit('Attendance', 'Record'), async (req, res) => {
  try { res.status(201).json(await attendanceService.recordAttendance(req.body, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/bulk', authenticateToken, requireSchoolOrAdmin, audit('Attendance', 'BulkRecord'), async (req, res) => {
  try { res.status(201).json(await attendanceService.recordBulkAttendance(req.body.records || [], req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/:attendanceId/undo', authenticateToken, requireSchoolOrAdmin, audit('Attendance', 'UndoTime'), async (req, res) => {
  try { res.json(await attendanceService.undoTime(req.params.attendanceId, req.body.field, req.user)); }
  catch (e) {
    const status = e.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

module.exports = router;
