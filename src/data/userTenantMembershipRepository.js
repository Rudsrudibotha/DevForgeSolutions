// Data Layer - UserTenantMembership repository. Tracks which users
// belong to which tenants, with role + status. A user can have multiple
// memberships (parent at 2 schools, DevForge support across tenants).
// The active tenant is selected per-session, not stored on the user.

const { getPool, sql } = require('./db');

class UserTenantMembershipRepository {
  async create({ userId, tenantId, schoolId, roleId, status }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('roleId', sql.Int, roleId || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO dbo.UserTenantMemberships (UserId, TenantId, SchoolId, RoleId, Status, JoinedAt, IsActive)
        OUTPUT INSERTED.UserTenantMembershipId
        VALUES (@userId, @tenantId, @schoolId, @roleId, @status, SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].UserTenantMembershipId;
  }

  async getActiveMembership(userId, tenantId) {
    if (!userId || !tenantId) return null;
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT UserTenantMembershipId, UserId, TenantId, SchoolId, RoleId, Status, JoinedAt, DeactivatedAt, IsActive
        FROM dbo.UserTenantMemberships
        WHERE UserId = @userId AND TenantId = @tenantId AND IsActive = 1 AND Status = 'Active'
      `);
    return result.recordset[0] || null;
  }

  async listForUser(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT m.UserTenantMembershipId, m.UserId, m.TenantId, m.SchoolId, m.RoleId, m.Status, m.JoinedAt, m.DeactivatedAt, m.IsActive,
               t.TenantName, t.TenantType, t.Status AS TenantStatus
        FROM dbo.UserTenantMemberships m
        INNER JOIN dbo.Tenants t ON t.TenantId = m.TenantId
        WHERE m.UserId = @userId AND m.IsActive = 1
        ORDER BY m.JoinedAt DESC
      `);
    return result.recordset;
  }

  async deactivate(userTenantMembershipId, reason) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, userTenantMembershipId)
      .input('reason', sql.NVarChar, reason || null)
      .query(`
        UPDATE dbo.UserTenantMemberships
        SET IsActive = 0, Status = 'Deactivated', DeactivatedAt = SYSUTCDATETIME()
        WHERE UserTenantMembershipId = @id
      `);
  }

  async hasAccess(userId, tenantId) {
    const m = await this.getActiveMembership(userId, tenantId);
    return m !== null;
  }
}

module.exports = UserTenantMembershipRepository;
