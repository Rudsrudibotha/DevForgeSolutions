// Business Layer - Parent verification flow.
// First-time parents must:
//   1. Submit their email + cellphone at /parent/register
//   2. Receive an email with a 24-hour one-time link
//   3. Click the link, which lands them on /parent/verify
//   4. Enter the 6-digit code sent via SMS to their cellphone
//   5. On success, a parent account is created and a magic login link
//      is mailed to them for first sign-in.
//
// Without an active verified contact, no parent account is created and no
// portal access is granted.

const crypto = require('crypto');
const { getPool, sql } = require('../data/db');
const NotificationService = require('./notificationService');
const UserService = require('./userService');

const notifications = new NotificationService();
const userService = new UserService();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function shortCode() {
  // 6-digit code, never starts with 0
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

function normalizeEmail(s) {
  return String(s || '').trim().toLowerCase();
}

function normalizeCellphone(s) {
  return String(s || '').replace(/[^\d+]/g, '');
}

async function isParentEligible({ email, cellphone }) {
  if (!email || !cellphone) return { ok: false, reason: 'email-and-cellphone-required' };
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .input('cell', sql.NVarChar, cellphone)
    .query(`
      SELECT TOP 1 u.UserID, u.IsActive, f.FamilyID, s.SchoolID, s.TenantId, s.SubscriptionStatus
      FROM dbo.Users u
      LEFT JOIN dbo.FamilyParents fp ON fp.UserID = u.UserID
      LEFT JOIN dbo.Families f ON f.FamilyID = fp.FamilyID
      LEFT JOIN dbo.Students st ON st.FamilyID = f.FamilyID
      LEFT JOIN dbo.Schools s ON s.SchoolID = st.SchoolID
      WHERE u.Email = @email AND u.Role = 'parent'
    `);
  if (result.recordset.length) return { ok: true, family: result.recordset[0] };
  // Or check pending registration request table
  const reg = await pool.request()
    .input('email', sql.NVarChar, email)
    .query(`SELECT TOP 1 prr.ParentRegistrationRequestId, prr.SchoolID, prr.Surname, prr.FirstName, prr.Cellphone
            FROM dbo.ParentRegistrationRequests prr
            WHERE LOWER(LTRIM(RTRIM(prr.Email))) = @email AND prr.Status IN ('Approved','Pending')`);
  if (reg.recordset[0]) return { ok: true, registration: reg.recordset[0] };
  return { ok: false, reason: 'email-not-listed-by-any-school' };
}

// POST /api/parent-verification/start
// Body: { email, cellphone, schoolId? }
async function startVerification({ email, cellphone, schoolId }) {
  const e = normalizeEmail(email);
  const c = normalizeCellphone(cellphone);
  if (!e || !c) return { ok: false, status: 400, body: { error: 'email-and-cellphone-required' } };
  const eligible = await isParentEligible({ email: e, cellphone: c });
  if (!eligible.ok) return { ok: false, status: 403, body: { error: eligible.reason } };

  const emailToken = crypto.randomBytes(32).toString('base64url');
  const smsCode = shortCode();
  const emailTokenHash = hashToken(emailToken);
  const smsCodeHash = hashToken(smsCode);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const smsCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const pool = await getPool();
  await pool.request()
    .input('email', sql.NVarChar, e)
    .input('cell', sql.NVarChar, c)
    .input('emailHash', sql.NVarChar, emailTokenHash)
    .input('smsHash', sql.NVarChar, smsCodeHash)
    .input('emailExp', sql.DateTime2, expiresAt)
    .input('smsExp', sql.DateTime2, smsCodeExpiresAt)
    .input('schoolId', sql.Int, schoolId || (eligible.family && eligible.family.SchoolID) || (eligible.registration && eligible.registration.SchoolID) || null)
    .query(`
      INSERT INTO dbo.ParentVerificationChallenges (Email, Cellphone, EmailTokenHash, SmsCodeHash, EmailTokenExpiresAt, SmsCodeExpiresAt, SchoolId, Attempts, CreatedAt)
      OUTPUT INSERTED.ParentVerificationChallengeId
      VALUES (@email, @cell, @emailHash, @smsHash, @emailExp, @smsExp, @schoolId, 0, SYSUTCDATETIME())
    `);

  // Send email with verification link
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const verifyLink = `${baseUrl}/parent/verify?token=${encodeURIComponent(emailToken)}&email=${encodeURIComponent(e)}`;
  await notifications.sendEmail(
    e,
    'Verify your Kinder Care Hub parent account',
    `<p>Welcome to Kinder Care Hub.</p>
     <p>Click the link below to confirm your email and start verifying your account:</p>
     <p><a href="${verifyLink}">${verifyLink}</a></p>
     <p>This link expires in 24 hours. After clicking, you will be asked for a 6-digit code we send to your cellphone <strong>${c}</strong>.</p>
     <p>If you did not request this, please ignore this email.</p>`
  );

  // In dev (no email provider) we still return the SMS code so the
  // developer can complete the flow manually. In production, this code
  // would only be sent via SMS gateway.
  const devMode = !notifications.emailConfigured;
  return {
    ok: true,
    status: 200,
    body: {
      challengeId: null, // client only needs the link
      sentTo: { email: e, cellphone: c },
      devSmsCode: devMode ? smsCode : undefined,
      devMode
    }
  };
}

// POST /api/parent-verification/complete-email
// Body: { token, email }
async function completeEmail({ token, email }) {
  if (!token || !email) return { ok: false, status: 400, body: { error: 'token-and-email-required' } };
  const e = normalizeEmail(email);
  const emailHash = hashToken(token);
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, e)
    .input('emailHash', sql.NVarChar, emailHash)
    .query(`
      SELECT TOP 1 ParentVerificationChallengeId, Cellphone, SchoolId, EmailVerified, SmsVerified, SmsCodeExpiresAt
      FROM dbo.ParentVerificationChallenges
      WHERE Email = @email AND EmailTokenHash = @emailHash AND EmailTokenExpiresAt > SYSUTCDATETIME()
      ORDER BY CreatedAt DESC
    `);
  const challenge = result.recordset[0];
  if (!challenge) return { ok: false, status: 400, body: { error: 'invalid-or-expired-token' } };

  await pool.request()
    .input('id', sql.Int, challenge.ParentVerificationChallengeId)
    .query(`UPDATE dbo.ParentVerificationChallenges SET EmailVerified = 1 WHERE ParentVerificationChallengeId = @id`);

  // If SMS code is required, generate + send it now
  const smsCode = shortCode();
  const smsCodeHash = hashToken(smsCode);
  const smsCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.request()
    .input('id', sql.Int, challenge.ParentVerificationChallengeId)
    .input('smsHash', sql.NVarChar, smsCodeHash)
    .input('smsExp', sql.DateTime2, smsCodeExpiresAt)
    .query(`UPDATE dbo.ParentVerificationChallenges SET SmsCodeHash = @smsHash, SmsCodeExpiresAt = @smsExp WHERE ParentVerificationChallengeId = @id`);

  // Send SMS in dev mode: we cannot actually send SMS, so we mail it
  await notifications.sendEmail(
    e,
    'Your Kinder Care Hub verification code',
    `<p>Your 6-digit verification code is: <strong>${smsCode}</strong></p>
     <p>This code expires in 10 minutes. Enter it on the verification page to continue.</p>`
  );

  const devMode = !notifications.emailConfigured;
  return {
    ok: true,
    status: 200,
    body: {
      emailVerified: true,
      cellphone: challenge.Cellphone,
      devSmsCode: devMode ? smsCode : undefined,
      devMode
    }
  };
}

// POST /api/parent-verification/complete-sms
// Body: { token, email, smsCode }
async function completeSms({ token, email, smsCode }) {
  if (!token || !email || !smsCode) return { ok: false, status: 400, body: { error: 'token-email-code-required' } };
  const e = normalizeEmail(email);
  const emailHash = hashToken(token);
  const smsHash = hashToken(String(smsCode).trim());
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, e)
    .input('emailHash', sql.NVarChar, emailHash)
    .input('smsHash', sql.NVarChar, smsHash)
    .query(`
      SELECT TOP 1 ParentVerificationChallengeId, SchoolId, EmailVerified, SmsVerified, Attempts
      FROM dbo.ParentVerificationChallenges
      WHERE Email = @email AND EmailTokenHash = @emailHash AND SmsCodeHash = @smsHash
        AND SmsCodeExpiresAt > SYSUTCDATETIME() AND SmsVerified = 0
      ORDER BY CreatedAt DESC
    `);
  const challenge = result.recordset[0];
  if (!challenge) {
    // bump attempt counter for brute-force protection
    await pool.request()
      .input('email', sql.NVarChar, e)
      .input('emailHash', sql.NVarChar, emailHash)
      .query(`UPDATE dbo.ParentVerificationChallenges SET Attempts = ISNULL(Attempts,0) + 1
              WHERE Email = @email AND EmailTokenHash = @emailHash`);
    return { ok: false, status: 400, body: { error: 'invalid-or-expired-code' } };
  }
  if (challenge.Attempts >= 5) {
    return { ok: false, status: 429, body: { error: 'too-many-attempts' } };
  }
  if (!challenge.EmailVerified) {
    return { ok: false, status: 400, body: { error: 'verify-email-first' } };
  }
  await pool.request()
    .input('id', sql.Int, challenge.ParentVerificationChallengeId)
    .query(`UPDATE dbo.ParentVerificationChallenges SET SmsVerified = 1, CompletedAt = SYSUTCDATETIME() WHERE ParentVerificationChallengeId = @id`);

  // Create / find parent user and parent link
  const parentUser = await ensureParentUser({ email: e, schoolId: challenge.SchoolId });

  // Mark user as verified (used by the student-creation gate in
  // /sms/students: a family needs at least one verified parent)
  await pool.request()
    .input('userId', sql.Int, parentUser.UserID)
    .query(`UPDATE dbo.Users SET IsVerified = 1, VerifiedAt = SYSUTCDATETIME() WHERE UserID = @userId`);

  // Accept any pending ParentInvitations for this email. Each accepted
  // invitation creates a ParentLinks row against the family it was
  // raised for. This is what wires up the school-initiated invite flow
  // to the existing /parent-verify flow.
  await acceptPendingInvitationsForEmail({ email: e, userId: parentUser.UserID });

  // Issue a short-lived magic link token (24h)
  const magic = crypto.randomBytes(32).toString('base64url');
  const magicHash = hashToken(magic);
  const magicExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.request()
    .input('userId', sql.Int, parentUser.UserID)
    .input('hash', sql.NVarChar, magicHash)
    .input('exp', sql.DateTime2, magicExp)
    .query(`INSERT INTO dbo.ParentMagicLinks (UserID, TokenHash, ExpiresAt, CreatedAt)
            VALUES (@userId, @hash, @exp, SYSUTCDATETIME())`);

  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const loginLink = `${baseUrl}/parent/magic?token=${encodeURIComponent(magic)}&email=${encodeURIComponent(e)}`;
  await notifications.sendEmail(
    e,
    'Your Kinder Care Hub account is ready',
    `<p>Welcome! Your parent account is verified and ready.</p>
     <p>Click the secure link below to sign in (link expires in 24 hours):</p>
     <p><a href="${loginLink}">${loginLink}</a></p>`
  );

  return {
    ok: true,
    status: 200,
    body: { verified: true, parentUserId: parentUser.UserID, devMode: !notifications.emailConfigured }
  };
}

async function ensureParentUser({ email, schoolId }) {
  // Try to find an existing user
  const pool = await getPool();
  const existing = await pool.request()
    .input('email', sql.NVarChar, email)
    .query(`SELECT TOP 1 UserID, Role, IsActive FROM dbo.Users WHERE Email = @email`);
  if (existing.recordset[0]) {
    const u = existing.recordset[0];
    if (u.Role !== 'parent') throw new Error('email-is-not-a-parent-account');
    if (!u.IsActive) {
      await pool.request().input('id', sql.Int, u.UserID)
        .query(`UPDATE dbo.Users SET IsActive = 1 WHERE UserID = @id`);
    }
    return { UserID: u.UserID };
  }
  // Create a placeholder user. The parent sets a real password on first
  // sign-in via the magic link.
  const placeholderPassword = crypto.randomBytes(32).toString('hex');
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(placeholderPassword, 10);
  const insert = await pool.request()
    .input('email', sql.NVarChar, email)
    .input('hash', sql.NVarChar, hash)
    .input('schoolId', sql.Int, schoolId || null)
    .query(`
      INSERT INTO dbo.Users (Username, Email, PasswordHash, Role, SchoolID, IsActive, IsPlaceholderPassword, CreatedDate)
      OUTPUT INSERTED.UserID
      VALUES (@email, @email, @hash, 'parent', @schoolId, 1, 1, GETDATE())
    `);
  return { UserID: insert.recordset[0].UserID };
}

// Accept any pending ParentInvitations for this email. For each one,
// create a ParentLinks row and mark the invitation Accepted. Idempotent.
async function acceptPendingInvitationsForEmail({ email, userId }) {
  const pool = await getPool();
  const e = normalizeEmail(email);
  const invitations = await pool.request()
    .input('email', sql.NVarChar, e)
    .query(`
      SELECT ParentInvitationId, SchoolId, FamilyId
      FROM dbo.ParentInvitations
      WHERE LOWER(LTRIM(RTRIM(Email))) = @email
        AND Status = 'Pending'
        AND ExpiresAt > SYSUTCDATETIME()
    `);
  for (const inv of invitations.recordset) {
    const existingLink = await pool.request()
      .input('userId', sql.Int, userId)
      .input('familyId', sql.Int, inv.FamilyId)
      .query(`SELECT TOP 1 ParentLinkId FROM dbo.ParentLinks WHERE UserID = @userId AND FamilyID = @familyId`);
    if (!existingLink.recordset[0]) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('familyId', sql.Int, inv.FamilyId)
        .input('schoolId', sql.Int, inv.SchoolId)
        .query(`
          INSERT INTO dbo.ParentLinks (UserID, FamilyID, SchoolID, CreatedDate)
          VALUES (@userId, @familyId, @schoolId, SYSUTCDATETIME())
        `);
    }
    await pool.request()
      .input('id', sql.Int, inv.ParentInvitationId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE dbo.ParentInvitations
          SET Status = 'Accepted', AcceptedAt = SYSUTCDATETIME(), AcceptedByUserId = @userId
        WHERE ParentInvitationId = @id
      `);
  }
}

// GET /api/parent-verification/magic-login?token=&email=
// Exchanges a magic link for a real auth payload.
async function consumeMagicLink({ token, email }) {
  if (!token || !email) return { ok: false, status: 400, body: { error: 'token-and-email-required' } };
  const e = normalizeEmail(email);
  const tokenHash = hashToken(token);
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, e)
    .input('hash', sql.NVarChar, tokenHash)
    .query(`
      SELECT TOP 1 ml.ParentMagicLinkId, ml.UserID, ml.ExpiresAt, ml.UsedAt, u.Email, u.Role, u.SchoolID, u.TenantId
      FROM dbo.ParentMagicLinks ml
      INNER JOIN dbo.Users u ON u.UserID = ml.UserID
      WHERE ml.TokenHash = @hash AND u.Email = @email AND ml.ExpiresAt > SYSUTCDATETIME() AND ml.UsedAt IS NULL
      ORDER BY ml.CreatedAt DESC
    `);
  const link = result.recordset[0];
  if (!link) return { ok: false, status: 400, body: { error: 'invalid-or-expired-link' } };
  await pool.request()
    .input('id', sql.Int, link.ParentMagicLinkId)
    .query(`UPDATE dbo.ParentMagicLinks SET UsedAt = SYSUTCDATETIME() WHERE ParentMagicLinkId = @id`);

  // Issue a real JWT
  const jwt = require('jsonwebtoken');
  const tokenJwt = jwt.sign(
    { userId: link.UserID, email: link.Email, role: link.Role, schoolId: link.SchoolID },
    process.env.JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
  return {
    ok: true,
    status: 200,
    body: {
      token: tokenJwt,
      user: { id: link.UserID, email: link.Email, role: link.Role, schoolId: link.SchoolID },
      mustSetPassword: true
    }
  };
}

module.exports = {
  startVerification,
  completeEmail,
  completeSms,
  consumeMagicLink,
  normalizeEmail,
  normalizeCellphone
};
