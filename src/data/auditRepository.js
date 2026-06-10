'use strict';

// Audit repository. Writes one row per admin read/write of a school that
// the admin does not belong to. Read-heavy by design; uses async fire-and-
// forget for reads so the user request is never blocked on the audit write.
// Writes (state-changing actions) are awaited and the request fails if the
// audit row cannot be written - that is intentional, we want a hard failure
// when we cannot prove who did what.

const { getPool, sql } = require('./db');

class AuditRepository {
  // Read audit: fire-and-forget. Errors are logged but do not affect the request.
  async recordReadAsync(actor, schoolId, resourceType, resourceId, meta) {
    if (!actor || actor.role !== 'admin') return; // only admin reads of foreign schools are audited
    if (!schoolId) return;

    setImmediate(() => {
      this._write('READ', actor, schoolId, resourceType, resourceId, meta).catch(err => {
        console.error('[audit] read write failed:', err.message);
      });
    });
  }

  // Write audit: awaited. Caller should treat failure as fatal.
  async recordWrite(actor, schoolId, resourceType, resourceId, action, before, after, meta) {
    if (!actor) throw new Error('audit.recordWrite: actor is required');
    if (!schoolId) throw new Error('audit.recordWrite: schoolId is required');
    return this._write(action, actor, schoolId, resourceType, resourceId, { before, after, meta });
  }

  async _write(action, actor, schoolId, resourceType, resourceId, payload) {
    const pool = await getPool();
    await pool.request()
      .input('actorUserId', sql.Int, actor.id || null)
      .input('actorRole',   sql.NVarChar, actor.role)
      .input('actorEmail',  sql.NVarChar, actor.email || null)
      .input('schoolId',    sql.Int, schoolId)
      .input('action',      sql.NVarChar, action)
      .input('resourceType',sql.NVarChar, resourceType)
      .input('resourceId',  sql.NVarChar, resourceId == null ? null : String(resourceId))
      .input('payload',     sql.NVarChar, payload ? JSON.stringify(payload) : null)
      .query(`
        INSERT INTO AuditLog
          (ActorUserID, ActorRole, ActorEmail, SchoolID, Action, ResourceType, ResourceID, Payload, OccurredAt)
        VALUES
          (@actorUserId, @actorRole, @actorEmail, @schoolId, @action, @resourceType, @resourceId, @payload, SYSUTCDATETIME())
      `);
  }

  // Query helpers for the DevForge audit UI
  async list({ schoolId, actorUserId, action, resourceType, page = 1, pageSize = 50 } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['1 = 1'];
    if (schoolId)     { request.input('schoolId', sql.Int, schoolId);     where.push('SchoolID = @schoolId'); }
    if (actorUserId)  { request.input('actorUserId', sql.Int, actorUserId); where.push('ActorUserID = @actorUserId'); }
    if (action)       { request.input('action', sql.NVarChar, action);     where.push('Action = @action'); }
    if (resourceType) { request.input('resourceType', sql.NVarChar, resourceType); where.push('ResourceType = @resourceType'); }

    const safePage = Math.max(1, Number(page) || 1);
    const safeSize = Math.min(200, Math.max(1, Number(pageSize) || 50));
    const offset = (safePage - 1) * safeSize;
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const result = await request.query(`
      SELECT
        a.AuditID, a.Action, a.ResourceType, a.ResourceID, a.Payload, a.OccurredAt,
        a.ActorUserID, a.ActorRole, a.ActorEmail, a.SchoolID,
        s.SchoolName
      FROM AuditLog a
      LEFT JOIN Schools s ON s.SchoolID = a.SchoolID
      WHERE ${where.join(' AND ')}
      ORDER BY a.OccurredAt DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `);
    return result.recordset;
  }

  async count({ schoolId, actorUserId, action, resourceType } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['1 = 1'];
    if (schoolId)     { request.input('schoolId', sql.Int, schoolId);     where.push('SchoolID = @schoolId'); }
    if (actorUserId)  { request.input('actorUserId', sql.Int, actorUserId); where.push('ActorUserID = @actorUserId'); }
    if (action)       { request.input('action', sql.NVarChar, action);     where.push('Action = @action'); }
    if (resourceType) { request.input('resourceType', sql.NVarChar, resourceType); where.push('ResourceType = @resourceType'); }
    const result = await request.query(`SELECT COUNT(*) AS Total FROM AuditLog WHERE ${where.join(' AND ')}`);
    return result.recordset[0] ? result.recordset[0].Total : 0;
  }
}

module.exports = AuditRepository;
