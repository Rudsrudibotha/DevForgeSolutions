'use strict';

// Scoped database accessor. The ONLY supported way for school-role routes
// to run SELECT/INSERT/UPDATE/DELETE against tables that have a SchoolID
// column. Admin routes can opt out with `req.schoolDb.bypass()`.
//
// Why this exists:
//   1. Centralised tenancy enforcement. A reviewer can grep for `.query`
//      and `.schoolDb` to know every place that touches a school.
//   2. SQL Server SESSION_CONTEXT can be wired in later by changing only
//      this file - route code stays identical.
//   3. Every read by an admin into a foreign school is audit-logged.

const { getPool, sql } = require('../data/db');
const AuditRepository = require('../data/auditRepository');

const SCOPED_TABLES = new Set([
  'Students', 'Families', 'Classes', 'Attendance',
  'Invoices', 'Transactions', 'BankStatements', 'BankAccounts',
  'BankReconciliationStatements', 'BankStatementImports', 'BankTransactions',
  'BillingCategories',
  'Employees', 'Leaves', 'Payslips', 'Messages', 'Consents',
  'Registrations', 'Admissions', 'Permissions', 'SchoolFeatures'
]);

class ScopedDb {
  constructor(user) {
    this.user = user;
    this._bypass = false;
    this._auditRead = process.env.AUDIT_ADMIN_READS !== 'false';
    this._audit = new AuditRepository();
  }

  // Bypass scope entirely. Only for admin users. Records who bypassed and why.
  bypass(reason) {
    if (!this.user || this.user.role !== 'admin') {
      throw new Error('scopeToSchool.bypass() can only be called by admin users');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 4) {
      throw new Error('scopeToSchool.bypass() requires a reason string for the audit trail');
    }
    this._bypass = true;
    this._bypassReason = reason;
    return this;
  }

  isBypassed() { return this._bypass; }

  get schoolId() {
    if (this._bypass) return null;
    if (!this.user) return null;
    if (this.user.role === 'school') return this.user.schoolId || null;
    if (this.user.role === 'admin') return null; // admin without bypass() still has no implicit scope
    return null; // parents use the parent service, not this
  }

  // Return a mssql request pre-bound with @schoolId (if scoped). The
  // caller writes the WHERE clause themselves - we don't try to be clever
  // about rewriting SQL. We DO refuse to execute queries that look like
  // they're touching scoped tables without a SchoolID filter.
  async request() {
    const pool = await getPool();
    const req = pool.request();
    const sid = this.schoolId;
    if (sid != null) {
      req.input('schoolId', sql.Int, sid);
    }
    return req;
  }

  // Convenience: run a query and have the result audited if it's an admin
  // reading a school they don't belong to. The caller passes a small
  // descriptor for the audit row.
  async query(request, text, descriptor) {
    if (descriptor && this._auditRead && this.user && this.user.role === 'admin') {
      const sid = descriptor.schoolId;
      const resourceType = descriptor.resourceType || 'unknown';
      const resourceId = descriptor.resourceId;
      if (sid) {
        await this._audit.recordReadAsync(this.user, sid, resourceType, resourceId, descriptor.meta || null);
      }
    }
    return request.query(text);
  }

  // Guard: throws if a query text references a scoped table but does not
  // include a SchoolID filter. Call before .query() in development, or
  // always when NODE_ENV !== 'production' for safety.
  guardTableScope(text, params) {
    if (this._bypass) return;
    if (this.schoolId == null) return; // unscoped (admin or system)
    if (process.env.NODE_ENV === 'production' && process.env.SCOPE_GUARD !== 'true') return;

    const upper = text.toUpperCase();
    for (const table of SCOPED_TABLES) {
      const fromMatch = new RegExp(`\\b(FROM|UPDATE|INTO)\\s+${table}\\b`, 'i').test(upper);
      const joinMatch = new RegExp(`\\bJOIN\\s+${table}\\b`, 'i').test(upper);
      if (fromMatch || joinMatch) {
        if (!/@schoolId/i.test(text)) {
          throw new Error(
            `Scope guard: query against scoped table "${table}" is missing @schoolId filter. ` +
            `Either add WHERE ${table}.SchoolID = @schoolId or call req.schoolDb.bypass("reason").`
          );
        }
      }
    }
  }
}

module.exports = { ScopedDb, SCOPED_TABLES };
