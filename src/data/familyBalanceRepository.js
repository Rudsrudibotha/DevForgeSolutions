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
// FinancialAdjustments tables, deriving invoice family ownership
// through Students where needed. The StudentWallets
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

      SELECT @invoiced = ISNULL(SUM(i.Amount), 0)
        FROM dbo.Invoices i
        INNER JOIN dbo.Students s ON s.StudentID = i.StudentID AND s.SchoolID = i.SchoolID
        WHERE i.SchoolID = @schoolId
          AND s.FamilyID = @familyId
          AND i.IsDeleted = 0;

      SELECT @received = ISNULL(SUM(t.Amount), 0)
        FROM dbo.Transactions t
        LEFT JOIN dbo.Students s ON s.StudentID = t.StudentID AND s.SchoolID = t.SchoolID
        WHERE t.SchoolID = @schoolId
          AND (t.FamilyID = @familyId OR s.FamilyID = @familyId);

      SELECT @adjustments = ISNULL(SUM(
          CASE
            WHEN fa.AdjustmentType IN ('Write-off','Debit Correction') THEN -fa.Amount
            WHEN fa.AdjustmentType IN ('Reversal','Credit Correction','Fee Correction') THEN fa.Amount
            ELSE 0
          END
        ), 0)
        FROM dbo.FinancialAdjustments fa
        WHERE fa.SchoolID = @schoolId
          AND fa.FamilyID = @familyId;

      SELECT @refunds = ISNULL(SUM(r.Amount), 0)
        FROM dbo.Refunds r
        WHERE r.SchoolID = @schoolId
          AND r.FamilyID = @familyId
          AND r.Status = 'Completed';

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
  const running = await getFamilyRunningBalance({ schoolId, familyId });
  const pool = await getPool();
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .query(`
      DECLARE @pending DECIMAL(18,2) = 0;

      SELECT @pending = ISNULL(SUM(r.Amount), 0)
        FROM dbo.Refunds r
        WHERE r.SchoolID = @schoolId AND r.FamilyID = @familyId
          AND r.Status IN ('Pending','Approved');

      SELECT @pending AS pendingRefunds;
    `);
  const pendingRefunds = Number((r.recordset[0] && r.recordset[0].pendingRefunds) || 0);
  const runningBalance = Number(running.runningBalance || 0);
  return {
    runningBalance,
    pendingRefunds,
    availableForRefund: runningBalance - pendingRefunds
  };
}

module.exports = {
  getFamilyRunningBalance,
  getAvailableRefundBalance
};
