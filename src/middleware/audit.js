// Middleware - Audit logging
// SECURITY (H9): never persist the entire response body. The body may
// contain PII, password hashes, JWT tokens, or other sensitive fields.
// We only persist a small allow-list of identifiers + status.

const AuditLogRepository = require('../data/auditLogRepository');

const auditLog = new AuditLogRepository();

// Field allow-list. Anything else is dropped before persistence.
const ENTITY_ID_FIELDS = [
  'InvoiceID', 'SchoolID', 'UserID', 'userId', 'StudentID', 'FamilyID',
  'EmployeeID', 'LeaveRequestID', 'PayslipID', 'BillingCategoryID',
  'TransactionID', 'ReconciliationMatchID', 'FinancePeriodLockID',
  'BroadcastAnnouncementId', 'ConversationId', 'MessageId',
  'MessageAttachmentId', 'FaultReportId', 'AIRequestLogId', 'BackgroundJobId'
];

const AUDITABLE_FIELDS = [
  'id', 'status', 'isActive', 'IsActive', 'createdAt', 'updatedAt',
  'subscriptionPlanId', 'tenantSubscriptionId', 'planCode', 'planName'
];

function pickSafe(body) {
  if (!body || typeof body !== 'object') return { status: undefined };
  const out = { status: body.status };
  for (const k of AUDITABLE_FIELDS) {
    if (body[k] !== undefined && out[k] === undefined) out[k] = body[k];
  }
  return out;
}

function pickEntityId(body, params) {
  if (!body || typeof body !== 'object') {
    return params?.id || '-';
  }
  for (const k of ENTITY_ID_FIELDS) {
    if (body[k] !== undefined && body[k] !== null) return body[k];
  }
  return params?.id || '-';
}

function audit(entityName, action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = pickEntityId(body, req.params);
          const safeAfter = pickSafe(body);
          auditLog.log({
            userId: req.user?.UserID || null,
            schoolId: req.user?.SchoolID || null, // never trust body
            tenantId: req.user?.tenantId || null,
            entityName,
            entityId,
            action,
            after: safeAfter,
            ipAddress: req.ip
          });
        } catch (e) {
          // Audit logging must never break the request
          console.warn('[audit] failed to write audit log:', e.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit, auditLog };
