// Application Layer - Attendance routes

const express = require('express');
const AttendanceService = require('../business/attendanceService');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const attendanceService = new AttendanceService();
const requireStudentAttendanceAccess = (req, res, next) => {
  if (req.user.Role === 'parent') {
    return next();
  }

  return requireSchoolPermission(
    'attendance.view_all',
    'attendance.edit_all',
    'attendance.view_assigned',
    'attendance.submit_assigned'
  )(req, res, next);
};

router.get('/date/:date', authenticateToken, requireSchoolPermission('attendance.view_all', 'attendance.edit_all', 'attendance.view_assigned', 'attendance.submit_assigned'), async (req, res) => {
  try { res.json(await attendanceService.getByDate(req.params.date, req.user)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/range', authenticateToken, requireSchoolPermission('attendance.view_all', 'attendance.edit_all', 'attendance.view_assigned'), async (req, res) => {
  try { res.json(await attendanceService.getByRange(req.query.from, req.query.to, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/student/:studentId', authenticateToken, requireStudentAttendanceAccess, async (req, res) => {
  try { res.json(await attendanceService.getByStudent(parseInt(req.params.studentId, 10), req.query.from, req.query.to, req.user)); }
  catch (e) {
    const status = e.message.includes('only view attendance') ? 403 : 500;
    res.status(status).json({ error: e.message });
  }
});

router.get('/summary', authenticateToken, requireSchoolPermission('attendance.view_all', 'attendance.edit_all', 'attendance.view_assigned'), async (req, res) => {
  try { res.json(await attendanceService.getSummary(req.query.from, req.query.to, req.user)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, requireSchoolPermission('attendance.edit_all', 'attendance.submit_assigned'), audit('Attendance', 'Record'), async (req, res) => {
  try { res.status(201).json(await attendanceService.recordAttendance(req.body, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/bulk', authenticateToken, requireSchoolPermission('attendance.edit_all', 'attendance.submit_assigned'), audit('Attendance', 'BulkRecord'), async (req, res) => {
  try { res.status(201).json(await attendanceService.recordBulkAttendance(req.body.records || [], req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/:attendanceId/undo', authenticateToken, requireSchoolPermission('attendance.correct', 'attendance.edit_all'), audit('Attendance', 'UndoTime'), async (req, res) => {
  try { res.json(await attendanceService.undoTime(req.params.attendanceId, req.body.field, req.user)); }
  catch (e) {
    const status = e.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

module.exports = router;
