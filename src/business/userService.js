// Business Layer - User service logic
// This service contains account registration, login, password hashing, and token creation.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../data/userRepository');
const SchoolService = require('./schoolService');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.schoolService = new SchoolService();
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
  async login(loginRequest, legacyUsername, legacyPassword) {
    const request = typeof loginRequest === 'object'
      ? loginRequest
      : { schoolId: loginRequest, identifier: legacyUsername, password: legacyPassword };
    const loginType = String(request.loginType || '').trim().toLowerCase();
    const identifier = this.normalizeUsername(request.identifier || request.username || request.email);
    const password = String(request.password || '');
    const resolvedType = loginType || (Number(request.schoolId) === 0 ? 'devforge' : 'school');

    if (!identifier || !password) {
      throw new Error('Login identifier and password are required');
    }

    const user = await this.findLoginUser(resolvedType, request.schoolId, identifier);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async findLoginUser(loginType, schoolId, identifier) {
    if (loginType === 'devforge') {
      return await this.userRepository.getAdminByIdentifier(identifier);
    }

    if (loginType === 'parent') {
      const parent = await this.userRepository.getParentByIdentifier(identifier);

      if (!parent) {
        return null;
      }

      const linkedSchools = await this.userRepository.getParentLinkedSchools(parent.UserID);
      if (linkedSchools.length && linkedSchools.every((school) => school.SubscriptionStatus !== 'Active')) {
        throw new Error('This school account is suspended. Please contact the school.');
      }

      return parent;
    }

    if (loginType !== 'school') {
      throw new Error('Login type is invalid');
    }

    const parsedSchoolId = Number(schoolId);

    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
      throw new Error('School ID is required for school staff login');
    }

    const school = await this.schoolService.getSchoolById(parsedSchoolId);

    if (school.SubscriptionStatus !== 'Active') {
      throw new Error('This school account is suspended. Please contact DevForge Solutions.');
    }

    return await this.userRepository.getUserBySchoolAndIdentifier(parsedSchoolId, identifier);
  }

  // Get all users for admin workflows.
  async getAllUsers() {
    return await this.userRepository.getAllUsers();
  }

  async getDevForgeUsers() {
    return await this.userRepository.getDevForgeUsers();
  }

  async createDevForgeUser(userData, currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      throw new Error('DevForge admin access required');
    }

    const email = this.requiredString(userData.email, 'Email', 255);
    const username = this.normalizeUsername(userData.username || email);
    const password = String(userData.password || '');

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error('Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const existingEmail = await this.userRepository.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepository.createUser({
      email,
      username,
      passwordHash,
      role: 'admin',
      schoolId: null
    });

    return this.sanitizeUser(user);
  }

  async getSchoolUsers(currentUser, schoolId) {
    const managedSchoolId = this.resolveManagedSchoolId(currentUser, schoolId);
    return await this.userRepository.getUsersBySchool(managedSchoolId);
  }

  async createSchoolUser(userData, currentUser) {
    const managedSchoolId = this.resolveManagedSchoolId(currentUser, userData.schoolId);
    const email = this.requiredString(userData.email, 'Email', 255);
    const username = this.normalizeUsername(userData.username);
    const password = String(userData.password || '');

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error('Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const existingEmail = await this.userRepository.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('A user with this email already exists');
    }

    const existingUsername = await this.userRepository.getUserRecordBySchoolAndUsername(managedSchoolId, username);
    if (existingUsername) {
      throw new Error('A user with this username already exists for this school');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepository.createUser({
      email,
      username,
      passwordHash,
      role: 'school',
      schoolId: managedSchoolId
    });

    return this.sanitizeUser(user);
  }

  async setSchoolUserActive(userId, isActive, currentUser) {
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    if (currentUser.UserID === parsedUserId) {
      throw new Error('You cannot deactivate your own account');
    }

    const existingUser = await this.userRepository.getUserRecordById(parsedUserId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.Role !== 'school') {
      throw new Error('Only school users can be managed from this screen');
    }

    const managedSchoolId = this.resolveManagedSchoolId(currentUser, existingUser.SchoolID);
    if (existingUser.SchoolID !== managedSchoolId) {
      throw new Error('You can only manage users for your own school');
    }

    const updatedUser = await this.userRepository.setUserActive(parsedUserId, Boolean(isActive));
    return this.sanitizeUser(updatedUser);
  }

  async setDevForgeUserActive(userId, isActive, currentUser) {
    const parsedUserId = Number(userId);

    if (!currentUser || currentUser.Role !== 'admin') {
      throw new Error('DevForge admin access required');
    }

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    if (currentUser.UserID === parsedUserId && !isActive) {
      throw new Error('You cannot deactivate your own account');
    }

    const existingUser = await this.userRepository.getUserRecordById(parsedUserId);
    if (!existingUser || existingUser.Role !== 'admin' || existingUser.SchoolID !== null) {
      throw new Error('Only DevForge internal users can be managed here');
    }

    const updatedUser = await this.userRepository.setUserActive(parsedUserId, Boolean(isActive));
    return this.sanitizeUser(updatedUser);
  }

  // Get user by ID.
  async getUserById(userId) {
    return await this.userRepository.getUserById(userId);
  }

  resolveManagedSchoolId(currentUser, schoolId) {
    if (!currentUser) {
      throw new Error('User context is required');
    }

    if (currentUser.Role !== 'admin') {
      if (!currentUser.SchoolID) {
        throw new Error('School users must be linked to a school');
      }

      return currentUser.SchoolID;
    }

    const parsedSchoolId = Number(schoolId);
    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
      throw new Error('School ID must be a positive integer');
    }

    return parsedSchoolId;
  }

  validateRegistration(email, username, password, role, schoolName, contactEmail, options = {}) {
    const allowedRoles = options.allowAdmin ? ['admin', 'school', 'parent'] : ['school', 'parent'];

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

    if (role === 'parent' && !contactEmail) {
      throw new Error('Contact email is required for parent registration');
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

  requiredString(value, label, maxLength) {
    const cleaned = String(value || '').trim();

    if (!cleaned) {
      throw new Error(`${label} is required`);
    }

    if (cleaned.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or less`);
    }

    return cleaned;
  }

  sanitizeUser(user) {
    return {
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      schoolId: user.SchoolID,
      isActive: user.IsActive,
      createdDate: user.CreatedDate
    };
  }
}

module.exports = UserService;
