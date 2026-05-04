// Business Layer - Student service logic

const StudentRepository = require('../data/studentRepository');
const FamilyRepository = require('../data/familyRepository');
const BillingCategoryRepository = require('../data/billingCategoryRepository');

class StudentService {
  constructor() {
    this.studentRepository = new StudentRepository();
    this.familyRepository = new FamilyRepository();
    this.billingCategoryRepository = new BillingCategoryRepository();
    this.allowedStatuses = ['active', 'inactive', 'all'];
    this.departureReasons = ['Left', 'Absconded', 'Moved', 'Other'];
  }

  async getStudents(status, currentUser) {
    const normalizedStatus = this.normalizeStatus(status);

    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      return await this.studentRepository.getStudentsBySchool(currentUser.SchoolID, normalizedStatus);
    }

    return await this.studentRepository.getAllStudents(normalizedStatus);
  }

  async getStudentById(id, currentUser) {
    this.validateId(id, 'Student ID');

    const student = await this.studentRepository.getStudentById(id);

    if (!student) {
      throw new Error('Student not found');
    }

    this.ensureStudentAccess(student, currentUser);

    return student;
  }

  async createStudent(studentData, currentUser) {
    const payload = await this.buildStudentPayload(studentData, currentUser);

    return await this.studentRepository.createStudent(payload);
  }

  async updateStudent(id, studentData, currentUser) {
    this.validateId(id, 'Student ID');
    const existingStudent = await this.getStudentById(id, currentUser);
    const payload = await this.buildStudentPayload(studentData, currentUser, existingStudent);

    return await this.studentRepository.updateStudent(id, payload);
  }

  async makeInactive(id, departureData, currentUser) {
    const student = await this.getStudentById(id, currentUser);

    if (!student.IsActive) {
      throw new Error('Student is already inactive');
    }

    const payload = this.buildDeparturePayload(departureData);

    return await this.studentRepository.makeInactive(id, payload);
  }

  async buildStudentPayload(studentData, currentUser, existingStudent = {}) {
    const schoolId = this.resolveSchoolId(studentData.schoolId ?? existingStudent.SchoolID, currentUser);
    const familyId = this.requiredId(Number(studentData.familyId ?? existingStudent.FamilyID), 'Family');
    const family = await this.familyRepository.getFamilyById(familyId);

    if (!family) {
      throw new Error('Family not found');
    }

    if (family.SchoolID !== schoolId) {
      throw new Error('Family must belong to the selected school');
    }

    const billingCategoryIds = this.normalizeBillingCategoryIds(studentData, existingStudent);
    const billingCategoryId = billingCategoryIds[0] || null;

    if (!billingCategoryId) {
      throw new Error('Billing category is required for every student');
    }

    for (const categoryId of billingCategoryIds) {
      const billingCategory = await this.billingCategoryRepository.getCategoryById(categoryId);

      if (!billingCategory || !billingCategory.IsActive) {
        throw new Error('Billing category is not active');
      }

      if (billingCategory.SchoolID !== schoolId) {
        throw new Error('Billing category must belong to the selected school');
      }
    }

    return {
      schoolId,
      familyId,
      firstName: this.requiredString(studentData.firstName ?? existingStudent.FirstName, 'First name', 255),
      lastName: this.requiredString(studentData.lastName ?? existingStudent.LastName, 'Last name', 255),
      dateOfBirth: this.optionalDate(studentData.dateOfBirth ?? existingStudent.DateOfBirth, 'Date of birth'),
      homePhone: this.optionalString(studentData.homePhone ?? existingStudent.HomePhone, 'Home phone', 50),
      homeAddress: this.optionalString(studentData.homeAddress ?? existingStudent.HomeAddress, 'Home address', 500),
      className: this.optionalString(studentData.className ?? existingStudent.ClassName, 'Class', 100),
      billingDate: this.requiredDate(studentData.billingDate ?? existingStudent.BillingDate, 'Billing date'),
      enrolledDate: this.requiredDate(studentData.enrolledDate ?? existingStudent.EnrolledDate, 'Enrolled date'),
      medicalNotes: this.optionalString(studentData.medicalNotes ?? existingStudent.MedicalNotes, 'Medical notes', 1000),
      billingCategoryId,
      billingCategoryIds
    };
  }

  normalizeBillingCategoryIds(studentData, existingStudent) {
    let parsedExisting = [];

    if (existingStudent.BillingCategoriesJson) {
      try {
        parsedExisting = JSON.parse(existingStudent.BillingCategoriesJson)
          .map((category) => category.BillingCategoryID);
      } catch (error) {
        parsedExisting = [];
      }
    }

    const raw = studentData.billingCategoryIds !== undefined
      ? studentData.billingCategoryIds
      : studentData.billingCategoryId !== undefined
        ? [studentData.billingCategoryId]
        : parsedExisting.length
          ? parsedExisting
          : [existingStudent.BillingCategoryID];

    return [...new Set((Array.isArray(raw) ? raw : [raw])
      .flatMap((value) => String(value || '').split(','))
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0))];
  }

  buildDeparturePayload(departureData) {
    const departureReason = String(departureData.departureReason || '').trim();

    if (!this.departureReasons.includes(departureReason)) {
      throw new Error(`Reason of departure must be one of: ${this.departureReasons.join(', ')}`);
    }

    const departureNote = this.optionalString(departureData.departureNote, 'Reason detail', 500);

    if (departureReason === 'Other' && !departureNote) {
      throw new Error('Reason detail is required when Other is selected');
    }

    return {
      departureDate: this.requiredDate(departureData.departureDate, 'Departure date'),
      departureReason,
      departureNote
    };
  }

  normalizeStatus(status) {
    const normalizedStatus = String(status || 'active').trim().toLowerCase();

    if (!this.allowedStatuses.includes(normalizedStatus)) {
      throw new Error('Student status filter is invalid');
    }

    return normalizedStatus;
  }

  resolveSchoolId(schoolId, currentUser) {
    if (currentUser && currentUser.Role !== 'admin') {
      if (!currentUser.SchoolID) {
        throw new Error('School users must be linked to a school');
      }

      return currentUser.SchoolID;
    }

    return this.requiredId(Number(schoolId), 'School');
  }

  ensureStudentAccess(student, currentUser) {
    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== student.SchoolID) {
      throw new Error('You can only access students for your own school');
    }
  }

  requiredId(value, label) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${label} ID must be a positive integer`);
    }

    return value;
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

  requiredDate(value, label) {
    const date = this.optionalDate(value, label);

    if (!date) {
      throw new Error(`${label} is required`);
    }

    return date;
  }

  optionalDate(value, label) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`${label} is invalid`);
    }

    return date.toISOString().slice(0, 10);
  }
}

module.exports = StudentService;
