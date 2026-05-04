// Middleware - Authentication

const jwt = require('jsonwebtoken');
const UserService = require('../business/userService');
const SchoolService = require('../business/schoolService');

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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

    if (user.Role === 'school' && user.SchoolID) {
      try {
        const school = await schoolService.getSchoolById(user.SchoolID);

        if (school.SubscriptionStatus !== 'Active') {
          return res.status(403).json({ error: 'This school account is suspended. Please contact DevForge Solutions.' });
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
  requireParent
};
