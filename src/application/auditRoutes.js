// Application Layer - Audit log routes

const express = require('express');
const AuditLogRepository = require('../data/auditLogRepository');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');

const router = express.Router();
const auditLogRepository = new AuditLogRepository();

router.get('/', authenticateToken, requireSchoolPermission('reports.view', 'devforge.audit.view', 'finance.audit.view', 'finance.year_end_close'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const filters = {
      entityName: req.query.entityName || null,
      action: req.query.action || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      sensitiveFinance: req.query.sensitiveFinance === 'true'
    };
    const logs = req.user.Role === 'admin'
      ? await auditLogRepository.getAll(page, limit, filters)
      : await auditLogRepository.getBySchool(req.user.SchoolID, page, limit, filters);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
