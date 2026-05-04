// Business Layer - Family service logic

const FamilyRepository = require('../data/familyRepository');

class FamilyService {
  constructor() {
    this.familyRepository = new FamilyRepository();
  }

  async getFamilies(currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      return await this.familyRepository.getFamiliesBySchool(currentUser.SchoolID);
    }

    return await this.familyRepository.getAllFamilies();
  }

  async getFamilyById(id, currentUser) {
    this.validateId(id, 'Family ID');

    const family = await this.familyRepository.getFamilyById(id);

    if (!family) {
      throw new Error('Family not found');
    }

    this.ensureFamilyAccess(family, currentUser);

    return family;
  }

  async createFamily(familyData, currentUser) {
    const payload = this.buildFamilyPayload(familyData, currentUser);

    return await this.familyRepository.createFamily(payload);
  }

  async updateFamily(id, familyData, currentUser) {
    this.validateId(id, 'Family ID');
    const existingFamily = await this.getFamilyById(id, currentUser);
    const payload = this.buildFamilyPayload(familyData, currentUser, existingFamily);

    return await this.familyRepository.updateFamily(id, payload);
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
      primaryParentEmail: this.optionalString(familyData.primaryParentEmail ?? existingFamily.PrimaryParentEmail, 'Primary parent email', 255),
      primaryParentOccupation: this.optionalString(familyData.primaryParentOccupation ?? existingFamily.PrimaryParentOccupation, 'Primary parent occupation', 255),
      primaryParentWorkPhone: this.optionalString(familyData.primaryParentWorkPhone ?? existingFamily.PrimaryParentWorkPhone, 'Primary parent work phone', 50),
      secondaryParentName: this.optionalString(familyData.secondaryParentName ?? existingFamily.SecondaryParentName, 'Secondary parent name', 255),
      secondaryParentIdNumber: this.optionalString(familyData.secondaryParentIdNumber ?? existingFamily.SecondaryParentIdNumber, 'Secondary parent ID number', 50),
      secondaryParentPhone: this.optionalString(familyData.secondaryParentPhone ?? existingFamily.SecondaryParentPhone, 'Secondary parent phone', 50),
      secondaryParentEmail: this.optionalString(familyData.secondaryParentEmail ?? existingFamily.SecondaryParentEmail, 'Secondary parent email', 255),
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
