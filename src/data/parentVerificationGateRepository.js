// Parent invite + verification helper. Used by:
//   - the school-initiated invite flow (/sms/families/:id/invite-parent)
//   - the student-creation gate (must have at least one verified parent)
//
// Verified = Users.IsVerified = 1 (set by parentVerificationService
// when both email + cellphone are confirmed). Linked to the family =
// a row in dbo.ParentLinks. We deliberately do NOT count users that
// were auto-created by syncParentsForFamily; only users created via
// the verification flow (or upgraded by it) count.

'use strict';

const { getPool, sql } = require('./db');

async function countVerifiedParentsForFamily({ schoolId, familyId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT COUNT(*) AS cnt
      FROM dbo.ParentLinks pl
      INNER JOIN dbo.Users u ON u.UserID = pl.UserID
      WHERE pl.SchoolID = @schoolId
        AND pl.FamilyID = @familyId
        AND u.Role <> 'admin'
        AND u.IsActive = 1
        AND u.IsVerified = 1
    `);
  return r.recordset[0] ? Number(r.recordset[0].cnt) : 0;
}

async function hasVerifiedParent({ schoolId, familyId }) {
  const n = await countVerifiedParentsForFamily({ schoolId, familyId });
  return n > 0;
}

async function listParentsForFamily({ schoolId, familyId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT pl.ParentLinkId, pl.CreatedAt,
             u.UserID, u.Email, u.IsActive, u.IsVerified, u.VerifiedAt
      FROM dbo.ParentLinks pl
      INNER JOIN dbo.Users u ON u.UserID = pl.UserID
      WHERE pl.SchoolID = @schoolId AND pl.FamilyID = @familyId
      ORDER BY pl.CreatedAt ASC
    `);
  return r.recordset;
}

async function listPendingInvitationsForFamily({ schoolId, familyId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT ParentInvitationId, Email, Cellphone, Status, ExpiresAt, AcceptedAt, CreatedAt
      FROM dbo.ParentInvitations
      WHERE SchoolId = @schoolId AND FamilyId = @familyId AND Status = 'Pending'
      ORDER BY CreatedAt DESC
    `);
  return r.recordset;
}

module.exports = {
  countVerifiedParentsForFamily,
  hasVerifiedParent,
  listParentsForFamily,
  listPendingInvitationsForFamily
};
