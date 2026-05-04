// Application Layer - Class routes (including timetable)

const express = require('express');
const ClassService = require('../business/classService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const classService = new ClassService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await classService.getClasses(req.user)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/timetable/all', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await classService.getTimetable(req.user, req.query.classId ? parseInt(req.query.classId, 10) : null)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/timetable', authenticateToken, requireSchoolOrAdmin, audit('Timetable', 'Create'), async (req, res) => {
  try { res.status(201).json(await classService.addTimetableEntry(req.body, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await classService.getClassById(parseInt(req.params.id, 10), req.user)); }
  catch (e) { res.status(404).json({ error: e.message }); }
});

router.get('/:id/capacity', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await classService.checkCapacity(parseInt(req.params.id, 10), req.user)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, audit('Class', 'Create'), async (req, res) => {
  try { res.status(201).json(await classService.createClass(req.body, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', authenticateToken, requireSchoolOrAdmin, audit('Class', 'Update'), async (req, res) => {
  try { res.json(await classService.updateClass(parseInt(req.params.id, 10), req.body, req.user)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
