// Business Layer - Messaging package entitlement rules.

const SchoolRepository = require('../data/schoolRepository');
const UserRepository = require('../data/userRepository');

const PACKAGE_KEY = 'messaging';
const PACKAGE_NAME = 'Messaging';
const AVAILABLE_PLANS = ['Basic', 'Standard', 'Pro', 'Premium'];
const MESSAGING_INCLUDED_PLANS = ['Pro'];

class MessagingPackageService {
  constructor(dependencies = {}) {
    this.schoolRepository = dependencies.schoolRepository || new SchoolRepository();
    this.userRepository = dependencies.userRepository || new UserRepository();
  }

  async getStatusForUser(user, requestedSchoolId) {
    const school = await this.resolveSchoolForUser(user, requestedSchoolId);

    return this.statusForSchool(school);
  }

  async testForUser(user, requestedSchoolId) {
    const status = await this.getStatusForUser(user, requestedSchoolId);

    if (!status.active) {
      const error = new Error(status.reason);
      error.statusCode = 403;
      throw error;
    }

    return {
      ok: true,
      message: 'Messaging package is active for this school',
      package: status
    };
  }

  async setSchoolPlan(schoolId, plan, currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      throw new Error('Kinder Care Hub admin access required');
    }

    const parsedSchoolId = this.positiveInteger(schoolId, 'School ID');
    const subscriptionPlan = normalizeSubscriptionPlan(plan);
    const school = await this.schoolRepository.updateSubscriptionPlan(parsedSchoolId, subscriptionPlan);

    if (!school) {
      throw new Error('School not found');
    }

    return this.statusForSchool(school);
  }

  async resolveSchoolForUser(user, requestedSchoolId) {
    if (!user) {
      throw new Error('User context is required');
    }

    const role = user.Role || user.role;

    if (role === 'admin') {
      const schoolId = this.positiveInteger(requestedSchoolId, 'School ID');
      return await this.requiredSchool(schoolId);
    }

    if (role === 'school') {
      const schoolId = this.positiveInteger(user.SchoolID || user.schoolId, 'School ID');
      return await this.requiredSchool(schoolId);
    }

    if (role === 'parent') {
      return await this.resolveParentSchool(user, requestedSchoolId);
    }

    throw new Error('Messaging package is only available to school, parent, and admin users');
  }

  async resolveParentSchool(user, requestedSchoolId) {
    const userId = this.positiveInteger(user.UserID || user.id, 'User ID');
    const links = await this.userRepository.getParentLinkedSchools(userId);

    if (!links.length) {
      throw new Error('Parent registration is pending school verification');
    }

    if (requestedSchoolId) {
      const schoolId = this.positiveInteger(requestedSchoolId, 'School ID');
      const linkedSchool = links.find((school) => Number(school.SchoolID) === schoolId);

      if (!linkedSchool) {
        throw new Error('Parent is not linked to this school');
      }

      return linkedSchool;
    }

    if (links.length > 1) {
      throw new Error('School ID is required when a parent is linked to multiple schools');
    }

    return links[0];
  }

  async requiredSchool(schoolId) {
    const school = await this.schoolRepository.getSchoolById(schoolId);

    if (!school) {
      throw new Error('School not found');
    }

    return school;
  }

  statusForSchool(school) {
    const plan = normalizeSubscriptionPlan(school?.SubscriptionPlan || 'Basic', 'Basic');
    const subscriptionStatus = school?.SubscriptionStatus || 'Active';
    const includedInPlan = MESSAGING_INCLUDED_PLANS.includes(plan);
    const active = subscriptionStatus === 'Active' && includedInPlan;

    return {
      packageKey: PACKAGE_KEY,
      packageName: PACKAGE_NAME,
      schoolId: school?.SchoolID || null,
      schoolName: school?.SchoolName || null,
      subscriptionPlan: plan,
      subscriptionStatus,
      availableOnPlans: [...MESSAGING_INCLUDED_PLANS],
      includedInPlan,
      active,
      reason: active ? 'Messaging package is active'
        : subscriptionStatus !== 'Active' ? 'School subscription is not active'
          : 'Messaging is included in the Pro plan'
    };
  }

  positiveInteger(value, label) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }

    return parsed;
  }
}

function normalizeSubscriptionPlan(value, fallback = null) {
  const cleaned = String(value || '').trim().toLowerCase();
  const aliases = {
    basic: 'Basic',
    standard: 'Standard',
    pro: 'Pro',
    professional: 'Pro',
    premium: 'Premium'
  };

  if (aliases[cleaned]) {
    return aliases[cleaned];
  }

  if (fallback) {
    return fallback;
  }

  throw new Error(`Subscription plan must be one of: ${AVAILABLE_PLANS.join(', ')}`);
}

module.exports = {
  AVAILABLE_PLANS,
  MESSAGING_INCLUDED_PLANS,
  MessagingPackageService,
  normalizeSubscriptionPlan
};
