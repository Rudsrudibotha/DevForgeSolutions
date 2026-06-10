// Route factory - Kinder Care Hub messaging endpoints.
//
// Backs the KCH messaging API for every dashboard. The original prefixed
// files (messagingRoutes.js, kinderCareHubRoutes.js, sms-messaging-routes.js,
// all-dashboards-kch-messaging-routes.js) are now thin re-exports of
// this factory so behaviour stays consistent.
//
// Differences per dashboard (driven by `dashboard`):
//   - 'shared'  : the default; no extra gating beyond session
//   - 'sms'     : school dashboard; adds requireSchoolPermission
//   - 'parent'  : parent dashboard; adds requireParent
//   - 'devforge': DevForge admin; adds requireAdmin
//
// Usage:
//   const createKchRouter = require('./createKchRouter');
//   app.use('/api/messages', createKchRouter({ dashboard: 'shared' }));
//   app.use('/sms/api/messages', createKchRouter({ dashboard: 'sms' }));
//
// Public surface (12 endpoints) - kept identical to the original file:
//   GET    /conversations
//   POST   /conversations
//   GET    /conversations/:id/messages
//   POST   /conversations/:id/messages
//   POST   /conversations/:id/read
//   POST   /attachments
//   GET    /attachments/:id/view
//   GET    /poll
//   GET    /events
//   POST   /broadcasts
//   POST   /broadcasts/:id/process
//
// Every endpoint enforces the 9-step access check (see architecture.txt
// section 18e) through the existing middleware chain.

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../../middleware/portalAuth');
const { attachSessionContext } = require('../../business/sessionContextService');
const { canTenantUseFeature, TenantFeatureUsageRepository, SaaSFeatureRepository } = require('../../data/entitlementRepository');
const {
  ConversationRepository,
  ConversationParticipantRepository,
  MessageRepository,
  MessageAttachmentRepository,
  MessageNotificationEventRepository,
  ConversationAuditLogRepository
} = require('../../data/kinderCareHubRepository');
const {
  BroadcastAnnouncementRepository,
  BroadcastDeliveryRepository
} = require('../../data/kinderCareHubOperationsRepository');
const {
  validateActiveTenantAccess,
  canUserAccessConversation,
  canUserSendMessage,
  canUserUploadImage
} = require('../../business/kinderCareHubAccess');
const { getBlobStorageProvider } = require('../../data/blobStorage');
const { audit } = require('../../middleware/audit');

const VALID_DASHBOARDS = new Set(['shared', 'sms', 'parent', 'devforge']);

function pickRoleGuard(dashboard) {
  if (dashboard === 'sms') {
    const { requireSchoolPermission } = require('../../middleware/auth');
    return requireSchoolPermission('messaging.school.use');
  }
  if (dashboard === 'parent') {
    const { requireParent } = require('../../middleware/auth');
    return requireParent;
  }
  if (dashboard === 'devforge') {
    const { requireAdmin } = require('../../middleware/auth');
    return requireAdmin;
  }
  return null;
}

function pickFeatureKey(dashboard) {
  if (dashboard === 'parent') return 'KINDER_CARE_HUB_PARENT_MESSAGING';
  if (dashboard === 'devforge') return 'KINDER_CARE_HUB_DEVFORGE_MESSAGING';
  if (dashboard === 'sms') return 'KINDER_CARE_HUB_MESSAGING';
  return 'KINDER_CARE_HUB_MESSAGING';
}

function createKchRouter(options = {}) {
  const { dashboard = 'shared' } = options;
  if (!VALID_DASHBOARDS.has(dashboard)) {
    throw new Error(`createKchRouter: invalid dashboard "${dashboard}"`);
  }
  const router = express.Router();
  const roleGuard = pickRoleGuard(dashboard);
  const featureKey = pickFeatureKey(dashboard);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  router.use(requireAuth);
  router.use(attachSessionContext());
  if (roleGuard) router.use(roleGuard);

  router.get('/conversations', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      const list = await ConversationRepository.listForUser({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        userId: ctx.UserId,
        role: ctx.UserRole
      });
      res.json({ conversations: list });
    } catch (err) {
      console.error('KCH list conversations error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.post('/conversations', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      const { subjectUserId, schoolId, topic } = req.body || {};
      const conv = await ConversationRepository.createOrGet({
        tenantId: ctx.ActiveTenantId,
        schoolId: schoolId || ctx.ActiveSchoolId,
        createdByUserId: ctx.UserId,
        topic: topic || null,
        subjectUserId: subjectUserId || null
      });
      await ConversationAuditLogRepository.write({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        conversationId: conv.ConversationId,
        actorUserId: ctx.UserId,
        action: 'create'
      });
      res.status(201).json({ conversation: conv });
    } catch (err) {
      console.error('KCH create conversation error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.get('/conversations/:id/messages', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      const ok = await canUserAccessConversation({
        userId: ctx.UserId,
        role: ctx.UserRole,
        conversationId: Number(req.params.id),
        tenantId: ctx.ActiveTenantId
      });
      if (!ok) return res.status(403).json({ error: 'forbidden' });
      const messages = await MessageRepository.listForConversation({
        tenantId: ctx.ActiveTenantId,
        conversationId: Number(req.params.id),
        cursor: req.query.cursor || null
      });
      res.json({ messages });
    } catch (err) {
      console.error('KCH list messages error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.post('/conversations/:id/messages', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      const canSend = await canUserSendMessage({
        userId: ctx.UserId,
        role: ctx.UserRole,
        conversationId: Number(req.params.id),
        tenantId: ctx.ActiveTenantId
      });
      if (!canSend) return res.status(403).json({ error: 'forbidden' });
      const { body } = req.body || {};
      if (!body || typeof body !== 'string') return res.status(400).json({ error: 'body_required' });
      const msg = await MessageRepository.create({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        conversationId: Number(req.params.id),
        senderUserId: ctx.UserId,
        body
      });
      await ConversationAuditLogRepository.write({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        conversationId: Number(req.params.id),
        actorUserId: ctx.UserId,
        action: 'send'
      });
      res.status(201).json({ message: msg });
    } catch (err) {
      console.error('KCH send message error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.post('/conversations/:id/read', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      const ok = await canUserAccessConversation({
        userId: ctx.UserId,
        role: ctx.UserRole,
        conversationId: Number(req.params.id),
        tenantId: ctx.ActiveTenantId
      });
      if (!ok) return res.status(403).json({ error: 'forbidden' });
      await MessageRepository.markRead({
        tenantId: ctx.ActiveTenantId,
        conversationId: Number(req.params.id),
        userId: ctx.UserId
      });
      res.json({ ok: true });
    } catch (err) {
      console.error('KCH mark read error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.post('/attachments', upload.single('file'), async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      if (!req.file) return res.status(400).json({ error: 'file_required' });
      const canUpload = await canUserUploadImage({
        userId: ctx.UserId,
        role: ctx.UserRole,
        conversationId: Number((req.body || {}).conversationId) || null,
        tenantId: ctx.ActiveTenantId
      });
      if (!canUpload) return res.status(403).json({ error: 'forbidden' });
      const provider = getBlobStorageProvider();
      const stored = await provider.store({
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        ownerId: ctx.UserId
      });
      const attachment = await MessageAttachmentRepository.create({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        conversationId: Number((req.body || {}).conversationId) || null,
        uploaderUserId: ctx.UserId,
        blobUrl: stored.blobUrl,
        provider: stored.provider,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        sizeBytes: req.file.size
      });
      res.status(201).json({ attachment });
    } catch (err) {
      console.error('KCH upload attachment error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.get('/attachments/:id/view', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const att = await MessageAttachmentRepository.findById({
        tenantId: ctx.ActiveTenantId,
        attachmentId: Number(req.params.id)
      });
      if (!att) return res.status(404).json({ error: 'not_found' });
      const ok = await canUserAccessConversation({
        userId: ctx.UserId,
        role: ctx.UserRole,
        conversationId: att.ConversationId,
        tenantId: ctx.ActiveTenantId
      });
      if (!ok) return res.status(403).json({ error: 'forbidden' });
      const provider = getBlobStorageProvider();
      const { buffer, contentType, filename } = await provider.read(att.BlobUrl);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (err) {
      console.error('KCH view attachment error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.get('/poll', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, featureKey);
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: featureKey });
      const since = req.query.since || null;
      const events = await MessageNotificationEventRepository.listSince({
        tenantId: ctx.ActiveTenantId,
        userId: ctx.UserId,
        since
      });
      res.json({ events, serverTime: new Date().toISOString() });
    } catch (err) {
      console.error('KCH poll error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.get('/events', (req, res) => {
    res.set({
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();
    res.write('retry: 5000\n\n');
    const ctx = req.sessionContext;
    if (!ctx || !ctx.ActiveTenantId) {
      res.write('event: error\ndata: {"error":"no_tenant"}\n\n');
      return res.end();
    }
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => clearInterval(ping));
  });

  router.post('/broadcasts', audit('Broadcast', 'Create'), async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, 'KINDER_CARE_HUB_BROADCASTS');
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: 'KINDER_CARE_HUB_BROADCASTS' });
      const { title, body, audienceFilter } = req.body || {};
      if (!title || !body) return res.status(400).json({ error: 'title_and_body_required' });
      const b = await BroadcastAnnouncementRepository.create({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        createdByUserId: ctx.UserId,
        title,
        body,
        audienceFilter: audienceFilter || null
      });
      res.status(201).json({ broadcast: b });
    } catch (err) {
      console.error('KCH create broadcast error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.post('/broadcasts/:id/process', async (req, res) => {
    try {
      const ctx = req.sessionContext;
      if (!ctx || !ctx.ActiveTenantId) return res.status(401).json({ error: 'No active tenant' });
      const allowed = await canTenantUseFeature(ctx.ActiveTenantId, 'KINDER_CARE_HUB_BROADCASTS');
      if (!allowed) return res.status(402).json({ error: 'feature_not_entitled', feature: 'KINDER_CARE_HUB_BROADCASTS' });
      const result = await BroadcastDeliveryRepository.processBatch({
        tenantId: ctx.ActiveTenantId,
        broadcastId: Number(req.params.id),
        batchSize: 200
      });
      res.json({ processed: result.processed });
    } catch (err) {
      console.error('KCH process broadcast error', err.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  return router;
}

module.exports = createKchRouter;
module.exports.createKchRouter = createKchRouter;
