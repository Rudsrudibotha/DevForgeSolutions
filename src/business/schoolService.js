// Business Layer - School service logic
// This service owns school tenant validation and access rules.

const SchoolRepository = require('../data/schoolRepository');

class SchoolService {
  constructor() {
    this.schoolRepository = new SchoolRepository();
  }

  // Admins see every school; school users see only their linked school.
  async getAllSchools(currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      const school = await this.schoolRepository.getSchoolById(currentUser.SchoolID);
      return school ? [school] : [];
    }

    return await this.schoolRepository.getAllSchools();
  }

  // Get school by ID with tenant access enforcement when a user context is supplied.
  async getSchoolById(id, currentUser) {
    this.validateId(id, 'School ID');

    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== id) {
      throw new Error('You can only access your own school');
    }

    const school = await this.schoolRepository.getSchoolById(id);

    if (!school) {
      throw new Error('School not found');
    }

    return school;
  }

  // Create a new school tenant.
  async createSchool(schoolData) {
    if (!schoolData.schoolName || !schoolData.schoolName.trim()) {
      throw new Error('School name is required');
    }

    return await this.schoolRepository.createSchool(schoolData);
  }

  // Update school details.
  async updateSchool(id, schoolData) {
    this.validateId(id, 'School ID');

    if (!schoolData.schoolName || !schoolData.schoolName.trim()) {
      throw new Error('School name is required');
    }

    await this.getSchoolById(id);

    return await this.schoolRepository.updateSchool(id, schoolData);
  }

  // Delete a school after confirming it exists.
  async deleteSchool(id) {
    this.validateId(id, 'School ID');
    await this.getSchoolById(id);

    return await this.schoolRepository.deleteSchool(id);
  }

  // Suspend a school subscription.
  async suspendSchool(id) {
    this.validateId(id, 'School ID');

    const success = await this.schoolRepository.suspendSchool(id);

    if (!success) {
      throw new Error('School not found');
    }

    return { message: 'School suspended successfully' };
  }

  // Activate a school subscription.
  async activateSchool(id) {
    this.validateId(id, 'School ID');

    const success = await this.schoolRepository.activateSchool(id);

    if (!success) {
      throw new Error('School not found');
    }

    return { message: 'School activated successfully' };
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }
}

module.exports = SchoolService;
