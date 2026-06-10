// Business Layer - BuildAIAllowedContext (Task 51). Builds the minimum
// context that Gemma 3 is allowed to see. For school users: current
// tenant only. For DevForge users: cross-tenant only if the user has
// DEVFORGE_PLATFORM_ALL permission. For parent users: blocked at the
// entrypoint (handleChat). The Hostinger Gemma 3 API must never receive
// unrestricted database data.

const { getPool, sql } = require('../data/db');

// Build context for a normal chatbot question. The frontend question
// is allowed but the data is filtered.
async function BuildAIAllowedContext({ session, question }) {
  if (!session) return {};
  const ctx = {
    dashboardType: session.DashboardType,
    tenantId: session.ActiveTenantId,
    schoolId: session.ActiveSchoolId,
    userRole: session.UserRole
  };

  // School / parent dashboards get lightweight, read-only summary data
  // from the active tenant. Limit the payload to a small, sanitised set
  // so we never dump the database at the model.
  if (session.IsSchoolUser) {
    const pool = await getPool();
    const summary = await pool.request()
      .input('tenantId', sql.Int, session.ActiveTenantId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.Students WHERE SchoolID = (SELECT SchoolID FROM dbo.Schools WHERE TenantId = @tenantId AND SchoolID = @tenantId) AND IsDeleted = 0) AS StudentCount,
          (SELECT COUNT(*) FROM dbo.Families WHERE SchoolID = (SELECT SchoolID FROM dbo.Schools WHERE TenantId = @tenantId AND SchoolID = @tenantId) AND IsDeleted = 0) AS FamilyCount,
          (SELECT ISNULL(SUM(Amount - ISNULL(AmountPaid, 0)), 0) FROM dbo.Invoices WHERE SchoolID = (SELECT SchoolID FROM dbo.Schools WHERE TenantId = @tenantId AND SchoolID = @tenantId) AND Status NOT IN ('Paid', 'Cancelled')) AS OutstandingTotal
      `);
    ctx.allowedData = summary.recordset[0] || {};
  } else if (session.IsDevForgeUser) {
    // DevForge gets a platform-level summary but no per-tenant financial data.
    const pool = await getPool();
    const summary = await pool.request()
      .query(`
        SELECT (SELECT COUNT(*) FROM dbo.Tenants WHERE IsActive = 1) AS TenantCount,
               (SELECT COUNT(*) FROM dbo.Schools WHERE IsActive = 1) AS SchoolCount,
               (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 1) AS UserCount
      `);
    ctx.allowedData = summary.recordset[0] || {};
  }
  return ctx;
}

// Build context for an AI reconciliation suggestion. Includes the
// selected transaction (read from DB) and a small set of possible
// matches (invoices, family accounts). For a tenant with hundreds of
// families, this is filtered by tenant + amount before being sent.
async function buildReconciliationContext({ session, transactionId }) {
  if (!session || !transactionId) return null;
  const pool = await getPool();

  // Load transaction with tenant scope enforced.
  const tx = await pool.request()
    .input('id', sql.BigInt, transactionId)
    .input('tenantId', sql.Int, session.ActiveTenantId)
    .input('schoolId', sql.Int, session.ActiveSchoolId)
    .query(`
      SELECT BankTransactionId, TenantId, SchoolId, BankReconciliationStatementId,
             TransactionDate, PostedDate, BankEffectiveDate, Amount, Direction, Reference, Description, FITID
      FROM dbo.BankTransactions
      WHERE BankTransactionId = @id AND TenantId = @tenantId AND SchoolId = @schoolId
    `);
  const transaction = tx.recordset[0];
  if (!transaction) return null;

  // Possible matches: unpaid / partial invoices within +/- 30% of amount.
  const candidates = await pool.request()
    .input('schoolId', sql.Int, session.ActiveSchoolId)
    .input('amount', sql.Decimal(18, 2), Math.abs(Number(transaction.Amount)))
    .input('lo', sql.Decimal(18, 2), Math.abs(Number(transaction.Amount)) * 0.7)
    .input('hi', sql.Decimal(18, 2), Math.abs(Number(transaction.Amount)) * 1.3)
    .query(`
      SELECT TOP (25)
        i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.Outstanding, i.Description, i.DueDate,
        f.FamilyID, f.FamilyName, f.PrimaryParentName,
        s.StudentID, s.FirstName + ' ' + s.LastName AS StudentName
      FROM dbo.Invoices i
      INNER JOIN dbo.Students s ON s.StudentID = i.StudentID AND s.SchoolID = i.SchoolID
      INNER JOIN dbo.Families f ON f.FamilyID = s.FamilyID AND f.SchoolID = i.SchoolID
      WHERE i.SchoolID = @schoolId
        AND i.Status IN ('PendingPayment', 'Partial', 'Sent')
        AND ISNULL(i.Outstanding, i.Amount - ISNULL(i.AmountPaid, 0)) BETWEEN @lo AND @hi
      ORDER BY ABS(ISNULL(i.Outstanding, i.Amount - ISNULL(i.AmountPaid, 0)) - @amount) ASC
    `);

  return {
    dashboardType: 'SchoolManagement',
    tenantId: session.ActiveTenantId,
    schoolId: session.ActiveSchoolId,
    transaction: {
      transactionId: transaction.BankTransactionId,
      transactionDate: transaction.BankEffectiveDate || transaction.PostedDate || transaction.TransactionDate,
      amount: Number(transaction.Amount),
      reference: transaction.Reference,
      description: transaction.Description,
      direction: transaction.Direction
    },
    possibleMatches: candidates.recordset.map(c => ({
      familyId: c.FamilyID,
      invoiceId: c.InvoiceID,
      invoiceNumber: c.InvoiceNumber,
      invoiceAmount: Number(c.Amount),
      outstandingBalance: Number(c.Outstanding != null ? c.Outstanding : (c.Amount - (c.AmountPaid || 0))),
      familyName: c.FamilyName,
      parentName: c.PrimaryParentName,
      studentName: c.StudentName,
      dueDate: c.DueDate,
      previousPaymentReferences: [] // could be enhanced to fetch recent payments
    }))
  };
}

module.exports = { BuildAIAllowedContext, buildReconciliationContext };
