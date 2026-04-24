// Business Layer - User service logic
// This service contains account registration, login, password hashing, and token creation.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../data/userRepository');
const SchoolService = require('./schoolService');

class UserService {
  constructor(sql) {
    this.sql = sql;
    this.userRepository = new UserRepository();
    this.schoolService = new SchoolService(sql);
  }

  // Register a new user and optionally create the linked school tenant.
  async register(userData) {
    const { email, password, role, schoolName, address, contactEmail, contactPhone } = userData;

    this.validateRegistration(email, password, role, schoolName, contactEmail);

    const existingUser = await this.userRepository.getUserByEmail(email);

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let schoolId = null;

    if (role === 'school') {
      const schoolData = { schoolName, address, contactEmail, contactPhone };
      const newSchool = await this.schoolService.createSchool(schoolData);
      schoolId = newSchool.SchoolID;
    }

    const newUser = await this.userRepository.createUser({
      email,
      passwordHash,
      role,
      schoolId
    });

    return this.buildAuthResponse(newUser);
  }

  // Login an existing user and issue a short-lived access token.
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await this.userRepository.getUserByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  // Get all users for admin workflows.
  async getAllUsers() {
    return await this.userRepository.getAllUsers();
  }

  // Get user by ID.
  async getUserById(userId) {
    return await this.userRepository.getUserById(userId);
  }

  validateRegistration(email, password, role, schoolName, contactEmail) {
    const allowedRoles = ['admin', 'school'];

    if (!email || !password || !role) {
      throw new Error('Email, password, and role are required');
    }

    if (!allowedRoles.includes(role)) {
      throw new Error('Role must be admin or school');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (role === 'school' && (!schoolName || !contactEmail)) {
      throw new Error('School name and contact email are required for school registration');
    }
  }

  buildAuthResponse(user) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required');
    }

    const token = jwt.sign(
      { userId: user.UserID, email: user.Email, role: user.Role, schoolId: user.SchoolID },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      user: {
        id: user.UserID,
        email: user.Email,
        role: user.Role,
        schoolId: user.SchoolID
      },
      token
    };
  }
}

module.exports = UserService;
