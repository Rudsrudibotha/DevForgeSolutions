// Data Layer - KCH messaging contacts. Answers "who is this user
// allowed to start a conversation with?" per role:
//   - school staff: parents linked to their school, other staff of the
//     same school, and DevForge support
//   - parents: staff of their active school
//   - DevForge admins: school staff and parents platform-wide
// Every school-scoped query filters by SchoolID; the service layer
// re-validates the chosen target through findContact before any
// conversation is created (tenant isolation).

const { getPool, sql } = require('./db');

const CONTACT_LIMIT = 50;

function likeTerm(q) {
  if (!q || !String(q).trim()) return null;
  return '%' + String(q).trim().replace(/[%_]/g, '\\$&') + '%';
}

class KchContactRepository {
  // Parents linked to the school + staff of the school + DevForge support.
  async listForSchoolUser({ schoolId, userId, q, limit = CONTACT_LIMIT } = {}) {
    const pool = await getPool();
    const request = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, Math.min(CONTACT_LIMIT, Math.max(1, limit)));
    const term = likeTerm(q);
    if (term) request.input('q', sql.NVarChar, term);
    const search = term
      ? `AND (u.Email LIKE @q OR u.Username LIKE @q OR ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') LIKE @q)`
      : '';
    const result = await request.query(`
      SELECT TOP (@limit) * FROM (
        SELECT DISTINCT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               'parent' AS ContactRole, pl.SchoolID AS ContactSchoolId, NULL AS SchoolName
        FROM dbo.ParentLinks pl
        INNER JOIN dbo.Users u ON u.UserID = pl.UserID
        WHERE pl.SchoolID = @schoolId AND u.Role = 'parent' AND ISNULL(u.IsActive, 1) = 1 ${search}
        UNION ALL
        SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               'school' AS ContactRole, u.SchoolID AS ContactSchoolId, NULL AS SchoolName
        FROM dbo.Users u
        WHERE u.SchoolID = @schoolId AND u.Role = 'school' AND u.UserID <> @userId AND ISNULL(u.IsActive, 1) = 1 ${search}
        UNION ALL
        SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               'admin' AS ContactRole, NULL AS ContactSchoolId, NULL AS SchoolName
        FROM dbo.Users u
        WHERE u.Role = 'admin' AND u.SchoolID IS NULL AND ISNULL(u.IsActive, 1) = 1 ${search}
      ) contacts
      ORDER BY ContactRole, FirstName, LastName, Username
    `);
    return result.recordset;
  }

  // Staff of the parent's active school.
  async listForParentUser({ schoolId, q, limit = CONTACT_LIMIT } = {}) {
    const pool = await getPool();
    const request = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('limit', sql.Int, Math.min(CONTACT_LIMIT, Math.max(1, limit)));
    const term = likeTerm(q);
    if (term) request.input('q', sql.NVarChar, term);
    const search = term
      ? `AND (u.Email LIKE @q OR u.Username LIKE @q OR ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') LIKE @q)`
      : '';
    const result = await request.query(`
      SELECT TOP (@limit) u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
             'school' AS ContactRole, u.SchoolID AS ContactSchoolId, s.SchoolName
      FROM dbo.Users u
      INNER JOIN dbo.Schools s ON s.SchoolID = u.SchoolID
      WHERE u.SchoolID = @schoolId AND u.Role = 'school' AND ISNULL(u.IsActive, 1) = 1 ${search}
      ORDER BY u.FirstName, u.LastName, u.Username
    `);
    return result.recordset;
  }

  // School staff and parents platform-wide (DevForge support view).
  async listForAdminUser({ q, limit = CONTACT_LIMIT } = {}) {
    const pool = await getPool();
    const request = pool.request()
      .input('limit', sql.Int, Math.min(CONTACT_LIMIT, Math.max(1, limit)));
    const term = likeTerm(q);
    if (term) request.input('q', sql.NVarChar, term);
    const search = term
      ? `AND (u.Email LIKE @q OR u.Username LIKE @q OR ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') LIKE @q)`
      : '';
    const result = await request.query(`
      SELECT TOP (@limit) * FROM (
        SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               'school' AS ContactRole, u.SchoolID AS ContactSchoolId, s.SchoolName
        FROM dbo.Users u
        INNER JOIN dbo.Schools s ON s.SchoolID = u.SchoolID
        WHERE u.Role = 'school' AND ISNULL(u.IsActive, 1) = 1 ${search}
        UNION ALL
        SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               'parent' AS ContactRole, pl.SchoolID AS ContactSchoolId, s.SchoolName
        FROM dbo.Users u
        INNER JOIN dbo.ParentLinks pl ON pl.UserID = u.UserID
        INNER JOIN dbo.Schools s ON s.SchoolID = pl.SchoolID
        WHERE u.Role = 'parent' AND ISNULL(u.IsActive, 1) = 1 ${search}
      ) contacts
      ORDER BY SchoolName, ContactRole, FirstName, LastName, Username
    `);
    return result.recordset;
  }

  // Every active parent linked to the school (broadcast audience).
  async listParentsForSchool({ schoolId, limit = 2000 } = {}) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('limit', sql.Int, Math.min(5000, Math.max(1, limit)))
      .query(`
        SELECT DISTINCT TOP (@limit) u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               pl.SchoolID AS ContactSchoolId
        FROM dbo.ParentLinks pl
        INNER JOIN dbo.Users u ON u.UserID = pl.UserID
        WHERE pl.SchoolID = @schoolId AND u.Role = 'parent' AND ISNULL(u.IsActive, 1) = 1
      `);
    return result.recordset;
  }

  // Validate that targetUserId is a legitimate contact for the actor and
  // return its contact row. Returns null when the target is outside the
  // actor's allowed audience (cross-tenant attempts land here).
  async findContact({ actorRole, schoolId, userId, targetUserId }) {
    const pool = await getPool();
    const request = pool.request()
      .input('targetUserId', sql.Int, targetUserId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('userId', sql.Int, userId || null);

    let query;
    if (actorRole === 'school') {
      query = `
        SELECT TOP 1 * FROM (
          SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
                 'parent' AS ContactRole, pl.SchoolID AS ContactSchoolId
          FROM dbo.ParentLinks pl
          INNER JOIN dbo.Users u ON u.UserID = pl.UserID
          WHERE pl.SchoolID = @schoolId AND u.UserID = @targetUserId AND u.Role = 'parent' AND ISNULL(u.IsActive, 1) = 1
          UNION ALL
          SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
                 'school' AS ContactRole, u.SchoolID AS ContactSchoolId
          FROM dbo.Users u
          WHERE u.SchoolID = @schoolId AND u.UserID = @targetUserId AND u.Role = 'school'
            AND u.UserID <> @userId AND ISNULL(u.IsActive, 1) = 1
          UNION ALL
          SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
                 'admin' AS ContactRole, NULL AS ContactSchoolId
          FROM dbo.Users u
          WHERE u.UserID = @targetUserId AND u.Role = 'admin' AND u.SchoolID IS NULL AND ISNULL(u.IsActive, 1) = 1
        ) contact`;
    } else if (actorRole === 'parent') {
      query = `
        SELECT TOP 1 u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
               'school' AS ContactRole, u.SchoolID AS ContactSchoolId
        FROM dbo.Users u
        WHERE u.SchoolID = @schoolId AND u.UserID = @targetUserId AND u.Role = 'school' AND ISNULL(u.IsActive, 1) = 1`;
    } else if (actorRole === 'admin') {
      query = `
        SELECT TOP 1 * FROM (
          SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
                 'school' AS ContactRole, u.SchoolID AS ContactSchoolId
          FROM dbo.Users u
          WHERE u.UserID = @targetUserId AND u.Role = 'school' AND ISNULL(u.IsActive, 1) = 1
          UNION ALL
          SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName,
                 'parent' AS ContactRole,
                 (SELECT TOP 1 pl.SchoolID FROM dbo.ParentLinks pl WHERE pl.UserID = u.UserID ORDER BY pl.ParentLinkID DESC) AS ContactSchoolId
          FROM dbo.Users u
          WHERE u.UserID = @targetUserId AND u.Role = 'parent' AND ISNULL(u.IsActive, 1) = 1
        ) contact`;
    } else {
      return null;
    }

    const result = await request.query(query);
    return result.recordset[0] || null;
  }
}

module.exports = { KchContactRepository };
