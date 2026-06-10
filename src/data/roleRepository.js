// Data Layer - Role + Permission + RolePermission repositories. The
// permission model is tenant-aware: the same role has different permissions
// in different tenants. RolePermission defines the per-tenant matrix.

const { getPool, sql } = require('./db');

class RoleRepository {
  async create({ roleName, roleCode, tenantId, isPlatformRole, description }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('roleName', sql.NVarChar, roleName)
      .input('roleCode', sql.NVarChar, roleCode)
      .input('tenantId', sql.Int, tenantId || null)
      .input('isPlatformRole', sql.Bit, isPlatformRole ? 1 : 0)
      .input('description', sql.NVarChar, description || null)
      .query(`
        INSERT INTO dbo.Roles (RoleName, RoleCode, TenantId, IsPlatformRole, Description, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.RoleId
        VALUES (@roleName, @roleCode, @tenantId, @isPlatformRole, @description, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].RoleId;
  }

  async getById(roleId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('roleId', sql.Int, roleId)
      .query(`
        SELECT RoleId, RoleName, RoleCode, TenantId, IsPlatformRole, Description, IsActive
        FROM dbo.Roles
        WHERE RoleId = @roleId AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }

  async listForTenant(tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT RoleId, RoleName, RoleCode, TenantId, IsPlatformRole, Description, IsActive
        FROM dbo.Roles
        WHERE (TenantId = @tenantId OR IsPlatformRole = 1) AND IsActive = 1
        ORDER BY IsPlatformRole DESC, RoleName
      `);
    return result.recordset;
  }
}

class PermissionRepository {
  async create({ permissionKey, permissionName, description }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('permissionKey', sql.NVarChar, permissionKey)
      .input('permissionName', sql.NVarChar, permissionName)
      .input('description', sql.NVarChar, description || null)
      .query(`
        INSERT INTO dbo.Permissions (PermissionKey, PermissionName, Description, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.PermissionId
        VALUES (@permissionKey, @permissionName, @description, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].PermissionId;
  }

  async getByKey(permissionKey) {
    const pool = await getPool();
    const result = await pool.request()
      .input('permissionKey', sql.NVarChar, permissionKey)
      .query(`
        SELECT PermissionId, PermissionKey, PermissionName, Description, IsActive
        FROM dbo.Permissions
        WHERE PermissionKey = @permissionKey AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }

  async listForRole(roleId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('roleId', sql.Int, roleId)
      .query(`
        SELECT p.PermissionId, p.PermissionKey, p.PermissionName, p.Description
        FROM dbo.RolePermissions rp
        INNER JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
        WHERE rp.RoleId = @roleId AND p.IsActive = 1
        ORDER BY p.PermissionKey
      `);
    return result.recordset;
  }
}

class RolePermissionRepository {
  async grant(roleId, permissionId) {
    const pool = await getPool();
    await pool.request()
      .input('roleId', sql.Int, roleId)
      .input('permissionId', sql.Int, permissionId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @roleId AND PermissionId = @permissionId)
        INSERT INTO dbo.RolePermissions (RoleId, PermissionId, CreatedAt) VALUES (@roleId, @permissionId, SYSUTCDATETIME())
      `);
  }

  async revoke(roleId, permissionId) {
    const pool = await getPool();
    await pool.request()
      .input('roleId', sql.Int, roleId)
      .input('permissionId', sql.Int, permissionId)
      .query(`
        DELETE FROM dbo.RolePermissions WHERE RoleId = @roleId AND PermissionId = @permissionId
      `);
  }

  // Returns the set of permission keys for a role in a tenant. Used by
  // the session security context.
  async getPermissionKeysForUser(userId, tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT DISTINCT p.PermissionKey
        FROM dbo.UserTenantMemberships m
        INNER JOIN dbo.RolePermissions rp ON rp.RoleId = m.RoleId
        INNER JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
        WHERE m.UserId = @userId AND m.TenantId = @tenantId AND m.IsActive = 1
          AND p.IsActive = 1
      `);
    return result.recordset.map(r => r.PermissionKey);
  }
}

module.exports = { RoleRepository, PermissionRepository, RolePermissionRepository };
