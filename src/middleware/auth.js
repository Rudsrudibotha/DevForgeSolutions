// Middleware - Authentication

// This module provides authentication middleware for protecting routes

const jwt = require('jsonwebtoken');

const UserService = require('../business/userService');

const { sql } = require('../data/db');

const userService = new UserService(sql);

// Middleware to verify JWT token

const authenticateToken = async (req, res, next) => {

  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {

    return res.status(401).json({ error: 'Access token required' });

  }

  try {

    if (!process.env.JWT_SECRET) {

      return res.status(500).json({ error: 'JWT_SECRET is required' });

    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userService.getUserById(decoded.userId);

    if (!user) {

      return res.status(401).json({ error: 'Invalid token' });

    }

    req.user = user;

    next();

  } catch (error) {

    res.status(403).json({ error: 'Invalid token' });

  }

};

// Middleware to check if user is admin

const requireAdmin = (req, res, next) => {

  if (req.user.Role !== 'admin') {

    return res.status(403).json({ error: 'Admin access required' });

  }

  next();

};

// Middleware to check if user is school or admin

const requireSchoolOrAdmin = (req, res, next) => {

  if (req.user.Role !== 'school' && req.user.Role !== 'admin') {

    return res.status(403).json({ error: 'School or admin access required' });

  }

  next();

};

module.exports = {

  authenticateToken,

  requireAdmin,

  requireSchoolOrAdmin

};
