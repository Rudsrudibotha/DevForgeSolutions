// Business Layer - Notification service (placeholder)
// Email provider (SendGrid, SES, etc.) will be configured via SMTP_* or EMAIL_PROVIDER env vars.

class NotificationService {
  constructor() {
    this.emailConfigured = Boolean(process.env.SMTP_HOST || process.env.EMAIL_PROVIDER);
  }

  // Send an email notification. Logs to console when email is not configured.
  async sendEmail(to, subject, body) {
    if (!this.emailConfigured) {
      console.log(`[Notification] Email not configured. Would send to ${to}: ${subject}`);
      return { sent: false, reason: 'Email not configured' };
    }

    // Provider-specific send logic will be added here.
    console.log(`[Notification] Sending email to ${to}: ${subject}`);
    return { sent: true };
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
