// Business Layer - Payment gateway service (placeholder)
// Integration details (PayFast, Stripe, etc.) will be provided later.
// This service defines the interface that the payment provider adapter must implement.

class PaymentGatewayService {
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || 'none';
  }

  // Initiate a payment for an invoice. Returns a redirect URL or payment reference.
  async initiatePayment(invoice, returnUrl, cancelUrl) {
    if (this.provider === 'none') {
      throw new Error('Payment gateway is not configured. Set PAYMENT_PROVIDER in environment.');
    }

    // Provider-specific logic will be added here.
    // Expected return: { paymentUrl, paymentReference }
    throw new Error(`Payment provider '${this.provider}' is not yet implemented`);
  }

  // Verify a payment callback/webhook from the provider.
  async verifyPayment(paymentData) {
    if (this.provider === 'none') {
      throw new Error('Payment gateway is not configured');
    }

    throw new Error(`Payment provider '${this.provider}' is not yet implemented`);
  }

  // Check if the gateway is configured and available.
  isConfigured() {
    return this.provider !== 'none';
  }
}

module.exports = PaymentGatewayService;
