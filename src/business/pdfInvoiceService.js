// Business Layer - PDF invoice / statement generator.
// Uses pdfkit (pure JS, no native deps). The generator never trusts
// client-supplied totals; the financial record is read from the DB and
// rendered into the PDF.

const PDFDocument = require('pdfkit');
const { getPool, sql } = require('../data/db');

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateOnly(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit' });
}

async function loadInvoice(invoiceId, tenantId) {
  const pool = await getPool();
  const inv = await pool.request()
    .input('id', sql.Int, Number(invoiceId))
    .input('tenantId', sql.Int, Number(tenantId || 0))
    .query(`
      SELECT i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.Description, i.IssueDate, i.DueDate, i.PaidDate, i.Status,
             i.SchoolID, i.StudentID, i.BillingCategoryID, i.TenantId,
             s.SchoolName, s.LogoUrl, s.Address, s.ContactPerson, s.ContactEmail, s.ContactPhone,
             s.BankName, s.BankAccountHolder, s.BankAccountNumber, s.BankBranchCode, s.BankAccountType,
             s.RegistrationNumber, s.VATNumber, s.CurrencyCode, s.CurrencySymbol,
             st.FirstName + ' ' + st.LastName AS StudentName,
             st.IDNumber AS StudentIdNumber,
             f.FamilyName, f.FamilyCode,
             b.CategoryName, b.Frequency,
             (SELECT TOP 1 p.PayeeName FROM dbo.Transactions p WHERE p.InvoiceID = i.InvoiceID ORDER BY p.TransactionDate DESC) AS LastPayerName
      FROM dbo.Invoices i
      INNER JOIN dbo.Schools s ON s.SchoolID = i.SchoolID
      LEFT JOIN dbo.Students st ON st.StudentID = i.StudentID
      LEFT JOIN dbo.Families f ON f.FamilyID = st.FamilyID
      LEFT JOIN dbo.BillingCategories b ON b.BillingCategoryID = i.BillingCategoryID
      WHERE i.InvoiceID = @id AND i.TenantId = @tenantId AND i.IsDeleted = 0
    `);
  return inv.recordset[0] || null;
}

async function loadTransactions(invoiceId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, Number(invoiceId))
    .query(`
      SELECT TransactionID, TransactionDate, Amount, PaymentMethod, Reference, Description, AllocationStatus
      FROM dbo.Transactions
      WHERE InvoiceID = @id
      ORDER BY TransactionDate ASC
    `);
  return result.recordset;
}

async function loadWalletLedger(invoiceId) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, Number(invoiceId))
      .query(`
        SELECT l.EntryDate, l.EntryType, l.Amount, l.BalanceAfter, l.Reference, l.Description
        FROM dbo.StudentWalletLedger l
        INNER JOIN dbo.Transactions t ON t.TransactionID = l.TransactionID
        WHERE t.InvoiceID = @id
        ORDER BY l.EntryDate ASC
      `);
    return result.recordset;
  } catch (_) {
    return [];
  }
}

// Stream the PDF directly to the Express response. Caller pipes the
// invoice id + tenantId; the generator handles the layout.
async function streamInvoicePdf({ res, invoiceId, tenantId, copyType = 'Customer' }) {
  const inv = await loadInvoice(invoiceId, tenantId);
  if (!inv) {
    res.status(404).json({ error: 'invoice-not-found' });
    return;
  }
  const transactions = await loadTransactions(invoiceId);
  const ledger = await loadWalletLedger(invoiceId);

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const filename = `${inv.InvoiceNumber || ('INV-' + inv.InvoiceID)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const currency = inv.CurrencyCode || 'ZAR';
  const symbol = inv.CurrencySymbol || 'R';

  // Header / branding
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(20).text(inv.SchoolName || 'School', margin, margin);
  doc.fillColor('#475569').font('Helvetica').fontSize(9);
  if (inv.RegistrationNumber) doc.text('Reg: ' + inv.RegistrationNumber);
  if (inv.VATNumber) doc.text('VAT: ' + inv.VATNumber);
  if (inv.Address) doc.text(inv.Address);
  if (inv.ContactPhone) doc.text('Tel: ' + inv.ContactPhone);
  if (inv.ContactEmail) doc.text('Email: ' + inv.ContactEmail);

  // Right-aligned invoice number / date
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text('TAX INVOICE', margin, margin, { width: contentWidth, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#334155')
    .text('Invoice #: ' + (inv.InvoiceNumber || ('INV-' + inv.InvoiceID)), { align: 'right' })
    .text('Status: ' + (inv.Status || 'Pending'), { align: 'right' })
    .text('Issued: ' + dateOnly(inv.IssueDate), { align: 'right' })
    .text('Due: ' + dateOnly(inv.DueDate), { align: 'right' })
    .text('Copy: ' + copyType, { align: 'right' });

  // Horizontal rule
  const top = margin + 90;
  doc.moveTo(margin, top).lineTo(pageWidth - margin, top).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

  // Bill To
  let y = top + 12;
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Bill To', margin, y);
  y += 14;
  doc.fillColor('#1E293B').font('Helvetica').fontSize(10);
  if (inv.FamilyName) { doc.text(inv.FamilyName, margin, y); y += 12; }
  if (inv.FamilyCode) { doc.fontSize(8).fillColor('#64748B').text('Family code: ' + inv.FamilyCode, margin, y); y += 10; doc.fontSize(10).fillColor('#1E293B'); }
  if (inv.StudentName) { doc.text('Student: ' + inv.StudentName, margin, y); y += 12; }
  if (inv.StudentIdNumber) { doc.fontSize(8).fillColor('#64748B').text('ID: ' + inv.StudentIdNumber, margin, y); y += 10; doc.fontSize(10).fillColor('#1E293B'); }

  // Description
  y += 14;
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Description', margin, y);
  y += 14;
  doc.fillColor('#1E293B').font('Helvetica').fontSize(10).text(inv.Description || 'School fees', margin, y, { width: contentWidth });

  // Table header
  y = doc.y + 18;
  doc.fillColor('#0F172A').rect(margin, y, contentWidth, 22).fill();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
  doc.text('Item', margin + 6, y + 6);
  doc.text('Amount (' + currency + ')', margin + contentWidth - 100, y + 6, { width: 94, align: 'right' });
  y += 26;

  // Line items
  doc.fillColor('#1E293B').font('Helvetica').fontSize(10);
  const items = [];
  if (inv.CategoryName) items.push({ label: inv.CategoryName + (inv.Frequency ? ' (' + inv.Frequency + ')' : ''), amount: Number(inv.Amount) });
  if (inv.AmountPaid && Number(inv.AmountPaid) > 0) items.push({ label: 'Paid', amount: -Number(inv.AmountPaid) });
  if (items.length === 0) items.push({ label: inv.Description || 'Invoice total', amount: Number(inv.Amount) });
  for (const it of items) {
    doc.fillColor('#1E293B').text(it.label, margin + 6, y, { width: contentWidth - 110 });
    doc.text(symbol + ' ' + money(it.amount), margin + contentWidth - 100, y, { width: 94, align: 'right' });
    y += 16;
  }

  // Totals
  y += 8;
  const totalsX = margin + contentWidth - 220;
  doc.fillColor('#64748B').font('Helvetica').fontSize(9);
  doc.text('Subtotal', totalsX, y); doc.text(symbol + ' ' + money(inv.Amount), margin + contentWidth - 100, y, { width: 94, align: 'right' });
  y += 12;
  doc.text('Paid to date', totalsX, y); doc.text('(' + symbol + ' ' + money(inv.AmountPaid || 0) + ')', margin + contentWidth - 100, y, { width: 94, align: 'right' });
  y += 14;
  const balance = Number(inv.Amount) - Number(inv.AmountPaid || 0);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11);
  doc.text('Balance due', totalsX, y); doc.text(symbol + ' ' + money(balance), margin + contentWidth - 100, y, { width: 94, align: 'right' });

  // All payments for this invoice (incoming + outgoing)
  if (transactions.length) {
    y += 26;
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Payment activity', margin, y);
    y += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
    for (const t of transactions) {
      const line = `${dateOnly(t.TransactionDate)}  ${t.PaymentMethod || ''}  ${t.Reference || ''}  ${symbol} ${money(t.Amount)}  (${t.AllocationStatus || ''})`;
      doc.text(line, margin, y, { width: contentWidth });
      y += 12;
      if (y > doc.page.height - 200) { doc.addPage(); y = margin; }
    }
  }

  // Wallet / advance ledger
  if (ledger.length) {
    if (y > doc.page.height - 200) { doc.addPage(); y = margin; }
    y += 8;
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Wallet / advance ledger', margin, y);
    y += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
    for (const l of ledger) {
      doc.text(`${dateOnly(l.EntryDate)}  ${l.EntryType}  ${symbol} ${money(l.Amount)}  bal ${symbol} ${money(l.BalanceAfter)}  ${l.Reference || ''}`, margin, y, { width: contentWidth });
      y += 12;
      if (y > doc.page.height - 160) { doc.addPage(); y = margin; }
    }
  }

  // Banking details for payment
  if (inv.BankName) {
    if (y > doc.page.height - 160) { doc.addPage(); y = margin; }
    y += 18;
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Banking details', margin, y);
    y += 14;
    doc.fillColor('#1E293B').font('Helvetica').fontSize(9);
    if (inv.BankAccountHolder) { doc.text('Account holder: ' + inv.BankAccountHolder, margin, y); y += 12; }
    if (inv.BankName) { doc.text('Bank: ' + inv.BankName, margin, y); y += 12; }
    if (inv.BankAccountNumber) { doc.text('Account number: ' + inv.BankAccountNumber, margin, y); y += 12; }
    if (inv.BankBranchCode) { doc.text('Branch code: ' + inv.BankBranchCode, margin, y); y += 12; }
    if (inv.BankAccountType) { doc.text('Account type: ' + inv.BankAccountType, margin, y); y += 12; }
    doc.fillColor('#64748B').fontSize(8).text('Please use your Family code or student ID as the payment reference.', margin, y + 8);
  }

  // Footer
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(7).text(
    'Generated by Kinder Care Hub. This document is a tax invoice. ' +
    'Keep it for your records. Contact the school for any queries.',
    margin, doc.page.height - 36, { width: contentWidth, align: 'center' });

  doc.end();
}

module.exports = { streamInvoicePdf, loadInvoice, loadTransactions, loadWalletLedger };
