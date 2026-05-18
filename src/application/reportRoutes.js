const express = require('express');
const ReportService = require('../business/reportService');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
const reportService = new ReportService();

router.get('/school', authenticateToken, requireSchoolPermission(
  'reports.view',
  'reports.finance.view',
  'reports.attendance.view',
  'reports.demographics.view',
  'reports.year_end.view',
  'school.consent.view'
), audit('Report', 'ViewSchoolReport'), async (req, res) => {
  try {
    const report = await reportService.getSchoolReport(req.user, {
      year: req.query.year,
      className: req.query.className
    });
    res.json(report);
  } catch (error) {
    const status = /logged-in school context|School users/.test(error.message) ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
