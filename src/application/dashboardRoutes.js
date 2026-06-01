// Application Layer - Dashboard routes

const express = require('express');
const DashboardService = require('../business/dashboardService');
const { authenticateToken } = require('../middleware/auth');
const { getSchoolPermissions, hasSchoolPermission } = require('../security/schoolPermissions');

const router = express.Router();
const dashboardService = new DashboardService();
const SCHOOL_DASHBOARD_PERMISSIONS = [
  'school.students.view',
  'school.classes.view',
  'attendance.view_all',
  'finance.invoices.view',
  'reports.view'
];

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.Role === 'admin') {
      const data = await dashboardService.getAdminDashboard();
      return res.json(data);
    }

    if (req.user.Role !== 'school') {
      return res.status(403).json({ error: 'School staff access required' });
    }

    const permissions = await getSchoolPermissions(req.user);
    req.user.SchoolPermissions = permissions;
    req.user.SchoolPermissionSet = new Set(permissions);

    if (!hasSchoolPermission(req.user, SCHOOL_DASHBOARD_PERMISSIONS)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    if (!req.user.SchoolID) {
      return res.json({});
    }

    const data = await dashboardService.getSchoolDashboard(req.user.SchoolID);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
