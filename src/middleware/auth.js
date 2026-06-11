// Middleware - Authentication

const jwt = require('jsonwebtoken');
const UserService = require('../business/userService');
const SchoolService = require('../business/schoolService');
const { getSchoolPermissions, hasSchoolPermission } = require('../security/schoolPermissions');

const userService = new UserService();
const schoolService = new SchoolService();

function isDatabaseConnectionError(error) {
  const message = String(error?.message || '');

  return [
    'ConnectionError',
    'RequestError'
  ].includes(error?.name)
    || ['ELOGIN', 'ESOCKET', 'ETIMEOUT', 'ECONNCLOSED', 'ENOTOPEN'].includes(error?.code)
    || /DATABASE_URL|Cannot open server|not allowed to access the server|Failed to connect|Connection Timeout|Login failed/i.test(message);
}

const authenticateToken = async (req, res, next) => {
  // SECURITY (H10): accept the JWT from the Authorization header (legacy SPA)
  // or from the HttpOnly kch_token cookie (SSR portal). Cookie takes priority
  // when the header is missing.
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies && req.cookies.kch_token ? decodeURIComponent(req.cookies.kch_token) : null;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    let user;

    try {
      user = await userService.getUserById(decoded.userId);
    } catch (error) {
      if (isDatabaseConnectionError(error)) {
        return res.status(503).json({ error: 'Database unavailable. Check the database connection and try again.' });
      }

      throw error;
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const requestedRole = String(decoded.role || '').toLowerCase();
    const requestedSchoolId = Number(decoded.schoolId);

    // One account can be an internal admin or a parent AND school staff;
    // keep the token's dashboard context (the staff membership check
    // below is what actually grants school access).
    if (
      requestedRole === 'school'
      && Number.isInteger(requestedSchoolId)
      && requestedSchoolId > 0
      && ['school', 'admin', 'parent'].includes(user.Role)
    ) {
      let staffMembership;

      try {
        staffMembership = await userService.getActiveStaffMembership(user.UserID, requestedSchoolId);
      } catch (error) {
        if (isDatabaseConnectionError(error)) {
          return res.status(503).json({ error: 'Database unavailable. Check the database connection and try again.' });
        }

        throw error;
      }

      if (!staffMembership) {
        return res.status(403).json({ error: 'School dashboard access requires an active staff record for this school.' });
      }

      // SECURITY (H11): also enforce subscription status in the early branch
      // so a suspended school cannot obtain a valid session through OAuth.
      try {
        const school = await schoolService.getSchoolById(requestedSchoolId);
        if (!school || school.SubscriptionStatus !== 'Active') {
          return res.status(403).json({ error: 'This school account is suspended. Please contact Kinder Care Hub.' });
        }
      } catch (error) {
        if (isDatabaseConnectionError(error)) {
          return res.status(503).json({ error: 'Database unavailable. Check the database connection and try again.' });
        }
        throw error;
      }

      user = {
        ...user,
        OriginalRole: user.Role,
        Role: 'school',
        SchoolID: requestedSchoolId
      };
    }

    // One account can be school staff AND a parent (ParentLinks decide).
    // Honour the parent dashboard context from the token, mirroring the
    // school overlay above.
    if (requestedRole === 'parent' && user.Role !== 'parent') {
      if (user.Role === 'admin') {
        return res.status(403).json({ error: 'Parent access requires a parent account' });
      }

      let linkedSchools;
      try {
        linkedSchools = await userService.getParentLinkedSchools(user.UserID);
      } catch (error) {
        if (isDatabaseConnectionError(error)) {
          return res.status(503).json({ error: 'Database unavailable. Check the database connection and try again.' });
        }
        throw error;
      }

      if (!linkedSchools.length) {
        return res.status(403).json({ error: 'Parent access requires a linked family record' });
      }

      user = {
        ...user,
        OriginalRole: user.Role,
        Role: 'parent',
        SchoolID: null
      };
    }

    if (user.Role === 'school') {
      if (!user.SchoolID) {
        return res.status(403).json({ error: 'School dashboard access requires a linked school' });
      }

      try {
        const school = await schoolService.getSchoolById(user.SchoolID);

        if (school.SubscriptionStatus !== 'Active') {
          return res.status(403).json({ error: 'This school account is suspended. Please contact Kinder Care Hub.' });
        }

        const staffMembership = await userService.getActiveStaffMembership(user.UserID, user.SchoolID);
        if (!staffMembership) {
          return res.status(403).json({ error: 'School dashboard access requires an active staff record for this school.' });
        }
      } catch (error) {
        if (isDatabaseConnectionError(error)) {
          return res.status(503).json({ error: 'Database unavailable. Check the database connection and try again.' });
        }

        throw error;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    res.status(401).json({ error: 'Invalid token. Please sign in again.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.Role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

const requireSchoolOrAdmin = (req, res, next) => {
  if (req.user.Role !== 'school' && req.user.Role !== 'admin') {
    return res.status(403).json({ error: 'School or admin access required' });
  }

  next();
};

const requireSchoolPermission = (...requiredPermissions) => async (req, res, next) => {
  // Dev Forge Solutions internal users sign in through AAD and have full platform rights.
  // Do not force those admin sessions through school staff permission checks.
  if (req.user.Role === 'admin') {
    return next();
  }

  if (req.user.Role !== 'school') {
    return res.status(403).json({ error: 'School staff access required' });
  }

  try {
    const permissions = await getSchoolPermissions(req.user);
    req.user.SchoolPermissions = permissions;
    req.user.SchoolPermissionSet = new Set(permissions);

    if (!requiredPermissions.length || hasSchoolPermission(req.user, requiredPermissions)) {
      return next();
    }

    return res.status(403).json({ error: 'You do not have permission to perform this action' });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ error: 'Database unavailable. Check the database connection and try again.' });
    }

    return res.status(500).json({ error: 'Could not verify school permissions' });
  }
};

const requireParent = (req, res, next) => {
  if (req.user.Role !== 'parent') {
    return res.status(403).json({ error: 'Parent access required' });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSchoolOrAdmin,
  requireSchoolPermission,
  requireParent
};
