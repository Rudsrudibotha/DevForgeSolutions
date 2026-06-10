const jwt = require('jsonwebtoken');
const { OWNER_PERMISSION } = require('./schoolPermissions');

function isAuthDisabled() {
  if (process.env.DISABLE_AUTH !== 'true') {
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY] DISABLE_AUTH is ignored when NODE_ENV=production');
    return false;
  }

  return true;
}

function testUserRole() {
  const role = String(process.env.TEST_USER_ROLE || 'school').trim().toLowerCase();
  return ['school', 'parent', 'admin'].includes(role) ? role : 'school';
}

function testSchoolId() {
  const id = Number(process.env.TEST_SCHOOL_ID || 1);
  return Number.isInteger(id) && id > 0 ? id : 1;
}

function testUserId() {
  const id = Number(process.env.TEST_USER_ID || 1);
  return Number.isInteger(id) && id > 0 ? id : 1;
}

function buildTestUserRecord() {
  const role = testUserRole();

  return {
    UserID: testUserId(),
    Username: 'test-user',
    Email: 'test@local.dev',
    Role: role,
    SchoolID: role === 'school' ? testSchoolId() : null,
    IsActive: 1,
    HasHrPermission: true,
    SchoolPermissions: [OWNER_PERMISSION],
    SchoolPermissionSet: new Set([OWNER_PERMISSION])
  };
}

function buildTestAuthResponse() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  const user = buildTestUserRecord();
  const token = jwt.sign(
    {
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      schoolId: user.SchoolID
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' }
  );

  return {
    token,
    user: {
      id: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      schoolId: user.SchoolID,
      hasHrPermission: true,
      permissions: [OWNER_PERMISSION]
    }
  };
}

function authDisabledResponse() {
  return {
    error: 'Login is disabled while DISABLE_AUTH=true is set for local testing'
  };
}

module.exports = {
  authDisabledResponse,
  buildTestAuthResponse,
  buildTestUserRecord,
  isAuthDisabled
};
