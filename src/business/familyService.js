// Business Layer - Family service logic

const FamilyRepository = require('../data/familyRepository');
const ParentRepository = require('../data/parentRepository');
const UserService = require('./userService');
const { hasSchoolPermission } = require('../security/schoolPermissions');

class FamilyService {
  constructor() {
    this.familyRepository = new FamilyRepository();
    this.parentRepository = new ParentRepository();
    this.userService = new UserService();
  }

  async getFamilies(currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      const families = await this.familyRepository.getFamiliesBySchool(currentUser.SchoolID);
      return families.map((family) => this.sanitizeFamilyForUser(family, currentUser));
    }

    const families = await this.familyRepository.getAllFamilies();
    return families.map((family) => this.sanitizeFamilyForUser(family, currentUser));
  }

  async getFamilyById(id, currentUser) {
    this.validateId(id, 'Family ID');

    const family = await this.familyRepository.getFamilyById(id);

    if (!family) {
      throw new Error('Family not found');
    }

    this.ensureFamilyAccess(family, currentUser);

    return this.sanitizeFamilyForUser(family, currentUser);
  }

  async createFamily(familyData, currentUser) {
    const payload = this.buildFamilyPayload(familyData, currentUser);
    const family = await this.familyRepository.createFamily(payload);

    await this.syncParentsForFamily(family);
    return family;
  }

  async updateFamily(id, familyData, currentUser) {
    this.validateId(id, 'Family ID');
    const existingFamily = await this.getFamilyById(id, currentUser);
    const payload = this.buildFamilyPayload(familyData, currentUser, existingFamily);
    const family = await this.familyRepository.updateFamily(id, payload);

    await this.syncParentsForFamily(family);
    return family;
  }

  buildFamilyPayload(familyData, currentUser, existingFamily = {}) {
    const schoolId = this.resolveSchoolId(familyData.schoolId ?? existingFamily.SchoolID, currentUser);

    return {
      schoolId,
      familyName: this.requiredString(familyData.familyName ?? existingFamily.FamilyName, 'Family name', 255),
      primaryParentName: this.requiredString(
        familyData.primaryParentName ?? existingFamily.PrimaryParentName,
        'Primary parent name',
        255
      ),
      primaryParentIdNumber: this.optionalString(familyData.primaryParentIdNumber ?? existingFamily.PrimaryParentIdNumber, 'Primary parent ID number', 50),
      primaryParentPhone: this.optionalString(familyData.primaryParentPhone ?? existingFamily.PrimaryParentPhone, 'Primary parent phone', 50),
      primaryParentEmail: this.optionalEmail(familyData.primaryParentEmail ?? existingFamily.PrimaryParentEmail, 'Primary parent email'),
      primaryParentOccupation: this.optionalString(familyData.primaryParentOccupation ?? existingFamily.PrimaryParentOccupation, 'Primary parent occupation', 255),
      primaryParentWorkPhone: this.optionalString(familyData.primaryParentWorkPhone ?? existingFamily.PrimaryParentWorkPhone, 'Primary parent work phone', 50),
      secondaryParentName: this.optionalString(familyData.secondaryParentName ?? existingFamily.SecondaryParentName, 'Secondary parent name', 255),
      secondaryParentIdNumber: this.optionalString(familyData.secondaryParentIdNumber ?? existingFamily.SecondaryParentIdNumber, 'Secondary parent ID number', 50),
      secondaryParentPhone: this.optionalString(familyData.secondaryParentPhone ?? existingFamily.SecondaryParentPhone, 'Secondary parent phone', 50),
      secondaryParentEmail: this.optionalEmail(familyData.secondaryParentEmail ?? existingFamily.SecondaryParentEmail, 'Secondary parent email'),
      secondaryParentOccupation: this.optionalString(familyData.secondaryParentOccupation ?? existingFamily.SecondaryParentOccupation, 'Secondary parent occupation', 255),
      secondaryParentWorkPhone: this.optionalString(familyData.secondaryParentWorkPhone ?? existingFamily.SecondaryParentWorkPhone, 'Secondary parent work phone', 50),
      homeAddress: this.optionalString(familyData.homeAddress ?? existingFamily.HomeAddress, 'Home address', 500),
      emergencyContactName: this.optionalString(familyData.emergencyContactName ?? existingFamily.EmergencyContactName, 'Emergency contact name', 255),
      emergencyContactPhone: this.optionalString(familyData.emergencyContactPhone ?? existingFamily.EmergencyContactPhone, 'Emergency contact phone', 50),
      familyDoctor: this.optionalString(familyData.familyDoctor ?? existingFamily.FamilyDoctor, 'Family doctor', 255),
      medicalAidName: this.optionalString(familyData.medicalAidName ?? existingFamily.MedicalAidName, 'Medical aid', 255),
      medicalAidNumber: this.optionalString(familyData.medicalAidNumber ?? existingFamily.MedicalAidNumber, 'Medical aid number', 100)
    };
  }

  resolveSchoolId(schoolId, currentUser) {
    if (currentUser && currentUser.Role !== 'admin') {
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

  ensureFamilyAccess(family, currentUser) {
    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== family.SchoolID) {
      throw new Error('You can only access families for your own school');
    }
  }

  sanitizeFamilyForUser(family, currentUser) {
    const clone = { ...family };

    if (!this.canViewFamilyMedical(currentUser)) {
      [
        'FamilyDoctor',
        'MedicalAidName',
        'MedicalAidNumber'
      ].forEach((field) => {
        delete clone[field];
      });
    }

    if (!this.canViewIdDocuments(currentUser)) {
      [
        'PrimaryParentIdNumber',
        'SecondaryParentIdNumber'
      ].forEach((field) => {
        delete clone[field];
      });
    }

    return clone;
  }

  canViewFamilyMedical(currentUser) {
    if (!currentUser || currentUser.Role === 'admin') return true;
    return hasSchoolPermission(currentUser, [
      'school.parents.manage',
      'sensitive.student_medical.view'
    ]);
  }

  canViewIdDocuments(currentUser) {
    if (!currentUser || currentUser.Role === 'admin') return true;
    return hasSchoolPermission(currentUser, [
      'school.parents.manage',
      'sensitive.id_documents.view'
    ]);
  }

  async syncParentsForFamily(family) {
    if (!family || !Number.isInteger(Number(family.SchoolID)) || Number(family.SchoolID) <= 0) {
      return;
    }

    const parentEmails = [...new Set([
      family.PrimaryParentEmail,
      family.SecondaryParentEmail
    ].filter(Boolean).map((email) => String(email).trim().toLowerCase()))];

    for (const email of parentEmails) {
      if (!this.isValidEmail(email)) {
        throw new Error(`Invalid parent email address: ${email}`);
      }

      // Only link parents that already exist as verified parent users.
      // Auto-creating an unverified user here is no longer allowed - the
      // student-creation gate (/sms/students) rejects families where no
      // parent user has completed email + cellphone verification.
      //
      // To onboard a new parent, the school operator must use
      // /sms/families/:id/invite-parent which sends a proper invite.
      const existingUser = await this.userRepository.getUserByEmail(email);
      if (!existingUser) {
        continue;
      }
      if (existingUser.Role !== 'parent') {
        continue;
      }
      if (!existingUser.IsActive) {
        continue;
      }

      const existingLink = await this.parentRepository.getParentLinkByUserAndFamily(existingUser.UserID, family.FamilyID);
      if (!existingLink) {
        await this.parentRepository.createParentLink(existingUser.UserID, family.FamilyID, family.SchoolID);
      }
    }
  }

  isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  optionalEmail(value, label) {
    if (value === undefined || value === null) {
      return null;
    }

    const cleaned = String(value).trim();
    if (!cleaned) {
      return null;
    }

    if (!this.isValidEmail(cleaned)) {
      throw new Error(`${label} must be a valid email address`);
    }

    if (cleaned.length > 255) {
      throw new Error(`${label} must be 255 characters or less`);
    }

    return cleaned.toLowerCase();
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
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

module.exports = FamilyService;
