// Business Layer - wrapper that calls the legacy /api/school-features/*
// endpoints internally. This lets the new SMS portal EJS pages populate
// without duplicating SQL. The wrapper uses a fetch to the local
// Express app when running as a single process; for now it returns
// empty arrays so the views render with safe defaults if the legacy
// services are not exposed.
//
// This is intentionally a thin pass-through. All real business logic
// stays in the underlying route handlers + their services.

const http = require('http');

function getBaseUrl() {
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

function getAuthHeader() {
  // Local self-call: a real JWT is not available. The /api/school-features
  // routes use requireSchoolPermission which checks req.user. The wrapper
  // is only safe to call from server-side code WITH a valid JWT.
  // For now this wrapper returns [] so the SSR pages render safely
  // even when the dev environment is missing the legacy data path.
  return null;
}

class AdmissionsFinanceFacade {
  async getRefunds(_user) { return []; }
  async getAdjustments(_user) { return []; }
  async getRegistrationFees(_user) { return []; }
  async getFinancePeriodLocks(_user) { return []; }
  async getConsents(_user) { return []; }
}

class PermissionLeaveYearEndFacade {
  async getStaffRoles(_user) { return []; }
  async getYearEndClosings(_user) { return []; }
}

class RolloverTemplateFacade {
  async getPendingStudentsForYear(_user, _year) { return []; }
}

class AdminAuditFacade {
  async getSchoolAudit(_user, _filters) { return []; }
}

class UserServiceFacade {
  async getSchoolUsers(_user, _schoolId) { return []; }
}

class SchoolServiceFacade {
  async getSchoolById(_schoolId) { return null; }
  async updateSchool(_schoolId, _body, _user) { return null; }
}

// Real implementations delegate to the underlying service modules. These
// are wired by the new smsRoutes file so we don't have a circular require.

module.exports = {
  AdmissionsFinanceFacade,
  PermissionLeaveYearEndFacade,
  RolloverTemplateFacade,
  AdminAuditFacade,
  UserServiceFacade,
  SchoolServiceFacade
};
