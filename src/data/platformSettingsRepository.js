'use strict';

// PlatformSettings repository. Key-value table for DevForge-managed
// platform toggles. Reads bypass ScopedDb (no per-school scope).
// Writes are awaited and audit-logged by the caller.

const { getPool, sql } = require('./db');

class PlatformSettingsRepository {
  async getAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT SettingKey, SettingValue, Description, UpdatedAt, UpdatedBy FROM dbo.PlatformSettings ORDER BY SettingKey');
    return result.recordset;
  }

  async get(key) {
    const pool = await getPool();
    const result = await pool.request()
      .input('key', sql.NVarChar, key)
      .query('SELECT SettingKey, SettingValue, Description, UpdatedAt, UpdatedBy FROM dbo.PlatformSettings WHERE SettingKey = @key');
    return result.recordset[0] || null;
  }

  async set(key, value, actor) {
    const pool = await getPool();
    await pool.request()
      .input('key', sql.NVarChar, key)
      .input('value', sql.NVarChar, value == null ? null : String(value))
      .input('actor', sql.NVarChar, actor && actor.email ? actor.email : 'system')
      .query(`
        MERGE dbo.PlatformSettings AS target
        USING (SELECT @key AS k) AS src ON target.SettingKey = src.k
        WHEN MATCHED THEN
          UPDATE SET SettingValue = @value, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = @actor
        WHEN NOT MATCHED THEN
          INSERT (SettingKey, SettingValue, UpdatedAt, UpdatedBy)
          VALUES (@key, @value, SYSUTCDATETIME(), @actor);
      `);
  }
}

module.exports = PlatformSettingsRepository;
