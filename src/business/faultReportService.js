const FaultReportRepository = require('../data/faultReportRepository');
const SchoolRepository = require('../data/schoolRepository');

class FaultReportService {
  constructor(dependencies = {}) {
    this.faultReportRepository = dependencies.faultReportRepository || new FaultReportRepository();
    this.schoolRepository = dependencies.schoolRepository || new SchoolRepository();
    this.allowedStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  }

  async createFaultReport(data, currentUser, requestMeta = {}) {
    const schoolId = await this.reportSchoolId(data, currentUser);

    if (!schoolId) {
      const error = new Error('School dashboard access required');
      error.statusCode = 403;
      throw error;
    }

    const payload = {
      schoolId,
      userId: currentUser.UserID,
      pagePath: this.requiredString(data?.pagePath || '/sms', 'Fault path', 500),
      viewName: this.optionalString(data?.viewName, 'View', 120),
      remarks: this.requiredString(data?.remarks, 'Fault remarks', 2000),
      userAgent: this.optionalString(requestMeta.userAgent, 'User agent', 500)
    };

    return await this.faultReportRepository.create(payload);
  }

  async reportSchoolId(data, currentUser) {
    if (!currentUser) {
      return null;
    }

    if (currentUser.Role === 'school') {
      const schoolId = Number(currentUser.SchoolID);
      return Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null;
    }

    if (currentUser.Role !== 'admin') {
      return null;
    }

    const schoolId = this.positiveInteger(data?.schoolId, 'School ID');
    const school = await this.schoolRepository.getSchoolById(schoolId);

    if (!school) {
      const error = new Error('Selected school was not found for this fault report');
      error.statusCode = 404;
      throw error;
    }

    return schoolId;
  }

  async getFaultReports(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 200);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const status = this.optionalString(query.status, 'Status', 30);
    const schoolId = query.schoolId ? parseInt(query.schoolId, 10) : null;

    if (status && !this.allowedStatuses.includes(status)) {
      throw new Error('Fault status is invalid');
    }

    if (schoolId !== null && (!Number.isInteger(schoolId) || schoolId <= 0)) {
      throw new Error('School ID must be a positive integer');
    }

    return await this.faultReportRepository.getAll({
      limit,
      offset: (page - 1) * limit,
      status,
      schoolId
    });
  }

  async updateFaultStatus(id, status, currentUser) {
    const faultReportId = parseInt(id, 10);
    if (!Number.isInteger(faultReportId) || faultReportId <= 0) {
      throw new Error('Fault report ID must be a positive integer');
    }

    if (!this.allowedStatuses.includes(status)) {
      throw new Error('Fault status is invalid');
    }

    const updated = await this.faultReportRepository.updateStatus(faultReportId, status, currentUser?.UserID);

    if (!updated) {
      const error = new Error('Fault report not found');
      error.statusCode = 404;
      throw error;
    }

    return updated;
  }

  requiredString(value, label, maxLength) {
    const cleaned = this.optionalString(value, label, maxLength);

    if (!cleaned) {
      throw new Error(`${label} is required`);
    }

    return cleaned;
  }

  optionalString(value, label, maxLength) {
    if (value === undefined || value === null) {
      return null;
    }

    const cleaned = String(value).trim();

    if (cleaned.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or less`);
    }

    return cleaned || null;
  }

  positiveInteger(value, label) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      const error = new Error(`${label} must be a positive integer`);
      error.statusCode = 400;
      throw error;
    }

    return parsed;
  }
}

module.exports = FaultReportService;
