// src/modules/consents/consents.repository.js
//
// Canonical repository for the Consents module. In production this
// is the file the service layer (and only the service layer) should
// call. It is a thin wrapper over parameterised SQL. Every read
// filters on TenantId (see architecture test
// tests/architecture/tenant-isolation-on-reads.test.js).
//
// For the duration of the migration to this module folder, the
// existing src/data/admissionsFinanceRepositories.js continues to be
// the source of truth. This file is the recommended home for
// consent-specific SQL going forward.

'use strict';

async function listForSchool(pool, { tenantId, schoolId }) {
  const r = await pool.request()
    .input('TenantId', tenantId)
    .input('SchoolId', schoolId)
    .query(`
      SELECT ConsentId, TenantId, SchoolId, StudentId, ParentUserId,
             Title, Body, Status, RespondedAt, CreatedAt
      FROM dbo.Consents
      WHERE TenantId = @TenantId AND SchoolId = @SchoolId
      ORDER BY CreatedAt DESC
    `);
  return r.recordset;
}

async function listForParent(pool, { tenantId, parentUserId }) {
  const r = await pool.request()
    .input('TenantId', tenantId)
    .input('ParentUserId', parentUserId)
    .query(`
      SELECT ConsentId, TenantId, SchoolId, StudentId, Title, Body,
             Status, RespondedAt, CreatedAt
      FROM dbo.Consents
      WHERE TenantId = @TenantId AND ParentUserId = @ParentUserId
      ORDER BY CreatedAt DESC
    `);
  return r.recordset;
}

async function create(pool, row) {
  const r = await pool.request()
    .input('TenantId', row.tenantId)
    .input('SchoolId', row.schoolId)
    .input('StudentId', row.studentId)
    .input('ParentUserId', row.parentUserId)
    .input('Title', row.title)
    .input('Body', row.body)
    .input('Status', row.status || 'Pending')
    .input('CreatedByUserId', row.createdByUserId)
    .query(`
      INSERT INTO dbo.Consents
        (TenantId, SchoolId, StudentId, ParentUserId, Title, Body,
         Status, CreatedByUserId, CreatedAt)
      OUTPUT inserted.ConsentId
      VALUES
        (@TenantId, @SchoolId, @StudentId, @ParentUserId, @Title, @Body,
         @Status, @CreatedByUserId, SYSUTCDATETIME())
    `);
  return { consentId: r.recordset[0].ConsentId };
}

async function respond(pool, { tenantId, consentId, parentUserId, status, responseNote }) {
  const r = await pool.request()
    .input('TenantId', tenantId)
    .input('ConsentId', consentId)
    .input('ParentUserId', parentUserId)
    .input('Status', status)
    .input('ResponseNote', responseNote || null)
    .query(`
      UPDATE dbo.Consents
        SET Status = @Status,
            RespondedAt = SYSUTCDATETIME(),
            ResponseNote = @ResponseNote
      WHERE ConsentId = @ConsentId
        AND TenantId = @TenantId
        AND ParentUserId = @ParentUserId
        AND Status = 'Pending';
      SELECT @@ROWCOUNT AS affected;
    `);
  return r.recordset[0].affected > 0;
}

module.exports = {
  listForSchool,
  listForParent,
  create,
  respond
};
