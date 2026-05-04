// Application Layer - Dashboard routes

const express = require('express');
const DashboardService = require('../business/dashboardService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const dashboardService = new DashboardService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
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
