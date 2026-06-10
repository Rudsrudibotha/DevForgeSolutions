// API Routes - Hostinger Gemma 3 AI endpoints. Implements Tasks 49-56.
// /api/ai/chat is the only endpoint the frontend chatbot may call.
// /api/ai/reconcile is the only endpoint for AI bank-reconciliation suggestions.
// /api/ai/test-connection is a DevForge admin diagnostic.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/portalAuth');
const { handleChat, suggestBankReconciliationMatch } = require('../business/aiChatService');
const { TestHostingerGemmaConnection } = require('../business/aiProvider');
const { attachSessionContext } = require('../business/sessionContextService');
const { canTenantUseFeature } = require('../data/entitlementRepository');
const { FaultReportRepository } = require('../data/kinderCareHubOperationsRepository');

router.use(requireAuth);
router.use(attachSessionContext());

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const result = await handleChat({ req, body: req.body || {} });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[ai/chat] error', err);
    res.status(500).json({ error: 'ai-unavailable' });
  }
});

// POST /api/ai/reconcile
router.post('/reconcile', async (req, res) => {
  try {
    const result = await suggestBankReconciliationMatch({ req, body: req.body || {} });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[ai/reconcile] error', err);
    res.status(500).json({ error: 'ai-unavailable' });
  }
});

// POST /api/ai/fault-report - the AI may help the user collect info, but
// the backend always creates the report (Task 62-64). The AI cannot
// directly write a fault report to the database.
router.post('/fault-report', async (req, res) => {
  try {
    if (!req.sessionContext) return res.status(401).json({ error: 'unauthenticated' });
    if (req.sessionContext.IsParentUser) return res.status(403).json({ error: 'parent-blocked' });
    const ent = await canTenantUseFeature(req.sessionContext.ActiveTenantId, 'KINDER_CARE_HUB_REPORT_FAULT');
    if (!ent.IsAllowed) return res.status(402).json({ error: 'feature-disabled' });

    const { description, screenName, priority, primaryAttachmentId } = req.body || {};
    if (!description || String(description).trim().length === 0) {
      return res.status(400).json({ error: 'description-required' });
    }
    if (String(description).length > 4000) {
      return res.status(400).json({ error: 'description-too-long' });
    }

    const repo = new FaultReportRepository();
    const id = await repo.create({
      tenantId: req.sessionContext.ActiveTenantId,
      schoolId: req.sessionContext.ActiveSchoolId,
      reportedByUserId: req.user.id,
      dashboardType: req.sessionContext.DashboardType,
      screenName: String(screenName || '').slice(0, 200) || null,
      description: String(description).slice(0, 4000),
      priority: ['Low', 'Normal', 'High', 'Urgent'].includes(priority) ? priority : 'Normal',
      primaryAttachmentId: primaryAttachmentId || null,
      status: 'Open',
      assignedToUserId: null
    });
    res.status(201).json({ ok: true, faultReportId: id });
  } catch (err) {
    console.error('[ai/fault-report] error', err);
    res.status(500).json({ error: 'server-error' });
  }
});

// GET /api/ai/test-connection - DevForge admin diagnostic (Task 49)
router.get('/test-connection', async (req, res) => {
  try {
    if (!req.sessionContext || !req.sessionContext.IsDevForgeUser) {
      return res.status(403).json({ error: 'devforge-only' });
    }
    const result = await TestHostingerGemmaConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'test-failed', message: err.message });
  }
});

module.exports = router;
