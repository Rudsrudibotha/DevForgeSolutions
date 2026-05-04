// Middleware - Audit logging

const AuditLogRepository = require('../data/auditLogRepository');

const auditLog = new AuditLogRepository();

function audit(entityName, action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = body?.InvoiceID || body?.SchoolID || body?.UserID || body?.userId ||
          body?.StudentID || body?.FamilyID || body?.EmployeeID ||
          body?.LeaveRequestID || body?.PayslipID || body?.BillingCategoryID ||
          body?.TransactionID || body?.ReconciliationMatchID ||
          req.params?.id || '-';
        auditLog.log({
          userId: req.user?.UserID || null,
          schoolId: req.user?.SchoolID || null,
          entityName,
          entityId,
          action,
          after: body,
          ipAddress: req.ip
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit, auditLog };
