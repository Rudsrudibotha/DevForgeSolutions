// Business Layer - User service logic
// This service contains account registration, login, password hashing, and token creation.

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserRepository = require('../data/userRepository');
const EmployeeRepository = require('../data/employeeRepository');
const ParentRepository = require('../data/parentRepository');
const { StaffRoleRepository } = require('../data/permissionLeaveYearEndRepositories');
const SchoolService = require('./schoolService');
const {
  isAadAdminEmailAllowed,
  isAadAdminObjectIdAllowed,
  normalizeEmail: normalizeAadEmail
} = require('../security/adminAccess');
const { getSchoolPermissions } = require('../security/schoolPermissions');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.employeeRepository = new EmployeeRepository();
    this.parentRepository = new ParentRepository();
    this.staffRoleRepository = new StaffRoleRepository();
    this.schoolService = new SchoolService();
  }

  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('Password must be at least 8 characters long and include both letters and numbers');
    }
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
      website,
      subscriptionPlan
    } = userData;

    const normalizedEmail = this.normalizeEmail(email);
    const normalizedUsername = this.normalizeUsername(username);

    this.validateRegistration(normalizedEmail, normalizedUsername, password, role, schoolName, contactEmail, options);

    const existingEmailUser = await this.userRepository.getUserByEmail(normalizedEmail);
    if (existingEmailUser) {
      throw new Error('User already exists');
    }

    const existingUsername = await this.userRepository.getUserByUsername(normalizedUsername);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let schoolId = null;

    if (role === 'school') {
      const schoolData = { schoolName, address, logoUrl, contactPerson, contactEmail, contactPhone, website, subscriptionPlan };
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

    if (role === 'school') {
      await this.createOwnerEmployeeRecord(newUser, userData);
    }

    return await this.buildAuthResponse(newUser);
  }

  // Login an existing user and issue a short-lived access token.
  async login(loginRequest, legacyUsername, legacyPassword) {
    const request = typeof loginRequest === 'object'
      ? loginRequest
      : { schoolId: loginRequest, identifier: legacyUsername, password: legacyPassword };
    const loginType = String(request.loginType || '').trim().toLowerCase();
    const identifier = this.normalizeUsername(request.identifier || request.username || request.email);
    const password = String(request.password || '');
    const parsedSchoolId = Number(request.schoolId);
    const hasSchoolId = Number.isInteger(parsedSchoolId) && parsedSchoolId > 0;
    const resolvedType = loginType || (hasSchoolId ? 'school' : 'devforge');

    if (!identifier || !password) {
      throw new Error('Login identifier and password are required');
    }

    if (resolvedType === 'devforge') {
      throw new Error('Admin dashboard requires AAD sign-in');
    }

    const user = await this.findLoginUser(resolvedType, request.schoolId, identifier);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return await this.buildAuthResponse(user);
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

      // School staff who are also parents sign in here with the same
      // email; the session is parent-scoped regardless of Users.Role.
      return this.asParentDashboardUser(parent);
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
      throw new Error('This school account is suspended. Please contact Kinder Care Hub.');
    }

    const user = await this.userRepository.getStaffLinkedUserBySchoolAndIdentifier(parsedSchoolId, identifier);

    if (!user) {
      const schoolUser = await this.userRepository.getUserRecordBySchoolAndIdentifier(parsedSchoolId, identifier);
      if (schoolUser) {
        throw new Error('School dashboard access requires an active staff record for this school');
      }
    }

    return user ? this.asSchoolDashboardUser(user, parsedSchoolId) : null;
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
      throw new Error('Kinder Care Hub admin access required');
    }

    throw new Error('Admin dashboard users are provisioned through Microsoft Entra ID. Add the user to the AAD app assignment and AZURE_AD_ADMIN_EMAILS/AZURE_AD_ADMIN_OBJECT_IDS, then have them sign in with AAD.');
  }

  async getSchoolUsers(currentUser, schoolId) {
    const managedSchoolId = this.resolveManagedSchoolId(currentUser, schoolId);
    return await this.userRepository.getUsersBySchool(managedSchoolId);
  }

  async createSchoolUser(userData, currentUser) {
    const managedSchoolId = this.resolveManagedSchoolId(currentUser, userData.schoolId);
    const employeeId = this.positiveInteger(userData.employeeId, 'Staff member');
    const staffRoleId = this.positiveInteger(userData.staffRoleId, 'Access role');
    const employee = await this.employeeRepository.getEmployeeById(employeeId);

    if (!employee || Number(employee.SchoolID) !== Number(managedSchoolId)) {
      throw new Error('Staff member not found for this school');
    }

    if (employee.IsActive === false) {
      throw new Error('Inactive staff members cannot be given dashboard access');
    }

    if (employee.UserID) {
      throw new Error('This staff member already has dashboard access');
    }

    const email = this.normalizeEmail(this.requiredString(employee.Email, 'Staff email', 255));
    const username = this.normalizeUsername(userData.username);
    const staffRole = await this.staffRoleRepository.getById(staffRoleId, managedSchoolId);

    if (!staffRole || staffRole.IsActive === false) {
      throw new Error('Access role not found for this school');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('A valid staff email address is required');
    }

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error('Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
    }

    const existingEmail = await this.userRepository.getUserByEmail(email);
    if (existingEmail) {
      return await this.linkExistingUserToSchoolStaff(existingEmail, employee, staffRoleId, managedSchoolId, currentUser);
    }

    const existingUsername = await this.getSchoolUsernameConflict(managedSchoolId, username);
    if (existingUsername) {
      throw new Error('A user with this username already exists for this school');
    }

    const password = String(userData.password || '');
    this.validatePassword(password);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepository.createUser({
      email,
      username,
      passwordHash,
      role: 'school',
      schoolId: managedSchoolId
    });

    await this.employeeRepository.linkEmployeeUser(employeeId, managedSchoolId, user.UserID);
    await this.staffRoleRepository.assignRole(user.UserID, staffRoleId, managedSchoolId, currentUser.UserID);

    return this.sanitizeUser(user);
  }

  async linkExistingUserToSchoolStaff(existingUser, employee, staffRoleId, schoolId, currentUser) {
    // Parent-account holders can be granted staff access too (parents
    // who work at the school): the Employee link is the deliberate
    // grant, and the school portal session is issued per login shell.
    if (!this.isActiveUser(existingUser)) {
      throw new Error('The existing account for this email is inactive');
    }

    const existingStaffMembership = await this.employeeRepository.getActiveEmployeeByUserAndSchool(existingUser.UserID, schoolId);
    if (existingStaffMembership && Number(existingStaffMembership.EmployeeID) !== Number(employee.EmployeeID)) {
      throw new Error('This account is already linked to another staff member for this school');
    }

    const usernameConflict = await this.getSchoolUsernameConflict(schoolId, existingUser.Username);
    if (usernameConflict && Number(usernameConflict.UserID) !== Number(existingUser.UserID)) {
      throw new Error('The existing account username is already in use for this school');
    }

    await this.employeeRepository.linkEmployeeUser(employee.EmployeeID, schoolId, existingUser.UserID);
    await this.staffRoleRepository.assignRole(existingUser.UserID, staffRoleId, schoolId, currentUser?.UserID);

    return this.sanitizeUser({
      ...existingUser,
      Role: 'school',
      SchoolID: schoolId
    });
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

    const active = Boolean(isActive);
    const updatedUser = await this.userRepository.setUserActive(parsedUserId, active);
    await this.employeeRepository.setEmployeeActiveByUser(parsedUserId, managedSchoolId, active);
    return this.sanitizeUser(updatedUser);
  }

  async setDevForgeUserActive(userId, isActive, currentUser) {
    const parsedUserId = Number(userId);

    if (!currentUser || currentUser.Role !== 'admin') {
      throw new Error('Kinder Care Hub admin access required');
    }

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    if (currentUser.UserID === parsedUserId && !isActive) {
      throw new Error('You cannot deactivate your own account');
    }

    const existingUser = await this.userRepository.getUserRecordById(parsedUserId);
    if (!existingUser || existingUser.Role !== 'admin' || existingUser.SchoolID !== null) {
      throw new Error('Only Kinder Care Hub internal users can be managed here');
    }

    const updatedUser = await this.userRepository.setUserActive(parsedUserId, Boolean(isActive));
    return this.sanitizeUser(updatedUser);
  }

  // Get user by ID.
  async getUserById(userId) {
    return await this.userRepository.getUserById(userId);
  }

  // Self-service profile update from /account (name only — email and
  // role stay fixed; they are the login identity and authorization).
  async updateProfile(userId, { firstName, lastName }) {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new Error('Invalid user id');
    }
    const first = String(firstName || '').trim().slice(0, 255);
    const last = String(lastName || '').trim().slice(0, 255);
    if (!first) throw new Error('First name is required');
    return await this.userRepository.updateUserProfile(parsedUserId, {
      firstName: first,
      lastName: last || null
    });
  }

  // Self-service password change. Requires the current password so a
  // hijacked session cannot silently rotate credentials. OAuth-only
  // accounts have a random hash and should use the reset flow instead.
  async changePassword(userId, currentPassword, newPassword) {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new Error('Invalid user id');
    }
    if (!currentPassword) throw new Error('Current password is required');
    if (!newPassword || String(newPassword).length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    const user = await this.userRepository.getUserAuthById(parsedUserId);
    if (!user || !user.PasswordHash) throw new Error('Account not found');
    const isValid = await bcrypt.compare(currentPassword, user.PasswordHash);
    if (!isValid) throw new Error('Current password is incorrect');
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    return await this.userRepository.updateUserPassword(parsedUserId, passwordHash);
  }

  async getActiveStaffMembership(userId, schoolId) {
    return await this.userRepository.getActiveStaffMembership(userId, schoolId);
  }

  async createOwnerEmployeeRecord(user, userData) {
    if (!user?.SchoolID || !user?.UserID) {
      return null;
    }

    const existing = await this.employeeRepository.getActiveEmployeeByUserAndSchool(user.UserID, user.SchoolID);
    if (existing) {
      await this.assignOwnerRole(user);
      return existing;
    }

    const nameParts = String(userData.contactPerson || user.Username || user.Email || 'School Owner')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const firstName = nameParts.shift() || 'School';
    const lastName = nameParts.join(' ') || 'Owner';

    const employee = await this.employeeRepository.createEmployee({
      schoolId: user.SchoolID,
      userId: user.UserID,
      firstName,
      lastName,
      email: user.Email,
      jobTitle: 'School Owner',
      department: 'Administration',
      startDate: new Date().toISOString().slice(0, 10),
      salary: 0,
      leaveBalance: 21
    });

    await this.assignOwnerRole(user);
    return employee;
  }

  async assignOwnerRole(user) {
    const schoolId = Number(user?.SchoolID);
    const userId = Number(user?.UserID);

    if (!Number.isInteger(schoolId) || schoolId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    const roles = await this.staffRoleRepository.getBySchool(schoolId);
    let ownerRole = roles.find((role) => String(role.RoleName || '').trim().toLowerCase() === 'owner');

    if (!ownerRole) {
      ownerRole = await this.staffRoleRepository.create({
        schoolId,
        roleName: 'Owner',
        description: 'Owner full access for the registered school administrator',
        permissions: ['*']
      });
    }

    await this.staffRoleRepository.assignRole(userId, ownerRole.StaffRoleID, schoolId, userId);
    return ownerRole;
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

    if (!this.isValidEmail(email) || email.length > 255) {
      throw new Error('A valid email address is required');
    }

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error('Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
    }

    if (!allowedRoles.includes(role)) {
      throw new Error(options.allowAdmin ? 'Role must be admin or school' : 'Public registration is only available for school accounts');
    }

    this.validatePassword(password);

    if (role === 'school') {
      if (!schoolName || !contactEmail) {
        throw new Error('School name and contact email are required for school registration');
      }
      if (!this.isValidEmail(contactEmail)) {
        throw new Error('A valid contact email is required for school registration');
      }
    }

    if (role === 'parent') {
      if (!contactEmail) {
        throw new Error('Contact email is required for parent registration');
      }
      if (!this.isValidEmail(contactEmail)) {
        throw new Error('A valid contact email is required for parent registration');
      }
    }
  }

  async buildAuthResponse(user) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required');
    }

    const token = jwt.sign(
      { userId: user.UserID, username: user.Username, email: user.Email, role: user.Role, schoolId: user.SchoolID },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    const permissions = await getSchoolPermissions(user);

    return {
      user: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        schoolId: user.SchoolID,
        hasHrPermission: Boolean(user.HasHrPermission),
        permissions
      },
      token
    };
  }

  // Find or create a user based on OAuth provider email and requested login type
  async findOrCreateOAuthUser(provider, email, loginType, schoolId, options = {}) {
    const normalizedEmail = loginType === 'devforge'
      ? normalizeAadEmail(email)
      : this.normalizeEmail(email);
    const parsedSchoolId = Number(schoolId);

    if (!normalizedEmail) throw new Error('Email is required from provider');

    if (loginType === 'devforge') {
      const existing = await this.userRepository.getAdminByIdentifier(normalizedEmail);
      const objectIdAllowed = isAadAdminObjectIdAllowed(options.aadObjectId);
      if (!isAadAdminEmailAllowed(normalizedEmail) && !objectIdAllowed) {
        throw new Error('User not authorized for Admin dashboard login');
      }

      if (existing) {
        if (existing.Role !== 'admin' && existing.Role !== 'devforge') {
          throw new Error('User not authorized for Admin dashboard login');
        }

        if (!this.isActiveUser(existing)) {
          throw new Error('This admin account is inactive');
        }

        return existing;
      }

      if (!options.allowAdminProvisioning) {
        throw new Error('User not authorized for Admin dashboard login');
      }

      return await this.createAadAdminUser(normalizedEmail);
    }

    if (loginType === 'school') {
      if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
        throw new Error('School ID is required for school login');
      }

      const school = await this.schoolService.getSchoolById(parsedSchoolId);
      if (school.SubscriptionStatus !== 'Active') {
        throw new Error('This school account is suspended. Please contact Kinder Care Hub.');
      }

      const existing = await this.userRepository.getStaffLinkedUserBySchoolAndIdentifier(parsedSchoolId, normalizedEmail);

      // Only staff-linked school users can sign in through a school provider.
      if (!existing) {
        const schoolUser = await this.userRepository.getUserRecordBySchoolAndIdentifier(parsedSchoolId, normalizedEmail);
        if (schoolUser) {
          throw new Error('School dashboard access requires an active staff record for this school');
        }

        const conflictingUser = await this.userRepository.getUserByEmail(normalizedEmail);
        if (conflictingUser?.Role === 'admin') {
          throw new Error('This email is registered for the Admin dashboard, not this school');
        }

        if (conflictingUser?.Role && conflictingUser.Role !== 'school') {
          throw new Error(`This email is registered as a ${conflictingUser.Role} user, not a school user`);
        }

        throw new Error('No matching school user found for this email and school');
      }

      return this.asSchoolDashboardUser(existing, parsedSchoolId);
    }

    if (loginType === 'parent') {
      // Relationship-driven: matches dedicated parent accounts AND staff
      // accounts that have ParentLinks (staff who are also parents).
      const existing = await this.userRepository.getParentByIdentifier(normalizedEmail);

      if (!existing) {
        const conflictingUser = await this.userRepository.getUserByEmail(normalizedEmail);
        if (conflictingUser?.Role === 'admin') {
          throw new Error('This email is registered for the Admin dashboard. Please use a personal email address for parent access.');
        }

        if (conflictingUser?.Role === 'school') {
          throw new Error('This email belongs to a staff account that is not linked to a family yet. Submit a parent access request first — your staff sign-in stays separate.');
        }

        throw new Error('Parent registration is required before signing in');
      }

      if (!this.isActiveUser(existing)) {
        throw new Error('This parent account is inactive');
      }

      const linkedSchools = await this.userRepository.getParentLinkedSchools(existing.UserID);

      if (!linkedSchools.length) {
        throw new Error('Parent registration is pending school verification');
      }

      if (linkedSchools.every((school) => school.SubscriptionStatus !== 'Active')) {
        throw new Error('This school account is suspended. Please contact the school.');
      }

      return this.asParentDashboardUser(existing);
    }

    throw new Error('Invalid login type');
  }

  async createAadAdminUser(email) {
    const baseUsername = email.split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'admin';
    const existingUsername = await this.userRepository.getUserByUsername(baseUsername);
    const username = existingUsername
      ? `${baseUsername}${Date.now().toString(36)}`.slice(0, 50)
      : baseUsername;
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    return await this.userRepository.createUser({
      username,
      email,
      passwordHash,
      role: 'admin',
      schoolId: null
    });
  }

  async findOrCreateParentUserByEmail(email) {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail || !this.isValidEmail(normalizedEmail)) {
      throw new Error('A valid parent email address is required');
    }

    const existing = await this.userRepository.getUserByEmail(normalizedEmail);

    if (existing) {
      // School staff can hold parent access on the same account
      // (ParentLinks decide what they see); only admin emails are
      // excluded — platform staff must use a personal address.
      if (existing.Role === 'admin') {
        throw new Error('This email belongs to a Kinder Care Hub admin account. Please use a personal email address for parent access.');
      }

      if (!this.isActiveUser(existing)) {
        throw new Error('This account is inactive');
      }

      return existing;
    }

    const usernameBase = normalizedEmail.split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'parent';
    const existingUsername = await this.userRepository.getUserByUsername(usernameBase);
    const username = existingUsername
      ? `${usernameBase}${Date.now().toString(36)}`.slice(0, 50)
      : usernameBase;
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    return await this.userRepository.createUser({
      username,
      email: normalizedEmail,
      passwordHash,
      role: 'parent',
      schoolId: null
    });
  }

  isActiveUser(user) {
    return user?.IsActive === undefined || user?.IsActive === null || Boolean(user.IsActive);
  }

  asSchoolDashboardUser(user, schoolId) {
    return {
      ...user,
      OriginalRole: user.Role,
      Role: 'school',
      SchoolID: Number(schoolId)
    };
  }

  // Parent-portal session for a user whose account role may be 'school'
  // (staff who are also parents). The active school comes from
  // ParentLinks, never from the staff SchoolID.
  asParentDashboardUser(user) {
    return {
      ...user,
      OriginalRole: user.Role,
      Role: 'parent',
      SchoolID: null
    };
  }

  async getParentLinkedSchools(userId) {
    return await this.userRepository.getParentLinkedSchools(userId);
  }

  // Sign a short-lived token that lets a DevForge admin act AS another
  // user. The `imp` claim records the impersonator so every downstream
  // session is traceable and the portal can show a persistent banner.
  // Never issued for admin targets (privilege boundary).
  signImpersonationToken({ target, role, schoolId, impersonatorId }) {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    if (!target || !target.UserID) throw new Error('Impersonation target is required');
    if ((target.Role || '').toLowerCase() === 'admin') throw new Error('Cannot impersonate an admin account');
    const sessionRole = role === 'parent' ? 'parent' : 'school';
    return jwt.sign(
      {
        userId: target.UserID,
        username: target.Username,
        email: target.Email,
        role: sessionRole,
        schoolId: sessionRole === 'school' ? Number(schoolId) || null : null,
        imp: Number(impersonatorId) || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
  }

  normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  async getSchoolUsernameConflict(schoolId, username) {
    const normalized = this.normalizeUsername(username);
    if (!normalized) {
      return null;
    }

    return await this.userRepository.getStaffLinkedUserBySchoolAndUsername(schoolId, normalized)
      || await this.userRepository.getUserRecordBySchoolAndUsername(schoolId, normalized);
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

  positiveInteger(value, label) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${label} is required`);
    }

    return parsed;
  }

  sanitizeUser(user) {
    return {
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      schoolId: user.SchoolID,
      hasHrPermission: Boolean(user.HasHrPermission),
      isActive: user.IsActive,
      createdDate: user.CreatedDate
    };
  }
}

module.exports = UserService;
