// Application Layer - School routes

const express = require('express');
const SchoolService = require('../business/schoolService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { audit, auditLog } = require('../middleware/audit');

const router = express.Router();
const schoolService = new SchoolService();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const schools = await schoolService.getAllSchools(req.user);
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/availability/school-name', async (req, res) => {
  try {
    const registered = await schoolService.isSchoolNameRegistered(req.query.schoolName);
    res.json({ available: !registered });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const school = await schoolService.getSchoolById(parseInt(req.params.id, 10), req.user);
    res.json(school);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireAdmin, audit('School', 'SchoolAdded'), async (req, res) => {
  try {
    const newSchool = await schoolService.createSchool(req.body);
    res.status(201).json(newSchool);
  } catch (error) {
    const status = error.statusCode || 400;
    if (status === 409) {
      auditLog.log({
        userId: req.user?.UserID, schoolId: null, entityName: 'School',
        entityId: req.body?.schoolName || '-', action: 'DuplicateRegistrationAttempt',
        after: { schoolName: req.body?.schoolName }, ipAddress: req.ip
      });
    }
    res.status(status).json({ message: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updatedSchool = await schoolService.updateSchool(parseInt(req.params.id, 10), req.body, req.user);
    res.json(updatedSchool);
  } catch (error) {
    const status = error.statusCode || (error.message.includes('only update your own') ? 403 : 400);
    if (status === 409) {
      auditLog.log({
        userId: req.user?.UserID, schoolId: req.user?.SchoolID, entityName: 'School',
        entityId: req.params.id, action: 'DuplicateNameUpdateAttempt',
        after: { schoolName: req.body?.schoolName }, ipAddress: req.ip
      });
    }
    res.status(status).json({ message: error.message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await schoolService.deleteSchool(parseInt(req.params.id, 10));
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.put('/:id/suspend', authenticateToken, requireAdmin, audit('School', 'SchoolSuspended'), async (req, res) => {
  try {
    const result = await schoolService.suspendSchool(parseInt(req.params.id, 10));
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.put('/:id/activate', authenticateToken, requireAdmin, audit('School', 'SchoolActivated'), async (req, res) => {
  try {
    const result = await schoolService.activateSchool(parseInt(req.params.id, 10));
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
