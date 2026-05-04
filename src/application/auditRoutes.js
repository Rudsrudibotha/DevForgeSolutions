// Application Layer - Audit log routes

const express = require('express');
const AuditLogRepository = require('../data/auditLogRepository');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const auditLogRepository = new AuditLogRepository();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = req.user.Role === 'admin'
      ? await auditLogRepository.getAll(page, limit)
      : await auditLogRepository.getBySchool(req.user.SchoolID, page, limit);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
