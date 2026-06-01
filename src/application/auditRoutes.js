// Application Layer - Audit log routes

const express = require('express');
const AuditLogRepository = require('../data/auditLogRepository');
const { authenticateToken } = require('../middleware/auth');
const { getSchoolPermissions, hasSchoolPermission } = require('../security/schoolPermissions');

const router = express.Router();
const auditLogRepository = new AuditLogRepository();
const AUDIT_PERMISSIONS = [
  'reports.view',
  'devforge.audit.view',
  'finance.audit.view',
  'finance.year_end_close'
];

router.get('/', authenticateToken, async (req, res) => {
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

    if (req.user.Role === 'admin') {
      const logs = await auditLogRepository.getAll(page, limit, filters);
      return res.json(logs);
    }

    if (req.user.Role !== 'school') {
      return res.status(403).json({ error: 'School staff access required' });
    }

    const permissions = await getSchoolPermissions(req.user);
    req.user.SchoolPermissions = permissions;
    req.user.SchoolPermissionSet = new Set(permissions);

    if (!hasSchoolPermission(req.user, AUDIT_PERMISSIONS)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    const logs = await auditLogRepository.getBySchool(req.user.SchoolID, page, limit, filters);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
