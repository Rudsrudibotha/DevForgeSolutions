// Application Layer - Payment gateway routes (placeholder)
// Provider-specific endpoints will be added when integration details are provided.

const express = require('express');
const PaymentGatewayService = require('../business/paymentGatewayService');
const InvoiceService = require('../business/invoiceService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const paymentGateway = new PaymentGatewayService();
const invoiceService = new InvoiceService();

// Check if payment gateway is available
router.get('/status', (req, res) => {
  res.json({ configured: paymentGateway.isConfigured(), provider: process.env.PAYMENT_PROVIDER || 'none' });
});

// SECURITY (C4): never trust user-supplied returnUrl/cancelUrl. We always
// redirect to our own portal paths so the payment provider's redirect can
// never be used as an open-redirect SSRF pivot.
function safePortalPath(input, fallbackPath) {
  if (typeof input !== 'string') return fallbackPath;
  if (!input.startsWith('/')) return fallbackPath;
  if (input.startsWith('//')) return fallbackPath; // protocol-relative
  if (input.includes('\\')) return fallbackPath;
  return input;
}

// Initiate payment for an invoice
router.post('/initiate', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(parseInt(req.body.invoiceId, 10), req.user);
    const fallback = req.user.Role === 'parent' ? '/parent/invoices' : '/sms/payments';
    const returnUrl = safePortalPath(req.body.returnUrl, fallback);
    const cancelUrl = safePortalPath(req.body.cancelUrl, fallback);
    const result = await paymentGateway.initiatePayment(invoice, returnUrl, cancelUrl);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Webhook callback from payment provider (no auth — provider calls this)
router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const result = await paymentGateway.verifyPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
