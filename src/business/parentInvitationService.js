// Business Layer - School-initiated parent invitation flow.
//
// School operators invite a parent by entering their email and cellphone
// at /sms/families/:id/invite-parent. We:
//   1. Insert a row into dbo.ParentInvitations
//   2. Send an email with a one-time link to /parent/verify?invite=...
//   3. Parent completes email + cellphone 2FA via the existing
//      parentVerificationService flow
//   4. On completion, the user is created (or upgraded) and a
//      ParentLinks row is created against the family
//
// Until that happens, the family is considered "incomplete" and the
// student-creation gate will reject new students.

'use strict';

const crypto = require('crypto');
const { getPool, sql } = require('../data/db');
const NotificationService = require('./notificationService');

const notifications = new NotificationService();
const INVITE_TTL_HOURS = 48;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(s) {
  return String(s || '').trim().toLowerCase();
}

function normalizeCellphone(s) {
  return String(s || '').replace(/[^\d+]/g, '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function createInvitation({ schoolId, familyId, email, cellphone, invitedByUserId }) {
  const e = normalizeEmail(email);
  const c = normalizeCellphone(cellphone);
  if (!e || !isValidEmail(e)) {
    return { ok: false, status: 400, body: { error: 'valid-email-required' } };
  }
  if (!c || c.length < 7) {
    return { ok: false, status: 400, body: { error: 'valid-cellphone-required' } };
  }
  if (!Number.isInteger(Number(schoolId)) || Number(schoolId) <= 0) {
    return { ok: false, status: 400, body: { error: 'school-required' } };
  }
  if (!Number.isInteger(Number(familyId)) || Number(familyId) <= 0) {
    return { ok: false, status: 400, body: { error: 'family-required' } };
  }

  const pool = await getPool();
  const familyRow = await pool.request()
    .input('familyId', sql.Int, familyId)
    .input('schoolId', sql.Int, schoolId)
    .query(`SELECT FamilyID, SchoolID, FamilyName FROM dbo.Families WHERE FamilyID = @familyId AND SchoolID = @schoolId AND IsDeleted = 0`);
  if (!familyRow.recordset[0]) {
    return { ok: false, status: 404, body: { error: 'family-not-found' } };
  }

  // Reject duplicates: another pending invite for the same family + email
  const dup = await pool.request()
    .input('familyId', sql.Int, familyId)
    .input('email', sql.NVarChar, e)
    .query(`
      SELECT TOP 1 ParentInvitationId
      FROM dbo.ParentInvitations
      WHERE FamilyId = @familyId
        AND LOWER(LTRIM(RTRIM(Email))) = @email
        AND Status = 'Pending'
        AND ExpiresAt > SYSUTCDATETIME()
    `);
  if (dup.recordset[0]) {
    return { ok: false, status: 409, body: { error: 'invitation-already-pending' } };
  }

  // Also reject if the email already belongs to a verified parent on this family
  const alreadyLinked = await pool.request()
    .input('familyId', sql.Int, familyId)
    .input('email', sql.NVarChar, e)
    .query(`
      SELECT TOP 1 pl.ParentLinkId
      FROM dbo.ParentLinks pl
      INNER JOIN dbo.Users u ON u.UserID = pl.UserID
      WHERE pl.FamilyID = @familyId
        AND LOWER(LTRIM(RTRIM(u.Email))) = @email
        AND u.IsVerified = 1
    `);
  if (alreadyLinked.recordset[0]) {
    return { ok: false, status: 409, body: { error: 'parent-already-verified' } };
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const insert = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('familyId', sql.Int, familyId)
    .input('email', sql.NVarChar, e)
    .input('cellphone', sql.NVarChar, c)
    .input('invitedByUserId', sql.Int, invitedByUserId)
    .input('tokenHash', sql.NVarChar, tokenHash)
    .input('expiresAt', sql.DateTime2, expiresAt)
    .query(`
      INSERT INTO dbo.ParentInvitations
        (SchoolId, FamilyId, Email, Cellphone, InvitedByUserId, TokenHash, Status, ExpiresAt, CreatedAt)
      OUTPUT inserted.ParentInvitationId
      VALUES
        (@schoolId, @familyId, @email, @cellphone, @invitedByUserId, @tokenHash, 'Pending', @expiresAt, SYSUTCDATETIME())
    `);

  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const acceptLink = `${baseUrl}/parent-verify?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(e)}&family=${familyId}`;
  await notifications.sendEmail(
    e,
    'You are invited to the Kinder Care Hub parent portal',
    `<p>You have been invited to be a parent at ${familyRow.recordset[0].FamilyName}.</p>
     <p>Click the secure link below to verify your email and cellphone (link expires in ${INVITE_TTL_HOURS} hours):</p>
     <p><a href="${acceptLink}">${acceptLink}</a></p>
     <p>If you did not expect this invite, please ignore this email.</p>`
  );

  return {
    ok: true,
    status: 201,
    body: {
      invitationId: insert.recordset[0].ParentInvitationId,
      expiresAt
    }
  };
}

async function revokeInvitation({ schoolId, familyId, invitationId }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id', sql.Int, invitationId)
    .input('familyId', sql.Int, familyId)
    .input('schoolId', sql.Int, schoolId)
    .query(`
      UPDATE dbo.ParentInvitations
        SET Status = 'Revoked'
      WHERE ParentInvitationId = @id
        AND FamilyId = @familyId
        AND SchoolId = @schoolId
        AND Status = 'Pending';
      SELECT @@ROWCOUNT AS affected;
    `);
  return r.recordset[0].affected > 0;
}

module.exports = {
  createInvitation,
  revokeInvitation,
  isValidEmail,
  normalizeEmail,
  normalizeCellphone
};
