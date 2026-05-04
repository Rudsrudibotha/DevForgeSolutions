// Application Layer - User routes

const express = require('express');
const UserService = require('../business/userService');
const { authenticateToken, requireAdmin, requireSchoolOrAdmin } = require('../middleware/auth');
const { audit, auditLog } = require('../middleware/audit');

const router = express.Router();
const userService = new UserService();

router.post('/register', async (req, res) => {
  try {
    const { email, username, password, role, schoolName, contactEmail } = req.body;

    if (!email || !username || !password || !role) {
      return res.status(400).json({ error: 'Email, username, password, and role are required' });
    }

    if (role !== 'school') {
      return res.status(400).json({ error: 'Public registration is only available for school accounts' });
    }

    if (role === 'school' && (!schoolName || !contactEmail)) {
      return res.status(400).json({ error: 'School name and contact email are required for school registration' });
    }

    const result = await userService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { schoolId, username, identifier, email, password, loginType } = req.body;
    const loginIdentifier = identifier || email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Login identifier and password are required' });
    }

    const result = await userService.login({
      schoolId,
      identifier: loginIdentifier,
      password,
      loginType
    });

    await auditLog.log({
      userId: result.user.id,
      schoolId: result.user.schoolId || null,
      entityName: 'User',
      entityId: result.user.id,
      action: 'Login',
      after: { role: result.user.role, loginType: loginType || result.user.role },
      ipAddress: req.ip
    });

    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

router.get('/devforge-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await userService.getDevForgeUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/devforge-users', authenticateToken, requireAdmin, audit('User', 'CreateDevForgeUser'), async (req, res) => {
  try {
    const user = await userService.createDevForgeUser(req.body, req.user);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/devforge-users/:id/activate', authenticateToken, requireAdmin, audit('User', 'ActivateDevForgeUser'), async (req, res) => {
  try {
    const user = await userService.setDevForgeUserActive(parseInt(req.params.id, 10), true, req.user);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/devforge-users/:id/deactivate', authenticateToken, requireAdmin, audit('User', 'DeactivateDevForgeUser'), async (req, res) => {
  try {
    const user = await userService.setDevForgeUserActive(parseInt(req.params.id, 10), false, req.user);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/school-users', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const users = await userService.getSchoolUsers(req.user, req.query.schoolId);
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/school-users', authenticateToken, requireSchoolOrAdmin, audit('User', 'CreateSchoolUser'), async (req, res) => {
  try {
    const user = await userService.createSchoolUser(req.body, req.user);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/school-users/:id/activate', authenticateToken, requireSchoolOrAdmin, audit('User', 'Activate'), async (req, res) => {
  try {
    const user = await userService.setSchoolUserActive(parseInt(req.params.id, 10), true, req.user);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/school-users/:id/deactivate', authenticateToken, requireSchoolOrAdmin, audit('User', 'Deactivate'), async (req, res) => {
  try {
    const user = await userService.setSchoolUserActive(parseInt(req.params.id, 10), false, req.user);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id, 10);

    if (!Number.isInteger(requestedUserId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    if (req.user.Role !== 'admin' && req.user.UserID !== requestedUserId) {
      return res.status(403).json({ error: 'You can only access your own user profile' });
    }

    const user = await userService.getUserById(requestedUserId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

module.exports = router;
