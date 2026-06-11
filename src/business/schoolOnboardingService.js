// Business Layer - School onboarding service.
//
// DevForge admins register a new school tenant together with its first
// user: the school owner. The owner gets an Employee record and the
// 'Owner' staff role, which carries the '*' permission - full access to
// every feature of their own school (the permission resolver expands
// '*' to the complete catalog).
//
// The flow can start from scratch or from a pending public
// SchoolRegistrationRequests row (submitted via /api/register/schools),
// in which case the request is marked Converted on success.

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const SchoolService = require('./schoolService');
const UserService = require('./userService');
const NotificationService = require('./notificationService');
const UserRepository = require('../data/userRepository');
const RegistrationRepository = require('../data/registrationRepository');
const AuditRepository = require('../data/auditRepository');
const { getPool, sql } = require('../data/db');
const { allPermissionKeys } = require('../security/featureCatalog');

class SchoolOnboardingService {
  constructor() {
    this.schoolService = new SchoolService();
    this.userService = new UserService();
    this.notificationService = new NotificationService();
    this.userRepository = new UserRepository();
    this.registrationRepository = new RegistrationRepository();
    this.auditRepository = new AuditRepository();
  }

  requireAdmin(actor) {
    if (!actor || (actor.role || actor.Role) !== 'admin') {
      throw new Error('admin role required');
    }
  }

  // Pending public registration requests, newest first. Used to prefill
  // the register-school form.
  async listPendingRequests({ actor } = {}) {
    this.requireAdmin(actor);
    return await this.registrationRepository.getPendingSchoolRegistrationRequests();
  }

  async getRequest({ actor, requestId } = {}) {
    this.requireAdmin(actor);
    const id = Number(requestId);
    if (!Number.isInteger(id) || id <= 0) return null;
    return await this.registrationRepository.getSchoolRegistrationRequestById(id);
  }

  // Register a school and its owner in one step:
  //   1. Create the school tenant.
  //   2. Create the owner user with a generated temporary password.
  //   3. Create the owner's Employee record + 'Owner' staff role ('*').
  //   4. Mark the originating registration request Converted (if any).
  //   5. Audit the write (awaited) and send a welcome email (best-effort).
  // Returns the school, the sanitized owner, and the one-time temporary
  // password for the admin to hand over. The password is never emailed.
  async registerSchool({ actor, school, owner, requestId } = {}) {
    this.requireAdmin(actor);
    const cleaned = this.validateRegistration(school, owner);
    const parsedRequestId = Number(requestId);
    cleaned.requestId = Number.isInteger(parsedRequestId) && parsedRequestId > 0 ? parsedRequestId : null;

    const existingUser = await this.userRepository.getUserByEmail(cleaned.owner.email);
    if (existingUser) {
      throw new Error('A user with the owner email already exists.');
    }

    const newSchool = await this.schoolService.createSchool({
      schoolName: cleaned.school.schoolName,
      address: cleaned.school.address,
      contactPerson: cleaned.school.contactPerson,
      contactEmail: cleaned.school.contactEmail,
      contactPhone: cleaned.school.contactPhone,
      website: cleaned.school.website,
      subscriptionPlan: cleaned.school.subscriptionPlan
    });

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const username = await this.deriveUsername(cleaned.owner.email);

    const ownerUser = await this.userRepository.createUser({
      email: cleaned.owner.email,
      username,
      passwordHash,
      role: 'school',
      schoolId: newSchool.SchoolID
    });

    // Employee record + 'Owner' staff role with the '*' permission.
    await this.userService.createOwnerEmployeeRecord(ownerUser, {
      contactPerson: `${cleaned.owner.firstName} ${cleaned.owner.lastName || ''}`.trim()
    });

    if (cleaned.requestId) {
      try {
        await this.registrationRepository.updateSchoolRegistrationRequestStatus(cleaned.requestId, 'Converted');
      } catch (err) {
        console.warn('[onboarding] could not mark registration request converted:', err.message);
      }
    }

    // Awaited audit write (writes are awaited, reads are fire-and-forget).
    try {
      await this.auditRepository.recordWrite(
        actor, newSchool.SchoolID, 'school', newSchool.SchoolID, 'REGISTER_SCHOOL',
        null,
        { schoolName: newSchool.SchoolName, ownerUserId: ownerUser.UserID },
        { requestId: cleaned.requestId || null }
      );
    } catch (err) {
      console.error('[audit] school registration audit failed:', err.message);
      // Don't fail the request - the school and owner are committed
    }

    await this.sendWelcomeEmail(cleaned.owner, newSchool, username);

    return {
      school: newSchool,
      owner: {
        userId: ownerUser.UserID,
        username: ownerUser.Username,
        email: ownerUser.Email,
        firstName: cleaned.owner.firstName,
        lastName: cleaned.owner.lastName
      },
      tempPassword
    };
  }

  async selfRegisterSchool({ school, owner } = {}) {
    const cleaned = this.validateRegistration(school, owner);
    const existingUser = await this.userRepository.getUserByEmail(cleaned.owner.email);
    if (existingUser) {
      throw new Error('A user with the owner email already exists.');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const username = await this.deriveUsername(cleaned.owner.email);
    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    let result;
    await tx.begin();
    try {
      const tenantId = await this.insertTenant(tx, cleaned.school.schoolName);
      const schoolId = await this.insertSchool(tx, cleaned.school, tenantId);
      const ownerUser = await this.insertOwnerUser(tx, { cleaned, username, passwordHash, schoolId });
      const ownerRoleId = await this.insertOwnerTenantRole(tx, tenantId);
      await this.grantAllTenantPermissions(tx, ownerRoleId);
      await this.insertTenantMembership(tx, { userId: ownerUser.UserID, tenantId, schoolId, roleId: ownerRoleId });
      await this.insertOwnerEmployeeAndStaffRole(tx, { cleaned, ownerUser, schoolId });
      const subscriptionId = await this.insertTenantSubscription(tx, tenantId, cleaned.school.subscriptionPlan);
      await tx.commit();
      result = { tenantId, schoolId, ownerUser, subscriptionId };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }

    const auditActor = { id: result.ownerUser.UserID, UserID: result.ownerUser.UserID, role: 'school', Role: 'school', email: cleaned.owner.email, Email: cleaned.owner.email };
    await this.auditRepository.recordWrite(
      auditActor,
      result.schoolId,
      'school',
      result.schoolId,
      'SELF_REGISTER_SCHOOL',
      null,
      { schoolName: cleaned.school.schoolName, ownerUserId: result.ownerUser.UserID, tenantId: result.tenantId },
      { source: 'public-registration' }
    );

    await this.sendSelfRegistrationEmail(cleaned.owner, { SchoolName: cleaned.school.schoolName, SchoolID: result.schoolId }, username, tempPassword);

    return {
      schoolId: result.schoolId,
      tenantId: result.tenantId,
      ownerUserId: result.ownerUser.UserID,
      status: 'Active',
      message: 'School registered. Owner sign-in details have been sent to the contact email.'
    };
  }

  validateRegistration(school = {}, owner = {}) {
    const schoolName = this.requiredString(school.schoolName, 'School name', 255);
    const ownerFirstName = this.requiredString(owner.firstName, 'Owner first name', 100);
    const ownerLastName = this.optionalString(owner.lastName, 'Owner last name', 100);
    const ownerEmail = this.email(owner.email, 'Owner email');
    const contactPerson = this.optionalString(school.contactPerson, 'Contact person', 255)
      || `${ownerFirstName} ${ownerLastName || ''}`.trim();
    const contactEmail = school.contactEmail
      ? this.email(school.contactEmail, 'Contact email')
      : ownerEmail;

    return {
      school: {
        schoolName,
        address: this.optionalString(school.address, 'Address', 500),
        contactPerson,
        contactEmail,
        contactPhone: this.optionalString(school.contactPhone, 'Contact phone', 50),
        website: this.optionalString(school.website, 'Website', 255),
        subscriptionPlan: this.optionalString(school.subscriptionPlan, 'Subscription plan', 100)
      },
      owner: {
        firstName: ownerFirstName,
        lastName: ownerLastName,
        email: ownerEmail
      }
    };
  }

  // Random temporary password that satisfies validatePassword
  // (8+ chars with letters and numbers). Shown once to the admin.
  generateTempPassword() {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    const digits = '23456789';
    const all = letters + digits;
    let out = letters[crypto.randomInt(letters.length)] + digits[crypto.randomInt(digits.length)];
    for (let i = 0; i < 12; i++) out += all[crypto.randomInt(all.length)];
    return out;
  }

  async deriveUsername(email) {
    const base = email.split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'owner';
    const conflict = await this.userRepository.getUserByUsername(base);
    return conflict ? `${base}${Date.now().toString(36)}`.slice(0, 50) : base;
  }

  async sendWelcomeEmail(owner, school, username) {
    const baseUrl = process.env.BASE_URL || '';
    try {
      await this.notificationService.sendEmail(
        owner.email,
        `Welcome to Kinder Care Hub - ${school.SchoolName}`,
        `Hi ${owner.firstName},\n\n` +
        `${school.SchoolName} is now registered on Kinder Care Hub and you are the owner ` +
        `with full access to everything in your school.\n\n` +
        `Sign in at ${baseUrl}/school-login with school ID ${school.SchoolID} and username "${username}". ` +
        `Your administrator will share your temporary password separately - please change it ` +
        `under Account settings after your first sign-in.`
      );
    } catch (err) {
      console.warn('[onboarding] welcome email failed:', err.message);
    }
  }

  async sendSelfRegistrationEmail(owner, school, username, tempPassword) {
    const baseUrl = process.env.BASE_URL || process.env.PUBLIC_BASE_URL || '';
    try {
      await this.notificationService.sendEmail(
        owner.email,
        `Kinder Care Hub is ready - ${school.SchoolName}`,
        `Hi ${owner.firstName},\n\n` +
        `${school.SchoolName} has been registered on Kinder Care Hub.\n\n` +
        `Sign in at ${baseUrl}/school-login with school ID ${school.SchoolID}, username "${username}", ` +
        `and this temporary password: ${tempPassword}\n\n` +
        `Change this password under Account settings after your first sign-in.`
      );
    } catch (err) {
      console.warn('[onboarding] self-registration email failed:', err.message);
    }
  }

  async insertTenant(tx, tenantName) {
    const result = await new sql.Request(tx)
      .input('tenantName', sql.NVarChar, tenantName)
      .query(`
        INSERT INTO dbo.Tenants (TenantName, TenantType, Status, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.TenantId
        VALUES (@tenantName, 'School', 'Active', SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].TenantId;
  }

  async insertSchool(tx, school, tenantId) {
    const result = await new sql.Request(tx)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolName', sql.NVarChar, school.schoolName)
      .input('address', sql.NVarChar, school.address || null)
      .input('contactPerson', sql.NVarChar, school.contactPerson || null)
      .input('contactEmail', sql.NVarChar, school.contactEmail || null)
      .input('contactPhone', sql.NVarChar, school.contactPhone || null)
      .input('website', sql.NVarChar, school.website || null)
      .input('subscriptionPlan', sql.NVarChar, school.subscriptionPlan || 'Standard')
      .query(`
        INSERT INTO dbo.Schools
          (TenantId, SchoolName, Address, ContactPerson, ContactEmail, ContactPhone, Website, SubscriptionPlan, SubscriptionStatus)
        OUTPUT INSERTED.SchoolID
        VALUES
          (@tenantId, @schoolName, @address, @contactPerson, @contactEmail, @contactPhone, @website, @subscriptionPlan, 'Active')
      `);
    return result.recordset[0].SchoolID;
  }

  async insertOwnerUser(tx, { cleaned, username, passwordHash, schoolId }) {
    const result = await new sql.Request(tx)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, cleaned.owner.email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('schoolId', sql.Int, schoolId)
      .input('firstName', sql.NVarChar, cleaned.owner.firstName)
      .input('lastName', sql.NVarChar, cleaned.owner.lastName || null)
      .query(`
        INSERT INTO dbo.Users (Username, Email, PasswordHash, Role, SchoolID, FirstName, LastName, IsActive, IsVerified, VerifiedAt)
        OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.SchoolID
        VALUES (@username, @email, @passwordHash, 'school', @schoolId, @firstName, @lastName, 1, 1, SYSUTCDATETIME())
      `);
    return result.recordset[0];
  }

  async insertOwnerTenantRole(tx, tenantId) {
    const result = await new sql.Request(tx)
      .input('tenantId', sql.Int, tenantId)
      .query(`
        INSERT INTO dbo.Roles (RoleName, RoleCode, TenantId, IsPlatformRole, Description, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.RoleId
        VALUES ('Owner', 'OWNER', @tenantId, 0, 'Owner full access for the registered school administrator', SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].RoleId;
  }

  async grantAllTenantPermissions(tx, roleId) {
    for (const permissionKey of allPermissionKeys()) {
      await new sql.Request(tx)
        .input('roleId', sql.Int, roleId)
        .input('permissionKey', sql.NVarChar, permissionKey)
        .input('permissionName', sql.NVarChar, permissionKey)
        .query(`
          DECLARE @permissionId INT;
          SELECT @permissionId = PermissionId FROM dbo.Permissions WHERE PermissionKey = @permissionKey;
          IF @permissionId IS NULL
          BEGIN
            INSERT INTO dbo.Permissions (PermissionKey, PermissionName, CreatedAt, UpdatedAt, IsActive)
            VALUES (@permissionKey, @permissionName, SYSUTCDATETIME(), SYSUTCDATETIME(), 1);
            SET @permissionId = SCOPE_IDENTITY();
          END;
          IF NOT EXISTS (SELECT 1 FROM dbo.RolePermissions WHERE RoleId = @roleId AND PermissionId = @permissionId)
            INSERT INTO dbo.RolePermissions (RoleId, PermissionId, CreatedAt) VALUES (@roleId, @permissionId, SYSUTCDATETIME());
        `);
    }
  }

  async insertTenantMembership(tx, { userId, tenantId, schoolId, roleId }) {
    await new sql.Request(tx)
      .input('userId', sql.Int, userId)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('roleId', sql.Int, roleId)
      .query(`
        INSERT INTO dbo.UserTenantMemberships (UserId, TenantId, SchoolId, RoleId, Status, JoinedAt, IsActive)
        VALUES (@userId, @tenantId, @schoolId, @roleId, 'Active', SYSUTCDATETIME(), 1)
      `);
  }

  async insertOwnerEmployeeAndStaffRole(tx, { cleaned, ownerUser, schoolId }) {
    const employeeResult = await new sql.Request(tx)
      .input('schoolId', sql.Int, schoolId)
      .input('userId', sql.Int, ownerUser.UserID)
      .input('firstName', sql.NVarChar, cleaned.owner.firstName)
      .input('lastName', sql.NVarChar, cleaned.owner.lastName || 'Owner')
      .input('email', sql.NVarChar, cleaned.owner.email)
      .query(`
        INSERT INTO dbo.Employees (SchoolID, UserID, FirstName, LastName, Email, JobTitle, Department, StartDate, Salary, LeaveBalance, IsActive)
        OUTPUT INSERTED.EmployeeID
        VALUES (@schoolId, @userId, @firstName, @lastName, @email, 'School Owner', 'Administration', CAST(GETDATE() AS DATE), 0, 21, 1)
      `);
    const roleResult = await new sql.Request(tx)
      .input('schoolId', sql.Int, schoolId)
      .query(`
        INSERT INTO dbo.StaffRoles (SchoolID, RoleName, Description, Permissions, IsActive)
        OUTPUT INSERTED.StaffRoleID
        VALUES (@schoolId, 'Owner', 'Owner full access for the registered school administrator', '["*"]', 1)
      `);
    await new sql.Request(tx)
      .input('userId', sql.Int, ownerUser.UserID)
      .input('staffRoleId', sql.Int, roleResult.recordset[0].StaffRoleID)
      .query(`
        INSERT INTO dbo.UserRoleAssignments (UserID, StaffRoleID, AssignedBy)
        VALUES (@userId, @staffRoleId, @userId)
      `);
    return employeeResult.recordset[0].EmployeeID;
  }

  async insertTenantSubscription(tx, tenantId, requestedPlan) {
    const planCode = this.planCode(requestedPlan);
    const result = await new sql.Request(tx)
      .input('tenantId', sql.Int, tenantId)
      .input('planCode', sql.NVarChar, planCode)
      .query(`
        DECLARE @planId INT;
        SELECT TOP 1 @planId = SubscriptionPlanId
        FROM dbo.SubscriptionPlans
        WHERE IsActive = 1 AND (PlanCode = @planCode OR IsDefault = 1)
        ORDER BY CASE WHEN PlanCode = @planCode THEN 0 ELSE 1 END, IsDefault DESC;
        IF @planId IS NULL
          THROW 50002, 'No active subscription plan is configured', 1;
        INSERT INTO dbo.TenantSubscriptions (TenantId, SubscriptionPlanId, Status, StartDate, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.TenantSubscriptionId
        VALUES (@tenantId, @planId, 'Active', CAST(GETDATE() AS DATE), SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].TenantSubscriptionId;
  }

  planCode(plan) {
    const raw = String(plan || 'Standard').trim().toUpperCase();
    if (raw === 'PRO+' || raw === 'PRO PLUS' || raw === 'PRO_PLUS') return 'PRO_PLUS';
    const cleaned = raw.replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (cleaned === 'PRO') return 'PRO';
    if (cleaned === 'PRO_PLUS') return 'PRO_PLUS';
    return 'STANDARD';
  }

  email(value, label) {
    const cleaned = this.requiredString(value, label, 255).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      throw new Error(`${label} must be a valid email address`);
    }
    return cleaned;
  }

  requiredString(value, label, maxLength) {
    const cleaned = this.optionalString(value, label, maxLength);
    if (!cleaned) {
      throw new Error(`${label} is required`);
    }
    return cleaned;
  }

  optionalString(value, label, maxLength) {
    if (value === undefined || value === null) {
      return null;
    }
    const cleaned = String(value).trim();
    if (cleaned.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or less`);
    }
    return cleaned || null;
  }
}

module.exports = SchoolOnboardingService;
