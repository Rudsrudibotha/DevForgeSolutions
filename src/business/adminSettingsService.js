'use strict';

// DevForge admin settings + observability service.
// Read-only platform info (version, env, uptime) + read/write on
// PlatformSettings (with audit). Live /health probe.

const fs = require('fs');
const path = require('path');
const { getDbState } = require('../data/db');
const PlatformSettingsRepository = require('../data/platformSettingsRepository');
const AuditRepository = require('../data/auditRepository');

const SECRET_PATTERNS = /(SECRET|PASSWORD|KEY|TOKEN|CONNECTION|INSTRUMENTATION)/i;

class AdminSettingsService {
  constructor() {
    this.repo = new PlatformSettingsRepository();
    this.audit = new AuditRepository();
  }

  async getDashboard({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');

    let settings = [];
    try { settings = await this.repo.getAll(); } catch (err) { settings = [{ _error: err.message }]; }
    let health = null;
    try { health = await this._probeHealth(); } catch (err) { health = { status: 'unknown', database: { connected: false, lastError: err.message }, timestamp: new Date().toISOString() }; }
    let platform = null;
    try { platform = this._platformInfo(); } catch (err) { platform = { _error: err.message }; }
    const env = this._envSummary();
    let recentErrors = [];
    try { recentErrors = await this._recentErrors(); } catch (err) { recentErrors = []; }

    // Self-audit: viewing the settings page is logged
    try { await this.audit.recordWrite(actor, 0, 'PlatformSettings', null, 'READ', null, null, { action: 'view_dashboard' }); } catch (_) { /* audit failure must not break page render */ }

    return { settings, health, platform, env, recentErrors };
  }

  async getSetting({ actor, key }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    if (!key || !/^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/.test(key)) throw new Error('invalid key');
    const value = await this.repo.get(key).catch(err => ({ _error: err.message }));
    await this.audit.recordWrite(actor, 0, 'PlatformSettings', key, 'READ', null, null, { action: 'view_setting' });
    return value;
  }

  async updateSetting({ actor, key, value }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    if (!key || !/^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/.test(key)) throw new Error('invalid key');
    if (typeof value !== 'string' || value.length > 1000) throw new Error('invalid value');
    const before = await this.repo.get(key).catch(() => null);
    await this.repo.set(key, value, actor);
    await this.audit.recordWrite(actor, 0, 'PlatformSettings', key, 'UPDATE', before, { SettingValue: value }, { action: 'update_setting' });
    return { SettingKey: key, SettingValue: value, Description: before ? before.Description : null, UpdatedAt: new Date(), UpdatedBy: actor.email || null };
  }

  _platformInfo() {
    let version = 'unknown';
    let deps = 0;
    try {
      const pkg = require(path.resolve(__dirname, '..', '..', 'package.json'));
      version = pkg.version;
      deps = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0;
    } catch (_) {}
    return {
      version,
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      uptimeHuman: humanUptime(process.uptime()),
      env: process.env.NODE_ENV || 'development',
      deps,
      pid: process.pid,
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
    };
  }

  _envSummary() {
    const seen = new Set();
    const out = [];
    const interesting = [
      'NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'DISABLE_AUTH',
      'DISABLE_APPINSIGHTS', 'APPINSIGHTS_INSTRUMENTATIONKEY', 'APPLICATIONINSIGHTS_CONNECTION_STRING',
      'APPINSIGHTS_CLOUD_ROLE', 'APP_VERSION', 'TRUST_PROXY',
      'CORS_ORIGIN', 'SESSION_SECRET', 'SMTP_HOST', 'SMTP_USER'
    ];
    for (const k of interesting) {
      if (process.env[k] != null) {
        const isSecret = SECRET_PATTERNS.test(k) && !['DISABLE_AUTH', 'DISABLE_APPINSIGHTS', 'NODE_ENV', 'TRUST_PROXY'].includes(k);
        out.push({ key: k, value: isSecret ? '***REDACTED***' : String(process.env[k]), redacted: isSecret });
      }
    }
    return out;
  }

  async _probeHealth() {
    const db = getDbState();
    return {
      status: db.connected ? 'healthy' : 'degraded',
      database: { connected: db.connected, lastError: db.lastError || null },
      timestamp: new Date().toISOString()
    };
  }

  async _recentErrors() {
    // Read the most recent WRITE/SUSPEND/ACTIVATE events from the audit log
    // as a proxy for "things happening on the platform". Real error events
    // would come from Application Insights; we surface audit writes as
    // a useful signal without requiring AI to be configured.
    const { ScopedDb } = require('../data/scopedDb');
    const sdb = new ScopedDb({ id: 0, role: 'admin' });
    sdb.bypass('admin recent events feed');
    const request = await sdb.request();
    const result = await request.query(`
      SELECT TOP 10 AuditID, Action, ResourceType, ResourceID, OccurredAt, ActorEmail, SchoolID
      FROM AuditLog
      WHERE Action IN ('WRITE', 'CREATE', 'UPDATE', 'DELETE', 'SUSPEND', 'ACTIVATE', 'LOGIN_FAIL')
      ORDER BY OccurredAt DESC
    `);
    return result.recordset;
  }
}

function humanUptime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  return `${Math.round(seconds / 86400)}d ${Math.round((seconds % 86400) / 3600)}h`;
}

module.exports = AdminSettingsService;
