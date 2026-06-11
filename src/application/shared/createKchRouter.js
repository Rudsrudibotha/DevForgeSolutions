// Route factory - Kinder Care Hub chat endpoints (WhatsApp-style
// direct messaging shared by all 3 dashboards).
//
// Thin layer: parse + delegate to KchChatService, which owns every
// access decision (tenant match, participant membership, contact
// validation, entitlements). The original prefixed files
// (sms-messaging-routes.js, all-dashboards-kch-messaging-routes.js)
// are thin re-exports of this factory.
//
// Role gating: school users need the messaging.school.use permission;
// parents and DevForge admins pass the role gate and are constrained
// per-conversation by the access layer instead.
//
// Public surface:
//   GET    /contacts                       - who can I message (picker)
//   GET    /conversations                  - my chats, newest first
//   POST   /conversations                  - open/create chat with a contact
//   GET    /conversations/:id/messages     - history (cursor pagination)
//   POST   /conversations/:id/messages     - send text and/or one image
//   POST   /conversations/:id/read         - mark read
//   GET    /attachments/:id/view           - stream an image (410 if expired)
//   GET    /poll                           - notification events fallback
//   GET    /events                         - SSE keepalive stream
//   POST   /broadcasts                     - school/devforge announcements
//   POST   /broadcasts/:id/process         - deliver a broadcast batch

const express = require('express');
const multer = require('multer');
const { attachSessionContext } = require('../../business/sessionContextService');
const { KchChatService } = require('../../business/kchChatService');
const { KchBroadcastService } = require('../../business/kchBroadcastService');
const { getSchoolPermissions, hasSchoolPermission } = require('../../security/schoolPermissions');
const { audit } = require('../../middleware/audit');

const VALID_DASHBOARDS = new Set(['shared', 'sms', 'parent', 'devforge']);
const ID_PATTERN = '([1-9]\\d*)';

// JSON 401 for API consumers (the portal-auth requireAuth redirects to
// the login page, which is wrong for fetch() calls).
function requireApiAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// School users must hold the messaging permission; parents and admins
// are gated per-conversation by the access layer.
async function roleAwareGuard(req, res, next) {
  const role = req.user && (req.user.role || req.user.Role);
  if (role === 'parent' || role === 'admin') return next();
  if (role !== 'school') return res.status(403).json({ error: 'forbidden' });
  try {
    if (!Array.isArray(req.user.SchoolPermissions) || !req.user.SchoolPermissions.length) {
      req.user.SchoolPermissions = await getSchoolPermissions(req.user);
    }
    if (!hasSchoolPermission(req.user, 'messaging.school.use')) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  } catch (err) {
    console.error('KCH role guard error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
}

function sendError(res, err, fallback) {
  const status = err.statusCode || 500;
  if (status >= 500) console.error('KCH ' + fallback + ' error:', err.message);
  res.status(status).json({ error: status >= 500 ? 'internal_error' : err.message });
}

function createKchRouter(options = {}) {
  const { dashboard = 'shared' } = options;
  if (!VALID_DASHBOARDS.has(dashboard)) {
    throw new Error(`createKchRouter: invalid dashboard "${dashboard}"`);
  }
  const router = express.Router();
  const chat = new KchChatService();
  const broadcasts = new KchBroadcastService();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  router.use(requireApiAuth);
  router.use(attachSessionContext());
  router.use(roleAwareGuard);

  router.get('/contacts', async (req, res) => {
    try {
      const items = await chat.listContacts(req, { q: req.query.q });
      res.json({ items });
    } catch (err) { sendError(res, err, 'list contacts'); }
  });

  router.get('/conversations', async (req, res) => {
    try {
      const items = await chat.listConversations(req, {
        limit: Number(req.query.limit) || 30,
        offset: Number(req.query.offset) || 0
      });
      res.json({ items });
    } catch (err) { sendError(res, err, 'list conversations'); }
  });

  router.post('/conversations', async (req, res) => {
    try {
      const conversation = await chat.startConversation(req, {
        targetUserId: (req.body || {}).targetUserId,
        targetSchoolId: (req.body || {}).targetSchoolId
      });
      res.status(conversation.existing ? 200 : 201).json({ conversation });
    } catch (err) { sendError(res, err, 'start conversation'); }
  });

  router.get(`/conversations/:id${ID_PATTERN}/messages`, async (req, res) => {
    try {
      const items = await chat.listMessages(req, Number(req.params.id), {
        beforeMessageId: req.query.beforeMessageId,
        pageSize: Number(req.query.pageSize) || 40
      });
      res.json({ items });
    } catch (err) { sendError(res, err, 'list messages'); }
  });

  router.post(`/conversations/:id${ID_PATTERN}/messages`, upload.single('image'), async (req, res) => {
    try {
      const message = await chat.sendMessage(req, Number(req.params.id), {
        body: (req.body || {}).body,
        file: req.file || null
      });
      res.status(201).json({ message });
    } catch (err) { sendError(res, err, 'send message'); }
  });

  router.post(`/conversations/:id${ID_PATTERN}/read`, async (req, res) => {
    try {
      res.json(await chat.markRead(req, Number(req.params.id)));
    } catch (err) { sendError(res, err, 'mark read'); }
  });

  router.get(`/attachments/:id${ID_PATTERN}/view`, async (req, res) => {
    try {
      const result = await chat.getAttachmentForView(req, Number(req.params.id));
      if (result.expired) {
        return res.status(410).json({ error: 'image_expired' });
      }
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.filename)}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      // Defence in depth: never let a stored file be sniffed/executed as
      // active content if opened directly.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.send(result.buffer);
    } catch (err) { sendError(res, err, 'view attachment'); }
  });

  router.get('/poll', async (req, res) => {
    try {
      const items = await chat.pollEvents(req, { sinceEventId: req.query.sinceEventId });
      res.json({ items, serverTime: new Date().toISOString() });
    } catch (err) { sendError(res, err, 'poll'); }
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
    if (!ctx || !ctx.UserId) {
      res.write('event: error\ndata: {"error":"no_session"}\n\n');
      return res.end();
    }
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => clearInterval(ping));
  });

  router.post('/broadcasts', audit('Broadcast', 'Create'), async (req, res) => {
    try {
      const broadcast = await broadcasts.createBroadcast(req, req.body || {});
      res.status(201).json({ broadcast });
    } catch (err) { sendError(res, err, 'create broadcast'); }
  });

  router.post(`/broadcasts/:id${ID_PATTERN}/process`, async (req, res) => {
    try {
      const result = await broadcasts.processBroadcast(req, Number(req.params.id));
      res.json(result);
    } catch (err) { sendError(res, err, 'process broadcast'); }
  });

  return router;
}

module.exports = createKchRouter;
module.exports.createKchRouter = createKchRouter;
