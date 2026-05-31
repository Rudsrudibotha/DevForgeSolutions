// Application Layer - Messaging package status and validation routes.

const express = require('express');
const { authenticateToken, requireParent, requireSchoolPermission } = require('../middleware/auth');
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

router.get('/school/targets', authenticateToken, requireSchoolPermission('communication.history.view', 'communication.history.resend'), async (req, res) => {
  try {
    const result = await messagingService.previewTargets(req.user, req.query);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/school/send', authenticateToken, requireSchoolPermission('communication.history.resend'), audit('Messaging', 'SchoolSend'), async (req, res) => {
  try {
    const result = await messagingService.sendFromSchool(req.user, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/school/conversations', authenticateToken, requireSchoolPermission('communication.history.view', 'communication.history.resend'), async (req, res) => {
  try {
    const conversations = await messagingService.listSchoolConversations(req.user, req.query);
    res.json(conversations);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.get('/school/conversations/:id/messages', authenticateToken, requireSchoolPermission('communication.history.view', 'communication.history.resend'), async (req, res) => {
  try {
    const result = await messagingService.getSchoolMessages(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(statusForError(error)).json({ error: error.message });
  }
});

router.post('/school/conversations/:id/messages', authenticateToken, requireSchoolPermission('communication.history.resend'), audit('Messaging', 'SchoolReply'), async (req, res) => {
  try {
    const result = await messagingService.replyFromSchool(req.user, req.params.id, req.body);
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
