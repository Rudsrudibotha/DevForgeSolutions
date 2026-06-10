// Application Layer - Messaging package status and validation routes.

const express = require('express');
const { authenticateToken, requireAdmin, requireParent, requireSchoolPermission } = require('../middleware/auth');

const SCHOOL_MESSAGING_VIEW_PERMISSIONS = [
  'school.messaging.view',
  'school.messaging.send',
  'school.consent.view',
  'school.parents.view'
];
const SCHOOL_MESSAGING_SEND_PERMISSIONS = [
  'school.messaging.send',
  'school.consent.manage',
  'school.parents.manage'
];
const { audit } = require('../middleware/audit');
const { MessagingPackageService } = require('../business/messagingPackageService');
const { MessagingService } = require('../business/messagingService');

const router = express.Router();
const messagingPackageService = new MessagingPackageService();
const messagingService = new MessagingService();

router.get('/package', authenticateToken, async (req, res) => {
  try {
    const status = await messagingPackageService.getStatusForUser(req.user, req.query.schoolId);
    res.json(status);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/package/test', authenticateToken, audit('MessagingPackage', 'Test'), async (req, res) => {
  try {
    const result = await messagingPackageService.testForUser(req.user, req.body.schoolId || req.query.schoolId);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await messagingService.notificationsForUser(req.user);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.put('/notifications/read', authenticateToken, async (req, res) => {
  try {
    const result = await messagingService.markRead(req.user, req.body?.conversationId || req.query.conversationId);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/school/targets', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_VIEW_PERMISSIONS), async (req, res) => {
  try {
    const result = await messagingService.previewTargets(req.user, req.query);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/school/contacts', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_VIEW_PERMISSIONS), async (req, res) => {
  try {
    const result = await messagingService.contactsForSchool(req.user, req.query);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/school/send', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_SEND_PERMISSIONS), audit('Messaging', 'SchoolSend'), async (req, res) => {
  try {
    const result = await messagingService.sendFromSchool(req.user, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/school/direct', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_SEND_PERMISSIONS), audit('Messaging', 'SchoolDirectSend'), async (req, res) => {
  try {
    const result = await messagingService.sendDirectFromSchool(req.user, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/school/conversations', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_VIEW_PERMISSIONS), async (req, res) => {
  try {
    const conversations = await messagingService.listSchoolConversations(req.user, req.query);
    res.json(conversations);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/school/conversations/:id/messages', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_VIEW_PERMISSIONS), async (req, res) => {
  try {
    const result = await messagingService.getSchoolMessages(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/school/conversations/:id/messages', authenticateToken, requireSchoolPermission(...SCHOOL_MESSAGING_SEND_PERMISSIONS), audit('Messaging', 'SchoolReply'), async (req, res) => {
  try {
    const result = await messagingService.replyFromSchool(req.user, req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/devforge/conversations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const conversations = await messagingService.listDevForgeConversations(req.user);
    res.json(conversations);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/devforge/send', authenticateToken, requireAdmin, audit('Messaging', 'DevForgeSend'), async (req, res) => {
  try {
    const result = await messagingService.sendFromDevForge(req.user, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/devforge/conversations/:id/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await messagingService.getDevForgeMessages(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/devforge/conversations/:id/messages', authenticateToken, requireAdmin, audit('Messaging', 'DevForgeReply'), async (req, res) => {
  try {
    const result = await messagingService.replyFromDevForge(req.user, req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/parent/send', authenticateToken, requireParent, audit('Messaging', 'ParentSend'), async (req, res) => {
  try {
    const result = await messagingService.sendFromParent(req.user, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/parent/conversations', authenticateToken, requireParent, async (req, res) => {
  try {
    const conversations = await messagingService.listParentConversations(req.user, req.query);
    res.json(conversations);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/parent/conversations/:id/messages', authenticateToken, requireParent, async (req, res) => {
  try {
    const result = await messagingService.getParentMessages(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/parent/conversations/:id/messages', authenticateToken, requireParent, audit('Messaging', 'ParentReply'), async (req, res) => {
  try {
    const result = await messagingService.replyFromParent(req.user, req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

function statusForError(error) {
  if (error.statusCode) {
    return error.statusCode;
  }

  if (/not found/i.test(error.message)) {
    return 404;
  }

  return /not linked|required|pending|selected|target|family|class/i.test(error.message) ? 400 : 403;
}

module.exports = router;
