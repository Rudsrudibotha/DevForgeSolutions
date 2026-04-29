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
  async register(userData, options = {}) {
    const {
      email,
      username,
      password,
      role,
      schoolName,
      address,
      logoUrl,
      contactPerson,
      contactEmail,
      contactPhone,
      website
    } = userData;

    const normalizedUsername = this.normalizeUsername(username);

    this.validateRegistration(email, normalizedUsername, password, role, schoolName, contactEmail, options);

    const existingUser = await this.userRepository.getUserByEmail(email);

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let schoolId = null;

    if (role === 'school') {
      const schoolData = { schoolName, address, logoUrl, contactPerson, contactEmail, contactPhone, website };
      const newSchool = await this.schoolService.createSchool(schoolData);
      schoolId = newSchool.SchoolID;
    }

    const newUser = await this.userRepository.createUser({
      email,
      username: normalizedUsername,
      passwordHash,
      role,
      schoolId
    });

    return this.buildAuthResponse(newUser);
  }

  // Login an existing user and issue a short-lived access token.
  async login(schoolId, username, password) {
    const parsedSchoolId = Number(schoolId);
    const normalizedUsername = this.normalizeUsername(username);

    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId < 0 || !normalizedUsername || !password) {
      throw new Error('School ID, username, and password are required');
    }

    const user = parsedSchoolId === 0
      ? await this.userRepository.getAdminByUsername(normalizedUsername)
      : await this.userRepository.getUserBySchoolAndUsername(parsedSchoolId, normalizedUsername);

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

  validateRegistration(email, username, password, role, schoolName, contactEmail, options = {}) {
    const allowedRoles = options.allowAdmin ? ['admin', 'school'] : ['school'];

    if (!email || !username || !password || !role) {
      throw new Error('Email, username, password, and role are required');
    }

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error('Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
    }

    if (!allowedRoles.includes(role)) {
      throw new Error(options.allowAdmin ? 'Role must be admin or school' : 'Public registration is only available for school accounts');
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
      { userId: user.UserID, username: user.Username, email: user.Email, role: user.Role, schoolId: user.SchoolID },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      user: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        schoolId: user.SchoolID
      },
      token
    };
  }

  normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }
}

module.exports = UserService;
