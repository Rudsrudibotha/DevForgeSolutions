// Application Layer - Payment gateway routes (placeholder)
// Provider-specific endpoints will be added when integration details are provided.

const express = require('express');
const PaymentGatewayService = require('../business/paymentGatewayService');
const InvoiceService = require('../business/invoiceService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const paymentGateway = new PaymentGatewayService();
const invoiceService = new InvoiceService();

// Check if payment gateway is available
router.get('/status', (req, res) => {
  res.json({ configured: paymentGateway.isConfigured(), provider: process.env.PAYMENT_PROVIDER || 'none' });
});

// Initiate payment for an invoice
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(parseInt(req.body.invoiceId, 10), req.user);
    const result = await paymentGateway.initiatePayment(
      invoice,
      req.body.returnUrl || `${req.protocol}://${req.get('host')}/sms`,
      req.body.cancelUrl || `${req.protocol}://${req.get('host')}/sms`
    );
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
