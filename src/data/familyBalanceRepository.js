// Family running balance.
//
// "Running balance" = sum of all amounts received from the family
//                      minus sum of all amounts invoiced to the family
//                      plus sum of all financial adjustments and
//                      completed refunds against the family.
//
// If positive: the family has a credit (overpaid) -> refundable.
// If negative: the family owes money.
// If zero: settled.
//
// We deliberately query against Invoices/Transactions/Refunds/
// FinancialAdjustments tables joined on FamilyID. The StudentWallets
// table is a per-student cache of the same data; this function is
// the source of truth for the family-level view.

'use strict';

const { getPool, sql } = require('./db');

async function getFamilyRunningBalance({ schoolId, familyId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .query(`
      DECLARE @invoiced DECIMAL(18,2) = 0;
      DECLARE @received DECIMAL(18,2) = 0;
      DECLARE @adjustments DECIMAL(18,2) = 0;
      DECLARE @refunds DECIMAL(18,2) = 0;

      SELECT @invoiced = ISNULL(SUM(Amount), 0)
        FROM dbo.Invoices
        WHERE SchoolID = @schoolId
          AND FamilyID = @familyId
          AND IsDeleted = 0;

      SELECT @received = ISNULL(SUM(Amount), 0)
        FROM dbo.Transactions t
        INNER JOIN dbo.Students s ON s.StudentID = t.StudentID
        WHERE t.SchoolID = @schoolId
          AND s.FamilyID = @familyId
          AND t.IsDeleted = 0;

      SELECT @adjustments = ISNULL(SUM(
          CASE
            WHEN AdjustmentType IN ('Write-off','Debit Correction') THEN -Amount
            WHEN AdjustmentType IN ('Reversal','Credit Correction','Fee Correction') THEN Amount
            ELSE 0
          END
        ), 0)
        FROM dbo.FinancialAdjustments
        WHERE SchoolID = @schoolId
          AND FamilyID = @familyId;

      SELECT @refunds = ISNULL(SUM(Amount), 0)
        FROM dbo.Refunds
        WHERE SchoolID = @schoolId
          AND FamilyID = @familyId
          AND Status = 'Completed';

      -- Balance: (received + adjustments - refunds) - invoiced
      -- If the family has paid more than invoiced, balance is positive
      -- (i.e. credit available for refund).
      SELECT
        @invoiced AS totalInvoiced,
        @received AS totalReceived,
        @adjustments AS totalAdjustments,
        @refunds AS totalRefundsCompleted,
        (@received + @adjustments - @refunds - @invoiced) AS runningBalance;
    `);
  return r.recordset[0] || {
    totalInvoiced: 0, totalReceived: 0, totalAdjustments: 0,
    totalRefundsCompleted: 0, runningBalance: 0
  };
}

// Get running balance minus the sum of all Pending/Approved (not yet
// completed) refunds, so a school operator can see what is still
// available to refund after pending refunds.
async function getAvailableRefundBalance({ schoolId, familyId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .query(`
      DECLARE @running DECIMAL(18,2) = 0;
      DECLARE @pending DECIMAL(18,2) = 0;

      SELECT @running = ISNULL(SUM(t.Amount), 0) - ISNULL((SELECT SUM(Amount) FROM dbo.Invoices WHERE SchoolID = @schoolId AND FamilyID = @familyId AND IsDeleted = 0), 0)
                       + ISNULL((SELECT SUM(
                            CASE
                              WHEN AdjustmentType IN ('Write-off','Debit Correction') THEN -Amount
                              ELSE Amount
                            END) FROM dbo.FinancialAdjustments WHERE SchoolID = @schoolId AND FamilyID = @familyId), 0)
                       - ISNULL((SELECT SUM(Amount) FROM dbo.Refunds WHERE SchoolID = @schoolId AND FamilyID = @familyId AND Status = 'Completed'), 0)
      FROM dbo.Transactions t
      INNER JOIN dbo.Students s ON s.StudentID = t.StudentID
      WHERE t.SchoolID = @schoolId AND s.FamilyID = @familyId AND t.IsDeleted = 0;

      SELECT @pending = ISNULL(SUM(Amount), 0)
        FROM dbo.Refunds
        WHERE SchoolID = @schoolId AND FamilyID = @familyId
          AND Status IN ('Pending','Approved');

      SELECT @running AS runningBalance, @pending AS pendingRefunds,
             (@running - @pending) AS availableForRefund;
    `);
  return r.recordset[0] || { runningBalance: 0, pendingRefunds: 0, availableForRefund: 0 };
}

module.exports = {
  getFamilyRunningBalance,
  getAvailableRefundBalance
};
