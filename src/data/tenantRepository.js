// Data Layer - Tenant repository. The Tenant entity is the SaaS root of
// multi-tenant isolation. Every school, parent, staff, message, image, AI
// request, bank transaction, invoice, fault report, audit log, subscription,
// and broadcast links to a TenantId.
//
// SchoolId remains the granular link between Tenant and the legacy
// per-school data. The TenantId is the SaaS isolation key that bounds
// every authenticated query.

const { getPool, sql } = require('./db');

class TenantRepository {
  async create({ tenantName, tenantType, primaryContactUserId, status }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantName', sql.NVarChar, tenantName)
      .input('tenantType', sql.NVarChar, tenantType || 'School')
      .input('primaryContactUserId', sql.Int, primaryContactUserId || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO dbo.Tenants (TenantName, TenantType, PrimaryContactUserId, Status, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.TenantId
        VALUES (@tenantName, @tenantType, @primaryContactUserId, @status, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].TenantId;
  }

  async getById(tenantId) {
    if (!tenantId) return null;
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT TenantId, TenantName, TenantType, PrimaryContactUserId, Status, CreatedAt, UpdatedAt, IsActive
        FROM dbo.Tenants
        WHERE TenantId = @tenantId AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }

  async list({ status, page = 1, pageSize = 50 } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['IsActive = 1'];
    if (status) {
      request.input('status', sql.NVarChar, status);
      where.push('Status = @status');
    }
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    request.input('offset', sql.Int, (safePage - 1) * safeSize);
    request.input('size', sql.Int, safeSize);
    const result = await request.query(`
      SELECT TenantId, TenantName, TenantType, PrimaryContactUserId, Status, CreatedAt, UpdatedAt, IsActive
      FROM dbo.Tenants
      WHERE ${where.join(' AND ')}
      ORDER BY TenantName
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `);
    return result.recordset;
  }

  async updateStatus(tenantId, status) {
    const pool = await getPool();
    await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE dbo.Tenants
        SET Status = @status, UpdatedAt = SYSUTCDATETIME()
        WHERE TenantId = @tenantId
      `);
  }
}

module.exports = TenantRepository;
