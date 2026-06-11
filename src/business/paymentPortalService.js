'use strict';

// Payment portal service. Scoped to school via req.schoolDb.

const { getPool, sql } = require('../data/db');

const ALLOWED_ALLOCATION = ['Unallocated', 'Allocated', 'PendingPayment'];
const ALLOWED_TYPES = ['Credit', 'Debit', 'Bank', 'Payment'];
const ALLOWED_METHODS = ['EFT', 'Cash', 'Card', 'Cheque', 'DebitOrder', 'Mobile', 'ParentInitiated', 'Other'];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class PaymentPortalService {
  constructor() {}

  // List transactions with filters
  async list({ schoolDb, allocationStatus, paymentMethod, search, from, to, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('paymentPortalService.list requires a scoped schoolId');

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;
    const safeFrom = parseDate(from);
    const safeTo = parseDate(to);

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['t.SchoolID = @schoolId'];
    if (allocationStatus && ALLOWED_ALLOCATION.includes(allocationStatus)) {
      request.input('allocationStatus', sql.NVarChar, allocationStatus);
      where.push('t.AllocationStatus = @allocationStatus');
    }
    if (paymentMethod) {
      request.input('paymentMethod', sql.NVarChar, paymentMethod);
      where.push('t.PaymentMethod = @paymentMethod');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(t.ReceiptNumber LIKE @search OR t.PayeeName LIKE @search OR t.Reference LIKE @search OR t.Description LIKE @search)');
    }
    if (safeFrom) { request.input('from', sql.Date, safeFrom); where.push('t.TransactionDate >= @from'); }
    if (safeTo)   { request.input('to', sql.Date, safeTo);     where.push('t.TransactionDate <= @to'); }

    const text = `
      SELECT
        t.TransactionID, t.ReceiptNumber, t.PaymentMethod, t.PayeeType, t.PayeeName, t.PayeePhone, t.PayeeEmail,
        t.Reference, t.Description, t.TransactionType, t.Amount, t.TransactionDate,
        t.AllocationStatus, t.InvoiceID, t.BankStatementID,
        i.InvoiceNumber, s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName
      FROM Transactions t
      LEFT JOIN Invoices i  ON i.InvoiceID = t.InvoiceID
      LEFT JOIN Students s  ON s.StudentID = i.StudentID
      LEFT JOIN Families f  ON f.FamilyID = s.FamilyID
      WHERE ${where.join(' AND ')}
      ORDER BY t.TransactionDate DESC, t.CreatedDate DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    // Count
    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    const countWhere = ['t.SchoolID = @schoolId'];
    if (allocationStatus && ALLOWED_ALLOCATION.includes(allocationStatus)) { countRequest.input('allocationStatus', sql.NVarChar, allocationStatus); countWhere.push('t.AllocationStatus = @allocationStatus'); }
    if (paymentMethod) { countRequest.input('paymentMethod', sql.NVarChar, paymentMethod); countWhere.push('t.PaymentMethod = @paymentMethod'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(t.ReceiptNumber LIKE @search OR t.PayeeName LIKE @search OR t.Reference LIKE @search OR t.Description LIKE @search)');
    }
    if (safeFrom) { countRequest.input('from', sql.Date, safeFrom); countWhere.push('t.TransactionDate >= @from'); }
    if (safeTo) { countRequest.input('to', sql.Date, safeTo); countWhere.push('t.TransactionDate <= @to'); }
    const countText = `SELECT COUNT(*) AS Total FROM Transactions t WHERE ${countWhere.join(' AND ')}`;
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    // KPIs
    let totalAllocated = 0;
    let totalUnallocated = 0;
    let totalPending = 0;
    for (const r of result.recordset) {
      if (r.AllocationStatus === 'Allocated') totalAllocated += Number(r.Amount || 0);
      else if (r.AllocationStatus === 'Unallocated') totalUnallocated += Number(r.Amount || 0);
      else if (r.AllocationStatus === 'PendingPayment') totalPending += Number(r.Amount || 0);
    }

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      kpis: { totalAllocated, totalUnallocated, totalPending, count: total },
      filters: { allocationStatus: allocationStatus || '', paymentMethod: paymentMethod || '', search: search || '', from: safeFrom || '', to: safeTo || '' }
    };
  }

  async getById({ schoolDb, transactionId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(transactionId) || transactionId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('paymentPortalService.getById requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('transactionId', sql.Int, transactionId);
    const text = `
      SELECT
        t.*,
        i.InvoiceNumber, s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName
      FROM Transactions t
      LEFT JOIN Invoices i  ON i.InvoiceID = t.InvoiceID
      LEFT JOIN Students s  ON s.StudentID = i.StudentID
      LEFT JOIN Families f  ON f.FamilyID = s.FamilyID
      WHERE t.SchoolID = @schoolId AND t.TransactionID = @transactionId
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Record a payment against an invoice. If invoiceId is given, the
  // transaction is allocated to that invoice. If not, it's created as
  // Unallocated (to be allocated later by reconciliation).
  async record({ schoolDb, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('paymentPortalService.record requires a scoped schoolId');

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive number');
    const paymentMethod = (data.paymentMethod || 'EFT').toString();
    if (data.paymentMethod && !ALLOWED_METHODS.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }
    const transactionType = data.transactionType || 'Credit';
    if (!ALLOWED_TYPES.includes(transactionType)) throw new Error('Invalid transaction type');
    const transactionDate = parseDate(data.transactionDate) || new Date().toISOString().slice(0, 10);
    const receiptNumber = (data.receiptNumber || 'RCT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()).toString().slice(0, 100);
    const allocationStatus = data.invoiceId ? 'Allocated' : 'Unallocated';

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const ins = new sql.Request(tx);
      ins.input('schoolId', sql.Int, sid);
      ins.input('invoiceId', sql.Int, data.invoiceId ? Number(data.invoiceId) : null);
      ins.input('receiptNumber', sql.NVarChar, receiptNumber);
      ins.input('paymentMethod', sql.NVarChar, paymentMethod);
      ins.input('payeeType', sql.NVarChar, (data.payeeType || '').toString().slice(0, 50) || null);
      ins.input('payeeName', sql.NVarChar, (data.payeeName || '').toString().slice(0, 255) || null);
      ins.input('payeePhone', sql.NVarChar, (data.payeePhone || '').toString().slice(0, 50) || null);
      ins.input('payeeEmail', sql.NVarChar, (data.payeeEmail || '').toString().slice(0, 255) || null);
      ins.input('reference', sql.NVarChar, (data.reference || '').toString().slice(0, 250) || null);
      ins.input('description', sql.NVarChar, (data.description || '').toString().slice(0, 500) || null);
      ins.input('transactionType', sql.NVarChar, transactionType);
      ins.input('amount', sql.Decimal(10, 2), amount);
      ins.input('transactionDate', sql.Date, transactionDate);
      ins.input('allocationStatus', sql.NVarChar, allocationStatus);

      const insText = `
        INSERT INTO Transactions
          (SchoolID, InvoiceID, ReceiptNumber, PaymentMethod, PayeeType, PayeeName, PayeePhone, PayeeEmail,
           Reference, Description, TransactionType, Amount, TransactionDate, AllocationStatus)
        OUTPUT INSERTED.TransactionID
        VALUES
          (@schoolId, @invoiceId, @receiptNumber, @paymentMethod, @payeeType, @payeeName, @payeePhone, @payeeEmail,
           @reference, @description, @transactionType, @amount, @transactionDate, @allocationStatus)
      `;
      const result = await ins.query(insText);
      const newId = result.recordset[0] ? Number(result.recordset[0].TransactionID) : null;

      // If allocated to an invoice, update the invoice's AmountPaid and Status
      if (data.invoiceId && newId) {
        const upd = new sql.Request(tx);
        upd.input('schoolId', sql.Int, sid);
        upd.input('invoiceId', sql.Int, Number(data.invoiceId));
        upd.input('amount', sql.Decimal(10, 2), amount);
        upd.input('transactionId', sql.Int, newId);
        // Look up the invoice
        const lookup = new sql.Request(tx);
        lookup.input('schoolId', sql.Int, sid);
        lookup.input('invoiceId', sql.Int, Number(data.invoiceId));
        const inv = await lookup.query(`SELECT Amount, AmountPaid, Status FROM Invoices WHERE SchoolID = @schoolId AND InvoiceID = @invoiceId AND IsDeleted = 0`);
        if (inv.recordset[0]) {
          const invRow = inv.recordset[0];
          const newAmountPaid = Number(invRow.AmountPaid || 0) + amount;
          let newStatus = invRow.Status;
          if (newAmountPaid >= Number(invRow.Amount)) {
            newStatus = 'Paid';
          } else if (newAmountPaid > 0) {
            newStatus = 'Partial';
          }
          const updText = `
            UPDATE Invoices
            SET AmountPaid = @amount + (SELECT ISNULL(AmountPaid, 0) FROM Invoices WHERE InvoiceID = @invoiceId),
                Status = @newStatus,
                PaidDate = CASE WHEN @newStatus = 'Paid' THEN CAST(GETDATE() AS DATE) ELSE PaidDate END,
                UpdatedDate = GETDATE()
            OUTPUT INSERTED.AmountPaid, INSERTED.Status
            WHERE SchoolID = @schoolId AND InvoiceID = @invoiceId AND IsDeleted = 0
          `;
          const u = new sql.Request(tx);
          u.input('schoolId', sql.Int, sid);
          u.input('invoiceId', sql.Int, Number(data.invoiceId));
          u.input('amount', sql.Decimal(10, 2), amount);
          u.input('newStatus', sql.NVarChar, newStatus);
          const updated = await u.query(updText);
          // Update the transaction's AmountPaid reference via a second update
          // (no - transaction doesn't track this; invoice does)
        }
      }

      await tx.commit();
      return { transactionId: newId, receiptNumber, allocationStatus };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }

  // Allocate an unallocated payment to a specific invoice
  async allocate({ schoolDb, transactionId, invoiceId, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(transactionId) || transactionId <= 0) return false;
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) return false;
    const sid = schoolDb.schoolId;

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Verify the transaction is in this school and is Unallocated
      const check = new sql.Request(tx);
      check.input('schoolId', sql.Int, sid);
      check.input('transactionId', sql.Int, transactionId);
      const txRow = await check.query(`SELECT Amount, AllocationStatus, InvoiceID FROM Transactions WHERE SchoolID = @schoolId AND TransactionID = @transactionId`);
      if (!txRow.recordset[0]) { await tx.rollback(); return false; }
      if (txRow.recordset[0].AllocationStatus === 'Allocated') { await tx.rollback(); return false; }

      // Verify the invoice is in this school
      const inv = new sql.Request(tx);
      inv.input('schoolId', sql.Int, sid);
      inv.input('invoiceId', sql.Int, invoiceId);
      const invRow = await inv.query(`SELECT Amount, AmountPaid, Status FROM Invoices WHERE SchoolID = @schoolId AND InvoiceID = @invoiceId AND IsDeleted = 0`);
      if (!invRow.recordset[0]) { await tx.rollback(); return false; }

      const txAmount = Number(txRow.recordset[0].Amount);
      const invAmount = Number(invRow.recordset[0].Amount);
      const invPaid = Number(invRow.recordset[0].AmountPaid || 0);
      const newPaid = invPaid + txAmount;
      let newStatus = invRow.recordset[0].Status;
      if (newPaid >= invAmount) newStatus = 'Paid';
      else if (newPaid > 0) newStatus = 'Partial';

      // Update the transaction
      const updTx = new sql.Request(tx);
      updTx.input('schoolId', sql.Int, sid);
      updTx.input('transactionId', sql.Int, transactionId);
      updTx.input('invoiceId', sql.Int, invoiceId);
      await updTx.query(`UPDATE Transactions SET InvoiceID = @invoiceId, AllocationStatus = 'Allocated', UpdatedDate = GETDATE() WHERE SchoolID = @schoolId AND TransactionID = @transactionId`);

      // Update the invoice
      const updInv = new sql.Request(tx);
      updInv.input('schoolId', sql.Int, sid);
      updInv.input('invoiceId', sql.Int, invoiceId);
      updInv.input('amount', sql.Decimal(10, 2), newPaid);
      updInv.input('newStatus', sql.NVarChar, newStatus);
      await updInv.query(`UPDATE Invoices SET AmountPaid = @amount, Status = @newStatus, PaidDate = CASE WHEN @newStatus = 'Paid' THEN CAST(GETDATE() AS DATE) ELSE PaidDate END, UpdatedDate = GETDATE() WHERE SchoolID = @schoolId AND InvoiceID = @invoiceId AND IsDeleted = 0`);

      await tx.commit();
      return true;
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = PaymentPortalService;
