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
