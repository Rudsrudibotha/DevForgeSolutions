'use strict';

// Parent-initiated payment. Creates a Transaction with AllocationStatus =
// 'PendingPayment' and updates the Invoice to 'PendingPayment'. A school
// admin later confirms receipt (against a bank reconciliation) and the
// status moves to Paid and the transaction to Allocated.
//
// This is a deliberate simplification of the full payment flow:
//   - No payment gateway integration (PaymentGatewayService is a stub).
//   - No partial payments. Full amount only.
//   - Idempotent: re-clicking the button does not create a second
//     transaction; it returns the existing PendingPayment row.
//   - Tenancy: every operation is filtered by ParentLinks so a parent
//     can never pay an invoice that is not linked to their account.

const { getPool, sql } = require('../data/db');

class ParentPaymentService {
  // Returns { ok, invoice, transaction, reason }
  // ok=false means the request was rejected; client should show a toast.
  async payInvoice(userId, invoiceId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return { ok: false, reason: 'Invalid user' };
    }
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return { ok: false, reason: 'Invalid invoice' };
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      // 1. Verify the parent actually has a ParentLink to the invoice's
      //    student AND that the school is still active. Returns the row
      //    we need to update.
      const ownershipResult = await new sql.Request(tx)
        .input('userId', sql.Int, userId)
        .input('invoiceId', sql.Int, invoiceId)
        .query(`
          SELECT i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.Status, i.SchoolID, i.StudentID
          FROM Invoices i
          INNER JOIN Students s     ON s.StudentID = i.StudentID
          INNER JOIN Families f     ON f.FamilyID = s.FamilyID
          INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID
          INNER JOIN Schools sch    ON sch.SchoolID = pl.SchoolID
          WHERE pl.UserID = @userId
            AND i.InvoiceID = @invoiceId
            AND sch.SubscriptionStatus = 'Active'
        `);

      if (ownershipResult.recordset.length === 0) {
        await tx.rollback();
        return { ok: false, reason: 'Invoice not found' };
      }

      const invoice = ownershipResult.recordset[0];

      // 2. Idempotency: if the invoice is already PendingPayment or Paid,
      //    return the existing transaction (or none) without creating a
      //    duplicate.
      if (invoice.Status === 'Paid') {
        await tx.rollback();
        return { ok: false, reason: 'Already paid', invoice };
      }
      if (invoice.Status === 'Cancelled') {
        await tx.rollback();
        return { ok: false, reason: 'This invoice has been cancelled', invoice };
      }

      const outstanding = Number(invoice.Amount) - Number(invoice.AmountPaid || 0);

      if (invoice.Status === 'PendingPayment') {
        // Already pending - return the existing transaction.
        const existingTx = await new sql.Request(tx)
          .input('invoiceId', sql.Int, invoiceId)
          .query(`SELECT TOP 1 * FROM Transactions WHERE InvoiceID = @invoiceId ORDER BY CreatedDate DESC`);
        await tx.commit();
        return { ok: true, invoice, transaction: existingTx.recordset[0] || null, alreadyPending: true };
      }

      // 3. Create a transaction. The ReceiptNumber is "PARENT-PENDING-" +
      //    timestamp + invoiceId; school-side reconciliation will rewrite
      //    this when funds clear.
      const receiptNumber = `PARENT-PENDING-${Date.now()}-${invoiceId}`;

      const txResult = await new sql.Request(tx)
        .input('schoolId',    sql.Int, invoice.SchoolID)
        .input('invoiceId',   sql.Int, invoiceId)
        .input('receiptNumber',sql.NVarChar, receiptNumber)
        .input('paymentMethod',sql.NVarChar, 'ParentInitiated')
        .input('payeeType',   sql.NVarChar, 'Parent')
        .input('payeeName',   sql.NVarChar, 'Parent claim - awaiting school confirmation')
        .input('amount',      sql.Decimal(10, 2), outstanding)
        .input('description', sql.NVarChar, `Parent marked invoice #${invoice.InvoiceNumber} as paid. Awaiting bank reconciliation.`)
        .input('reference',   sql.NVarChar, receiptNumber)
        .query(`
          INSERT INTO Transactions
            (SchoolID, InvoiceID, ReceiptNumber, PaymentMethod, PayeeType, PayeeName, Reference, Description, TransactionType, Amount, TransactionDate, AllocationStatus)
          OUTPUT INSERTED.*
          VALUES
            (@schoolId, @invoiceId, @receiptNumber, @paymentMethod, @payeeType, @payeeName, @reference, @description, 'Credit', @amount, GETDATE(), 'PendingPayment')
        `);

      // 4. Move the invoice to PendingPayment. AmountPaid is set to the
      //    outstanding amount, mirroring the eventual Paid state. School
      //    admin can adjust if needed.
      await new sql.Request(tx)
        .input('invoiceId', sql.Int, invoiceId)
        .input('amountPaid', sql.Decimal(10, 2), outstanding)
        .query(`
          UPDATE Invoices
          SET Status = 'PendingPayment',
              AmountPaid = @amountPaid,
              UpdatedDate = GETDATE()
          WHERE InvoiceID = @invoiceId
        `);

      // 5. Reload the invoice so the response includes the new status.
      const updatedResult = await new sql.Request(tx)
        .input('invoiceId', sql.Int, invoiceId)
        .query(`
          SELECT i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.Status, i.DueDate, i.SchoolID,
                 s.StudentID, s.FirstName + ' ' + s.LastName AS StudentName,
                 sch.SchoolName
          FROM Invoices i
          INNER JOIN Students s  ON s.StudentID = i.StudentID
          INNER JOIN Schools sch ON sch.SchoolID = i.SchoolID
          WHERE i.InvoiceID = @invoiceId
        `);

      await tx.commit();

      return { ok: true, invoice: updatedResult.recordset[0], transaction: txResult.recordset[0] };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      console.error('[parentPay] transaction failed:', err);
      return { ok: false, reason: err.message || 'Payment failed' };
    }
  }
}

module.exports = ParentPaymentService;
