// API Routes - Parent verification flow (email + cellphone confirmation).
// First-time parents must verify both their email and cellphone before
// they are granted access to the parent portal.

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verification = require('../business/parentVerificationService');

const challengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too-many-challenges' }
});

const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too-many-codes' }
});

// POST /api/parent-verification/start
// Body: { email, cellphone, schoolId? }
router.post('/start', challengeLimiter, async (req, res) => {
  try {
    const result = await verification.startVerification({
      email: req.body && req.body.email,
      cellphone: req.body && req.body.cellphone,
      schoolId: req.body && req.body.schoolId
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[parent-verify/start] error', err);
    res.status(500).json({ error: 'start-failed' });
  }
});

// POST /api/parent-verification/complete-email
// Body: { token, email }
router.post('/complete-email', codeLimiter, async (req, res) => {
  try {
    const result = await verification.completeEmail({
      token: req.body && req.body.token,
      email: req.body && req.body.email
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[parent-verify/email] error', err);
    res.status(500).json({ error: 'verify-failed' });
  }
});

// POST /api/parent-verification/complete-sms
// Body: { token, email, smsCode }
router.post('/complete-sms', codeLimiter, async (req, res) => {
  try {
    const result = await verification.completeSms({
      token: req.body && req.body.token,
      email: req.body && req.body.email,
      smsCode: req.body && req.body.smsCode
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[parent-verify/sms] error', err);
    res.status(500).json({ error: 'verify-failed' });
  }
});

// GET /api/parent-verification/magic?token=&email=
router.get('/magic', async (req, res) => {
  try {
    const result = await verification.consumeMagicLink({
      token: req.query.token,
      email: req.query.email
    });
    if (!result.ok) return res.status(result.status).json(result.body);
    // Set HttpOnly cookie + return payload
    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie',
      `kch_token=${encodeURIComponent(result.body.token)}; HttpOnly; Path=/; ` +
      `SameSite=Lax; Max-Age=86400${isProd ? '; Secure' : ''}`);
    res.json(result.body);
  } catch (err) {
    console.error('[parent-verify/magic] error', err);
    res.status(500).json({ error: 'magic-failed' });
  }
});

module.exports = router;
