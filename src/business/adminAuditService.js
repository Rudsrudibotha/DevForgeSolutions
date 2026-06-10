'use strict';

// DevForge admin audit log service. Read-only, paged, with rich filters.
// Every list operation audit-logs the *act of viewing* the audit log
// (so admins can see who is looking at the audit log).

const { sql } = require('../data/db');
const { ScopedDb } = require('../data/scopedDb');
const AuditRepository = require('../data/auditRepository');

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
const VALID_ACTIONS = ['READ', 'WRITE', 'CREATE', 'UPDATE', 'DELETE', 'SUSPEND', 'ACTIVATE', 'LOGIN', 'LOGOUT', 'LOGIN_FAIL', 'EXPORT'];

class AdminAuditService {
  constructor() {}

  async list({ actor, schoolId, actorUserId, actorEmail, action, resourceType, resourceId, from, to, page, pageSize } = {}) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const audit = new AuditRepository();
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;
    const safeFrom = parseDate(from);
    const safeTo = parseDate(to);

    // Use the new AuditLog table directly so we can add payload text + JSON parse
    // + JOIN users. The repo's list() doesn't expose the email filter, so we
    // build it here. We bypass ScopedDb because the audit log itself is
    // global — there's no per-school scope to enforce.
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin audit log view');
    const request = await sdb.request();

    const where = ['1 = 1'];
    if (schoolId && Number.isInteger(Number(schoolId))) { request.input('schoolId', sql.Int, Number(schoolId)); where.push('a.SchoolID = @schoolId'); }
    if (actorUserId && Number.isInteger(Number(actorUserId))) { request.input('actorUserId', sql.Int, Number(actorUserId)); where.push('a.ActorUserID = @actorUserId'); }
    if (actorEmail && String(actorEmail).trim().length > 0) { request.input('actorEmail', sql.NVarChar, '%' + String(actorEmail).trim() + '%'); where.push('a.ActorEmail LIKE @actorEmail'); }
    if (action && VALID_ACTIONS.includes(action)) { request.input('action', sql.NVarChar, action); where.push('a.Action = @action'); }
    if (resourceType) { request.input('resourceType', sql.NVarChar, resourceType); where.push('a.ResourceType = @resourceType'); }
    if (resourceId) { request.input('resourceId', sql.NVarChar, String(resourceId)); where.push('a.ResourceID = @resourceId'); }
    if (safeFrom) { request.input('from', sql.DateTime2, new Date(safeFrom + 'T00:00:00.000Z')); where.push('a.OccurredAt >= @from'); }
    if (safeTo) { request.input('to', sql.DateTime2, new Date(safeTo + 'T23:59:59.999Z')); where.push('a.OccurredAt <= @to'); }

    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const text = `
      SELECT
        a.AuditID, a.Action, a.ResourceType, a.ResourceID, a.Payload, a.OccurredAt,
        a.ActorUserID, a.ActorRole, a.ActorEmail, a.SchoolID,
        s.SchoolName,
        u.Username AS ActorUsername
      FROM AuditLog a
      LEFT JOIN Schools s ON s.SchoolID = a.SchoolID
      LEFT JOIN Users   u ON u.UserID = a.ActorUserID
      WHERE ${where.join(' AND ')}
      ORDER BY a.OccurredAt DESC, a.AuditID DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);

    // Count
    const countRequest = await sdb.request();
    const countWhere = ['1 = 1'];
    if (schoolId && Number.isInteger(Number(schoolId))) { countRequest.input('schoolId', sql.Int, Number(schoolId)); countWhere.push('a.SchoolID = @schoolId'); }
    if (actorUserId && Number.isInteger(Number(actorUserId))) { countRequest.input('actorUserId', sql.Int, Number(actorUserId)); countWhere.push('a.ActorUserID = @actorUserId'); }
    if (actorEmail && String(actorEmail).trim().length > 0) { countRequest.input('actorEmail', sql.NVarChar, '%' + String(actorEmail).trim() + '%'); countWhere.push('a.ActorEmail LIKE @actorEmail'); }
    if (action && VALID_ACTIONS.includes(action)) { countRequest.input('action', sql.NVarChar, action); countWhere.push('a.Action = @action'); }
    if (resourceType) { countRequest.input('resourceType', sql.NVarChar, resourceType); countWhere.push('a.ResourceType = @resourceType'); }
    if (resourceId) { countRequest.input('resourceId', sql.NVarChar, String(resourceId)); countWhere.push('a.ResourceID = @resourceId'); }
    if (safeFrom) { countRequest.input('from', sql.DateTime2, new Date(safeFrom + 'T00:00:00.000Z')); countWhere.push('a.OccurredAt >= @from'); }
    if (safeTo) { countRequest.input('to', sql.DateTime2, new Date(safeTo + 'T23:59:59.999Z')); countWhere.push('a.OccurredAt <= @to'); }
    const countText = `SELECT COUNT(*) AS Total FROM AuditLog a WHERE ${countWhere.join(' AND ')}`;
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    // Self-audit: log that an admin viewed the audit log
    await audit.recordWrite(actor, 0, 'AuditLog', null, 'READ', null, null, { filters: { schoolId: schoolId || null, actorUserId: actorUserId || null, action: action || null, resourceType: resourceType || null, resourceId: resourceId || null, from: safeFrom, to: safeTo }, resultCount: result.recordset.length });

    return {
      rows: result.recordset.map(parsePayload),
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      filters: {
        schoolId: schoolId || '',
        actorUserId: actorUserId || '',
        actorEmail: actorEmail || '',
        action: action || '',
        resourceType: resourceType || '',
        resourceId: resourceId || '',
        from: safeFrom || '',
        to: safeTo || ''
      }
    };
  }

  async listSchools({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin school picker for audit filter');
    const request = await sdb.request();
    const text = `SELECT SchoolID, SchoolName FROM Schools ORDER BY SchoolName`;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  async listActions() { return VALID_ACTIONS; }
  async listResourceTypes({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin resource-type picker for audit filter');
    const request = await sdb.request();
    const text = `SELECT DISTINCT ResourceType FROM AuditLog WHERE ResourceType IS NOT NULL ORDER BY ResourceType`;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset.map(r => r.ResourceType);
  }
}

function parsePayload(row) {
  if (row && typeof row.Payload === 'string' && row.Payload.length > 0) {
    try { row.PayloadParsed = JSON.parse(row.Payload); }
    catch (_) { row.PayloadParsed = null; row.PayloadRaw = row.Payload; }
  } else {
    row.PayloadParsed = null;
  }
  return row;
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = AdminAuditService;
