// Application Layer - Messaging package status and validation routes.

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { MessagingPackageService } = require('../business/messagingPackageService');

const router = express.Router();
const messagingPackageService = new MessagingPackageService();

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

function statusForError(error) {
  if (error.statusCode) {
    return error.statusCode;
  }

  return /not found|not linked|required|pending/i.test(error.message) ? 400 : 403;
}

module.exports = router;
