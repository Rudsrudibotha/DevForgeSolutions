// Application Layer - Email provider management and test-send routes.

const express = require('express');
const NotificationService = require('../business/notificationService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  const notificationService = new NotificationService();

  res.json(notificationService.getStatus());
});

router.post('/test', authenticateToken, requireAdmin, audit('Email', 'SendTest'), async (req, res) => {
  try {
    const notificationService = new NotificationService();
    const to = emailRecipients(req.body.to);
    const subject = boundedString(req.body.subject || 'Kinder Care Hub email test', 'Subject', 200);
    const body = boundedString(req.body.body || 'This is a test email from Kinder Care Hub.', 'Body', 5000);
    const html = req.body.html ? boundedString(req.body.html, 'HTML body', 20000) : undefined;

    if (!to.length) {
      return res.status(400).json({ error: 'At least one valid recipient email is required' });
    }

    if (to.length > 10) {
      return res.status(400).json({ error: 'Test emails are limited to 10 recipients' });
    }

    const result = await notificationService.sendEmail(to, subject, body, { html });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

function emailRecipients(value) {
  const recipients = Array.isArray(value) ? value : String(value || '').split(',');

  return recipients
    .map((recipient) => String(recipient || '').trim().toLowerCase())
    .filter((recipient) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient));
}

function boundedString(value, label, maxLength) {
  const cleaned = String(value || '').trim();

  if (cleaned.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or less`);
  }

  return cleaned;
}

module.exports = router;
