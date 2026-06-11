'use strict';

// Bank statement portal service. Scoped to school via req.schoolDb.
// CSV parsing is intentionally simple: date, description, amount, reference.

const { getPool, sql } = require('../data/db');

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class BankStatementPortalService {
  constructor() {}

  // List uploaded statements
  async listStatements({ schoolDb, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);
    const text = `
      SELECT
        bs.BankStatementID, bs.FileName, bs.StatementDate, bs.CreatedDate,
        (SELECT COUNT(*) FROM Transactions t WHERE t.SchoolID = @schoolId AND t.BankStatementID = bs.BankStatementID) AS LineCount,
        (SELECT ISNULL(SUM(t.Amount), 0) FROM Transactions t WHERE t.SchoolID = @schoolId AND t.BankStatementID = bs.BankStatementID) AS TotalAmount,
        (SELECT COUNT(*) FROM Transactions t WHERE t.SchoolID = @schoolId AND t.BankStatementID = bs.BankStatementID AND t.InvoiceID IS NULL) AS UnmatchedCount
      FROM BankStatements bs
      WHERE bs.SchoolID = @schoolId
      ORDER BY bs.CreatedDate DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    const countResult = await countRequest.query('SELECT COUNT(*) AS Total FROM BankStatements WHERE SchoolID = @schoolId');
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return { rows: result.recordset, total, page: safePage, pageSize: safeSize, hasMore: offset + result.recordset.length < total };
  }

  async getStatement({ schoolDb, statementId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(statementId) || statementId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('statementId', sql.Int, statementId);
    const text = `SELECT * FROM BankStatements WHERE SchoolID = @schoolId AND BankStatementID = @statementId`;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  async getLines({ schoolDb, statementId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(statementId) || statementId <= 0) return [];
    const sid = schoolDb.schoolId;
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('statementId', sql.Int, statementId);
    const text = `
      SELECT t.TransactionID, t.TransactionDate, t.Amount, t.Description, t.Reference, t.PayeeName,
             t.InvoiceID, t.AllocationStatus,
             i.InvoiceNumber, s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName
      FROM Transactions t
      LEFT JOIN Invoices i  ON i.InvoiceID = t.InvoiceID
      LEFT JOIN Students s  ON s.StudentID = i.StudentID
      LEFT JOIN Families f  ON f.FamilyID = s.FamilyID
      WHERE t.SchoolID = @schoolId AND t.BankStatementID = @statementId
      ORDER BY t.TransactionDate ASC
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Parse CSV text and ingest as a new statement + transactions.
  // Expected columns (header row, any order): Date, Description, Amount, Reference
  // Amount is a positive number for credits. Sign convention is bank-statement-side.
  // Returns { statementId, linesImported, linesSkipped }.
  async ingestCSV({ schoolDb, fileName, csvText, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');
    if (!csvText || !csvText.trim()) throw new Error('CSV is empty');

    const lines = parseCSV(csvText);
    if (lines.length < 2) throw new Error('CSV must have a header and at least one row');

    const header = lines[0].map(h => h.trim().toLowerCase());
    const dateIdx = header.findIndex(h => /^(date|transaction date|posted)/.test(h));
    const descIdx = header.findIndex(h => /^(description|narration|details)/.test(h));
    const amtIdx  = header.findIndex(h => /^(amount|value|credit|debit)/.test(h));
    const refIdx  = header.findIndex(h => /^(reference|ref)/.test(h));
    if (dateIdx < 0 || descIdx < 0 || amtIdx < 0) {
      throw new Error('CSV must have Date, Description, Amount columns');
    }

    const rows = [];
    const statementDate = new Date().toISOString().slice(0, 10);
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length < 2) continue;
      const date = parseDateLoose(row[dateIdx]);
      const desc = String(row[descIdx] || '').trim().slice(0, 500);
      const amt = parseAmount(row[amtIdx]);
      const ref = refIdx >= 0 ? String(row[refIdx] || '').trim().slice(0, 250) : '';
      if (!date || !desc || !Number.isFinite(amt)) continue;
      rows.push({ date, description: desc, amount: Math.abs(amt), reference: ref });
    }
    if (rows.length === 0) throw new Error('No valid rows found in CSV');

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const stmtReq = new sql.Request(tx);
      stmtReq.input('schoolId', sql.Int, sid);
      stmtReq.input('fileName', sql.NVarChar, (fileName || 'statement.csv').slice(0, 255));
      stmtReq.input('statementDate', sql.Date, statementDate);
      stmtReq.input('rawData', sql.NVarChar, csvText.slice(0, 4000));
      const stmtResult = await stmtReq.query(`
        INSERT INTO BankStatements (SchoolID, FileName, StatementDate, RawData)
        OUTPUT INSERTED.BankStatementID
        VALUES (@schoolId, @fileName, @statementDate, @rawData)
      `);
      const statementId = Number(stmtResult.recordset[0].BankStatementID);
      let imported = 0;
      for (const r of rows) {
        const t = new sql.Request(tx);
        t.input('schoolId', sql.Int, sid);
        t.input('statementId', sql.Int, statementId);
        t.input('description', sql.NVarChar, r.description);
        t.input('amount', sql.Decimal(10, 2), r.amount);
        t.input('reference', sql.NVarChar, r.reference || null);
        t.input('transactionDate', sql.Date, r.date);
        const receiptNumber = 'BS-' + statementId + '-' + (imported + 1).toString().padStart(4, '0');
        t.input('receiptNumber', sql.NVarChar, receiptNumber);
        await t.query(`
          INSERT INTO Transactions
            (SchoolID, BankStatementID, ReceiptNumber, Description, Reference, TransactionType, Amount, TransactionDate, AllocationStatus, PaymentMethod)
          VALUES
            (@schoolId, @statementId, @receiptNumber, @description, @reference, 'Bank', @amount, @transactionDate, 'Unallocated', 'EFT')
        `);
        imported += 1;
      }
      await tx.commit();
      return { statementId, linesImported: imported, linesSkipped: lines.length - 1 - imported };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }

  // Suggest matches between an unallocated bank line and open invoices.
  // Heuristics: amount exact match, description contains invoice number or family name.
  async suggestMatches({ schoolDb, transactionId, limit }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(transactionId) || transactionId <= 0) return [];
    const sid = schoolDb.schoolId;
    const lim = Math.min(20, Math.max(1, Number(limit) || 5));

    const pool = await getPool();
    const txRow = await pool.request()
      .input('schoolId', sql.Int, sid)
      .input('transactionId', sql.Int, transactionId)
      .query('SELECT Amount, Description, Reference, AllocationStatus FROM Transactions WHERE SchoolID = @schoolId AND TransactionID = @transactionId');
    if (!txRow.recordset[0]) return [];
    const tx = txRow.recordset[0];
    if (tx.AllocationStatus !== 'Unallocated') return [];

    const candidates = await pool.request()
      .input('schoolId', sql.Int, sid)
      .input('amount', sql.Decimal(10, 2), Number(tx.Amount))
      .input('description', sql.NVarChar, '%' + String(tx.Description || '').slice(0, 100) + '%')
      .input('reference', sql.NVarChar, '%' + String(tx.Reference || '').slice(0, 100) + '%')
      .input('limit', sql.Int, lim)
      .query(`
        SELECT TOP (@limit)
          i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.DueDate, i.Status,
          (i.Amount - i.AmountPaid) AS Outstanding,
          s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName, f.PrimaryParentName,
          CASE
            WHEN (i.Amount - i.AmountPaid) = @amount THEN 100
            WHEN (i.Amount - i.AmountPaid) = @amount AND (i.InvoiceNumber LIKE '%' + @reference + '%' OR f.FamilyName LIKE @description) THEN 90
            WHEN (i.Amount - i.AmountPaid) > 0 AND i.InvoiceNumber LIKE '%' + @reference + '%' THEN 80
            ELSE 50
          END AS MatchScore
        FROM Invoices i
        LEFT JOIN Students s ON s.StudentID = i.StudentID
        LEFT JOIN Families f ON f.FamilyID = s.FamilyID
        WHERE i.SchoolID = @schoolId
          AND i.IsDeleted = 0
          AND i.Status NOT IN ('Cancelled')
          AND (i.Amount - i.AmountPaid) > 0
          AND (
            (i.Amount - i.AmountPaid) = @amount
            OR i.InvoiceNumber LIKE '%' + @reference + '%'
            OR f.FamilyName LIKE @description
          )
        ORDER BY MatchScore DESC, i.DueDate ASC
      `);
    return candidates.recordset;
  }

  async deleteStatement({ schoolDb, statementId, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(statementId) || statementId <= 0) return false;
    const sid = schoolDb.schoolId;
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Delete transactions on this statement that are Unallocated
      const delT = new sql.Request(tx);
      delT.input('schoolId', sql.Int, sid);
      delT.input('statementId', sql.Int, statementId);
      await delT.query(`DELETE FROM Transactions WHERE SchoolID = @schoolId AND BankStatementID = @statementId AND AllocationStatus = 'Unallocated' AND InvoiceID IS NULL`);
      // Delete the statement itself
      const delS = new sql.Request(tx);
      delS.input('schoolId', sql.Int, sid);
      delS.input('statementId', sql.Int, statementId);
      const r = await delS.query(`DELETE FROM BankStatements WHERE SchoolID = @schoolId AND BankStatementID = @statementId`);
      await tx.commit();
      return r.rowsAffected && r.rowsAffected[0] > 0;
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }
}

// Very small CSV parser. Handles quoted fields with embedded commas.
function parseCSV(text) {
  const lines = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\n' || c === '\r') {
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') lines.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i += 2; else i++;
        continue;
      }
      field += c; i++;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); if (row.length > 1 || row[0] !== '') lines.push(row); }
  return lines;
}

function parseDateLoose(s) {
  if (!s) return null;
  const t = String(s).trim();
  // ISO yyyy-mm-dd
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  // dd/mm/yyyy or dd-mm-yyyy
  m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}

function parseAmount(s) {
  if (s == null) return NaN;
  const cleaned = String(s).replace(/[R\s$,]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = BankStatementPortalService;
