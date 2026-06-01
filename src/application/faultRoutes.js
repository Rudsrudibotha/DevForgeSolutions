const express = require('express');
const FaultReportService = require('../business/faultReportService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();
const faultReportService = new FaultReportService();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const report = await faultReportService.createFaultReport(req.body, req.user, {
      userAgent: req.get('user-agent')
    });

    auditLog.log({
      userId: req.user?.UserID,
      schoolId: report.SchoolID,
      entityName: 'FaultReport',
      entityId: report.FaultReportID,
      action: 'Create',
      after: {
        pagePath: report.PagePath,
        viewName: report.ViewName,
        remarks: report.Remarks
      },
      ipAddress: req.ip
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reports = await faultReportService.getFaultReports(req.query);
    res.json(reports);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await faultReportService.updateFaultStatus(req.params.id, req.body?.status, req.user);

    auditLog.log({
      userId: req.user?.UserID,
      schoolId: updated.SchoolID,
      entityName: 'FaultReport',
      entityId: updated.FaultReportID,
      action: 'UpdateStatus',
      after: {
        status: updated.Status
      },
      ipAddress: req.ip
    });

    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

module.exports = router;
