const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const RegistrationRepository = require('../data/registrationRepository');
const SchoolRepository = require('../data/schoolRepository');
const UserRepository = require('../data/userRepository');
const ParentRepository = require('../data/parentRepository');
const NotificationService = require('./notificationService');

class RegistrationService {
  constructor() {
    this.registrationRepository = new RegistrationRepository();
    this.schoolRepository = new SchoolRepository();
    this.userRepository = new UserRepository();
    this.parentRepository = new ParentRepository();
    this.notificationService = new NotificationService();
  }

  async getPublicSchools() {
    return await this.registrationRepository.getPublicSchools();
  }

  async registerSchoolClient(data) {
    const payload = {
      schoolName: this.requiredString(data.schoolName, 'School name', 255),
      registrationNumber: this.optionalString(data.registrationNumber, 'Registration number', 100),
      address: this.optionalString(data.address, 'Address', 500),
      website: this.optionalString(data.website, 'Website', 255),
      contactPerson: this.requiredString(data.contactPerson, 'Contact person', 255),
      contactEmail: this.email(data.contactEmail, 'Contact email'),
      contactPhone: this.requiredString(data.contactPhone, 'Contact phone', 50),
      billingContactName: this.optionalString(data.billingContactName, 'Billing contact name', 255),
      billingContactEmail: data.billingContactEmail ? this.email(data.billingContactEmail, 'Billing contact email') : null,
      billingContactPhone: this.optionalString(data.billingContactPhone, 'Billing contact phone', 50),
      billingAddress: this.optionalString(data.billingAddress, 'Billing address', 500),
      requestedPlan: this.optionalString(data.requestedPlan, 'Requested plan', 100),
      paymentProvider: this.optionalString(data.paymentProvider || 'Placeholder', 'Payment provider', 100),
      paymentCustomerReference: this.optionalString(data.paymentCustomerReference, 'Payment customer reference', 255),
      billingNotes: this.optionalString(data.billingNotes, 'Billing notes', 1000)
    };

    const existingSchool = await this.schoolRepository.getSchoolByNormalizedName(payload.schoolName);

    if (existingSchool) {
      const error = new Error('A school with this name already exists.');
      error.statusCode = 409;
      throw error;
    }

    const request = await this.registrationRepository.createSchoolRegistrationRequest(payload);
    await this.sendRegistrationEmail(
      payload.contactEmail,
      'Kinder Care Hub school registration received',
      `Hi ${payload.contactPerson},\n\nWe received the registration request for ${payload.schoolName}. We will review the details and contact you about activation.`
    );

    if (process.env.REGISTRATION_NOTIFY_EMAIL) {
      await this.sendRegistrationEmail(
        process.env.REGISTRATION_NOTIFY_EMAIL,
        `New school registration: ${payload.schoolName}`,
        `A new school registration request was submitted.\n\nSchool: ${payload.schoolName}\nContact: ${payload.contactPerson}\nEmail: ${payload.contactEmail}\nPhone: ${payload.contactPhone}`
      );
    }

    return {
      requestId: request.RequestID,
      status: request.Status,
      message: 'School registration request received'
    };
  }

  async registerParent(data) {
    const schoolId = Number(data.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new Error('School is required');
    }

    const school = await this.registrationRepository.getActiveSchoolById(schoolId);
    if (!school) {
      throw new Error('Selected school is not available');
    }

    const payload = {
      schoolId,
      firstName: this.requiredString(data.firstName, 'First name', 100),
      lastName: this.requiredString(data.lastName, 'Last name', 100),
      email: this.email(data.email, 'Email'),
      phone: this.optionalString(data.phone, 'Phone', 50),
      relationship: this.optionalString(data.relationship, 'Relationship', 100)
    };

    const matchingFamilies = await this.registrationRepository.findFamiliesByParentEmail(schoolId, payload.email);

    if (!matchingFamilies.length) {
      const request = await this.registrationRepository.createParentRegistrationRequest({
        ...payload,
        status: 'PendingReview',
        notes: 'No family record matched this verified parent email at registration time.'
      });
      await this.sendRegistrationEmail(
        payload.email,
        'Kinder Care Hub parent registration received',
        `Hi ${payload.firstName},\n\nWe received your parent registration. The selected school needs to verify your details before portal access is enabled.`
      );

      return {
        requestId: request.RequestID,
        status: 'PendingReview',
        matched: false,
        message: 'Registration received for school review'
      };
    }

    const parentUser = await this.findOrCreateParentUser(payload.email);

    for (const family of matchingFamilies) {
      const existingLink = await this.parentRepository.getParentLinkByUserAndFamily(parentUser.UserID, family.FamilyID);

      if (!existingLink) {
        await this.parentRepository.createParentLink(parentUser.UserID, family.FamilyID, schoolId);
      }
    }

    const request = await this.registrationRepository.createParentRegistrationRequest({
      ...payload,
      matchedFamilyId: matchingFamilies[0].FamilyID,
      parentUserId: parentUser.UserID,
      status: 'Matched',
      notes: `Matched ${matchingFamilies.length} family record(s) by parent email.`
    });
    await this.sendRegistrationEmail(
      payload.email,
      'Kinder Care Hub parent registration matched',
      `Hi ${payload.firstName},\n\nYour parent registration matched the selected school's records. You can sign in with Google or Microsoft using ${payload.email}.`
    );

    return {
      requestId: request.RequestID,
      status: 'Matched',
      matched: true,
      message: 'Parent registration matched. Sign in with Google or Microsoft using this same email address.'
    };
  }

  async sendRegistrationEmail(to, subject, body) {
    try {
      return await this.notificationService.sendEmail(to, subject, body);
    } catch (error) {
      console.warn('[Registration] Email notification failed:', error.message);
      return { sent: false, reason: error.message };
    }
  }

  async findOrCreateParentUser(email) {
    const existing = await this.userRepository.getUserByEmail(email);

    if (existing) {
      if (existing.Role !== 'parent') {
        throw new Error('This email is already linked to another portal');
      }

      if (existing.IsActive !== undefined && existing.IsActive !== null && !existing.IsActive) {
        throw new Error('This parent account is inactive');
      }

      return existing;
    }

    const usernameBase = email.split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'parent';
    const existingUsername = await this.userRepository.getUserByUsername(usernameBase);
    const username = existingUsername
      ? `${usernameBase}${Date.now().toString(36)}`.slice(0, 50)
      : usernameBase;
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    return await this.userRepository.createUser({
      username,
      email,
      passwordHash,
      role: 'parent',
      schoolId: null
    });
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

module.exports = RegistrationService;
