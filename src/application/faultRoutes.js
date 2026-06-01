const express = require('express');
const FaultReportService = require('../business/faultReportService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const faultChangeNotifier = require('../business/faultChangeNotifier');

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

    faultChangeNotifier.notify({
      action: 'created',
      faultReportId: report.FaultReportID,
      schoolId: report.SchoolID
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get('/changes', authenticateToken, requireAdmin, async (req, res) => {
  let completed = false;
  let timeout = null;

  const finish = async (payload = null) => {
    if (completed) {
      return;
    }

    completed = true;
    if (timeout) {
      clearTimeout(timeout);
    }
    faultChangeNotifier.off('change', onChange);

    try {
      const marker = await faultReportService.getChangeMarker();
      res.json({
        changed: Boolean(payload),
        change: payload,
        marker
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const onChange = (payload) => finish(payload);

  try {
    const currentMarker = await faultReportService.getChangeMarker();
    const afterId = Number(req.query.afterId || 0);
    const afterChanged = String(req.query.afterChanged || '');

    if (currentMarker.latestFaultReportId > afterId
      || (currentMarker.latestChangedDate && afterChanged && currentMarker.latestChangedDate > afterChanged)) {
      return res.json({
        changed: true,
        change: { action: 'existing-change' },
        marker: currentMarker
      });
    }

    const timeoutMs = Math.min(Math.max(Number(req.query.timeoutMs || 25000), 5000), 30000);
    faultChangeNotifier.on('change', onChange);
    timeout = setTimeout(() => finish(null), timeoutMs);
    req.on('close', () => {
      if (!completed) {
        completed = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        faultChangeNotifier.off('change', onChange);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    faultChangeNotifier.notify({
      action: 'status-updated',
      faultReportId: updated.FaultReportID,
      schoolId: updated.SchoolID,
      status: updated.Status
    });

    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

module.exports = router;
