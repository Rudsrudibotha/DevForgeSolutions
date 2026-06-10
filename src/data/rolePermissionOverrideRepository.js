// RolePermissionOverride repository.
//
// Each row is (RoleId, PermissionKey, Decision). Used by the SMS
// /sms/permissions matrix to allow or deny individual permission
// keys for a role, on top of the default set.

'use strict';

const { getPool, sql } = require('./db');

async function listForRole(roleId) {
  const pool = await getPool();
  const r = await pool.request()
    .input('roleId', sql.Int, roleId)
    .query(`SELECT RolePermissionOverrideId, RoleId, PermissionKey, Decision, UpdatedAt
            FROM dbo.RolePermissionOverrides
            WHERE RoleId = @roleId`);
  return r.recordset;
}

async function listForRoles(roleIds) {
  if (!Array.isArray(roleIds) || !roleIds.length) return [];
  const pool = await getPool();
  const r = await pool.request()
    .query(`SELECT RolePermissionOverrideId, RoleId, PermissionKey, Decision, UpdatedAt
            FROM dbo.RolePermissionOverrides
            WHERE RoleId IN (${roleIds.map((_, i) => `@r${i}`).join(',')})`,
      roleIds.reduce((req, id, i) => req.input(`r${i}`, sql.Int, id), pool.request()));
  return r.recordset;
}

async function upsert({ roleId, permissionKey, decision }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('roleId', sql.Int, roleId)
    .input('key', sql.NVarChar, permissionKey)
    .input('decision', sql.NVarChar, decision)
    .query(`
      IF EXISTS (SELECT 1 FROM dbo.RolePermissionOverrides WHERE RoleId = @roleId AND PermissionKey = @key)
        UPDATE dbo.RolePermissionOverrides
          SET Decision = @decision, UpdatedAt = SYSUTCDATETIME()
        WHERE RoleId = @roleId AND PermissionKey = @key
      ELSE
        INSERT INTO dbo.RolePermissionOverrides (RoleId, PermissionKey, Decision, UpdatedAt)
        VALUES (@roleId, @key, @decision, SYSUTCDATETIME())
    `);
  return r.rowsAffected && r.rowsAffected[0] === 1;
}

async function bulkReplace({ roleId, decisions }) {
  // decisions = [{ permissionKey, decision }, ...]
  const pool = await getPool();
  const transaction = new (require('mssql')).Transaction(pool);
  try {
    await transaction.begin();
    // Delete then re-insert. For a single role this is small.
    const delReq = transaction.request();
    delReq.input('roleId', sql.Int, roleId);
    await delReq.query(`DELETE FROM dbo.RolePermissionOverrides WHERE RoleId = @roleId`);
    for (const d of decisions) {
      const insReq = transaction.request();
      insReq.input('roleId', sql.Int, roleId);
      insReq.input('key', sql.NVarChar, d.permissionKey);
      insReq.input('decision', sql.NVarChar, d.decision);
      await insReq.query(`
        INSERT INTO dbo.RolePermissionOverrides (RoleId, PermissionKey, Decision, UpdatedAt)
        VALUES (@roleId, @key, @decision, SYSUTCDATETIME())
      `);
    }
    await transaction.commit();
    return { ok: true, count: decisions.length };
  } catch (err) {
    try { await transaction.rollback(); } catch (_) { /* ignore */ }
    return { ok: false, error: err.message };
  }
}

module.exports = {
  listForRole,
  listForRoles,
  upsert,
  bulkReplace
};
