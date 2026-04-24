// Application Layer - User routes

// This module defines the API routes for user-related operations in the School Finance and Management System

const express = require('express');

const UserService = require('../business/userService');

const { sql } = require('../data/db');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const userService = new UserService(sql);

// POST /api/users/register - Register a new user

router.post('/register', async (req, res) => {

  try {

    const { email, password, role, schoolName, address, contactEmail, contactPhone } = req.body;

    if (!email || !password || !role) {

      return res.status(400).json({ error: 'Email, password, and role are required' });

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

// POST /api/users/login - Login user

router.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {

      return res.status(400).json({ error: 'Email and password are required' });

    }

    const result = await userService.login(email, password);

    res.json(result);

  } catch (error) {

    res.status(401).json({ error: error.message });

  }

});

// GET /api/users - Get all users (admin only)

router.get('/', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const users = await userService.getAllUsers();

    res.json(users);

  } catch (error) {

    res.status(500).json({ error: 'Failed to retrieve users' });

  }

});

// GET /api/users/:id - Get user by ID. Admins can read any user; school users can only read themselves.

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

