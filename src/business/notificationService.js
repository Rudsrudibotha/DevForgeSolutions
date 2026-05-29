// Business Layer - Notification service
// Configure with EMAIL_PROVIDER=postmark or EMAIL_PROVIDER=resend.

class NotificationService {
  constructor() {
    this.provider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    this.fromEmail = process.env.EMAIL_FROM || 'Kinder Care Hub <no-reply@kindercarehub.local>';
    this.replyTo = process.env.EMAIL_REPLY_TO || null;
    this.postmarkToken = process.env.POSTMARK_SERVER_TOKEN || '';
    this.postmarkMessageStream = process.env.POSTMARK_MESSAGE_STREAM || 'outbound';
    this.resendApiKey = process.env.RESEND_API_KEY || '';

    if (!this.provider) {
      if (this.postmarkToken) this.provider = 'postmark';
      if (this.resendApiKey) this.provider = 'resend';
    }

    this.emailConfigured = (this.provider === 'postmark' && Boolean(this.postmarkToken))
      || (this.provider === 'resend' && Boolean(this.resendApiKey));
  }

  // Send an email notification. Logs to console when email is not configured.
  async sendEmail(to, subject, body, options = {}) {
    const recipients = this.recipients(to);

    if (!recipients.length) {
      return { sent: false, reason: 'No recipient' };
    }

    if (!this.emailConfigured) {
      console.log(`[Notification] Email not configured. Would send to ${to}: ${subject}`);
      return { sent: false, reason: 'Email not configured' };
    }

    if (this.provider === 'postmark') {
      return await this.sendWithPostmark(recipients, subject, body, options);
    }

    if (this.provider === 'resend') {
      return await this.sendWithResend(recipients, subject, body, options);
    }

    return { sent: false, reason: `Unsupported email provider: ${this.provider}` };
  }

  async sendWithPostmark(to, subject, body, options) {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.postmarkToken
      },
      body: JSON.stringify({
        From: options.from || this.fromEmail,
        To: to.join(','),
        ReplyTo: options.replyTo || this.replyTo || undefined,
        Subject: subject,
        TextBody: this.textBody(body),
        HtmlBody: options.html || undefined,
        MessageStream: options.messageStream || this.postmarkMessageStream
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.Message || payload.ErrorCode || 'Postmark email failed');
    }

    return { sent: true, provider: 'postmark', id: payload.MessageID || null };
  }

  async sendWithResend(to, subject, body, options) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: options.from || this.fromEmail,
        to,
        reply_to: options.replyTo || this.replyTo || undefined,
        subject,
        text: this.textBody(body),
        html: options.html || undefined
      })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || payload.error || 'Resend email failed');
    }

    return { sent: true, provider: 'resend', id: payload.id || payload.data?.id || null };
  }

  recipients(to) {
    return String(Array.isArray(to) ? to.join(',') : to || '')
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean);
  }

  textBody(body) {
    if (typeof body === 'string') {
      return body;
    }

    return String(body || '');
  }

  // Notification triggers — called from business services
  async invoiceGenerated(invoice, school) {
    return await this.sendEmail(
      school.ContactEmail,
      `Invoice ${invoice.InvoiceNumber} generated`,
      `A new invoice for ${invoice.Description} has been generated. Amount: ${invoice.Amount}`
    );
  }

  async paymentReceived(invoice, amount) {
    return await this.sendEmail(
      null, // Resolved from student/family in real implementation
      `Payment received for ${invoice.InvoiceNumber}`,
      `A payment of ${amount} has been recorded against invoice ${invoice.InvoiceNumber}.`
    );
  }

  async invoiceOverdue(invoice) {
    return await this.sendEmail(
      null,
      `Invoice ${invoice.InvoiceNumber} is overdue`,
      `Invoice ${invoice.InvoiceNumber} for ${invoice.Description} was due on ${invoice.DueDate} and is now overdue.`
    );
  }

  async leaveRequestSubmitted(leave, employee) {
    return await this.sendEmail(
      null,
      `Leave request from ${employee.FirstName} ${employee.LastName}`,
      `${employee.FirstName} has requested ${leave.Days} days of ${leave.LeaveType} leave from ${leave.StartDate} to ${leave.EndDate}.`
    );
  }

  async leaveRequestReviewed(leave, status) {
    return await this.sendEmail(
      null,
      `Your leave request has been ${status.toLowerCase()}`,
      `Your ${leave.LeaveType} leave request from ${leave.StartDate} to ${leave.EndDate} has been ${status.toLowerCase()}.`
    );
  }

  isConfigured() {
    return this.emailConfigured;
  }
}

module.exports = NotificationService;
