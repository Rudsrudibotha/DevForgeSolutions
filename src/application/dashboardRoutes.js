// Application Layer - Dashboard routes

const express = require('express');
const DashboardService = require('../business/dashboardService');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');

const router = express.Router();
const dashboardService = new DashboardService();

router.get('/', authenticateToken, requireSchoolPermission(
  'school.students.view',
  'school.classes.view',
  'attendance.view_all',
  'finance.invoices.view',
  'reports.view'
), async (req, res) => {
  try {
    if (req.user.Role === 'admin') {
      const data = await dashboardService.getAdminDashboard();
      return res.json(data);
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
