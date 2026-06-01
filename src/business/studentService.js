// Business Layer - Student service logic

const StudentRepository = require('../data/studentRepository');
const FamilyRepository = require('../data/familyRepository');
const BillingCategoryRepository = require('../data/billingCategoryRepository');
const InvoiceRepository = require('../data/invoiceRepository');
const { hasSchoolPermission } = require('../security/schoolPermissions');

class StudentService {
  constructor(dependencies = {}) {
    this.studentRepository = dependencies.studentRepository || new StudentRepository();
    this.familyRepository = dependencies.familyRepository || new FamilyRepository();
    this.billingCategoryRepository = dependencies.billingCategoryRepository || new BillingCategoryRepository();
    this.invoiceRepository = dependencies.invoiceRepository || new InvoiceRepository();
    this.allowedStatuses = ['active', 'inactive', 'all'];
    this.departureReasons = ['Left', 'Absconded', 'Moved', 'Other'];
  }

  async getStudents(status, currentUser) {
    const normalizedStatus = this.normalizeStatus(status);

    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      const students = await this.studentRepository.getStudentsBySchool(currentUser.SchoolID, normalizedStatus, this.teacherScopeUserId(currentUser));
      return students.map((student) => this.sanitizeStudentForUser(student, currentUser));
    }

    const students = await this.studentRepository.getAllStudents(normalizedStatus);
    return students.map((student) => this.sanitizeStudentForUser(student, currentUser));
  }

  async getStudentById(id, currentUser) {
    this.validateId(id, 'Student ID');

    const student = await this.studentRepository.getStudentById(id);

    if (!student) {
      throw new Error('Student not found');
    }

    this.ensureStudentAccess(student, currentUser);
    await this.ensureTeacherStudentAccess(student, currentUser);

    return this.sanitizeStudentForUser(student, currentUser);
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

    const updated = await this.studentRepository.makeInactive(id, payload);
    await this.invoiceRepository.cancelUnpaidInvoicesAfterStudentDeparture(
      student.StudentID,
      student.SchoolID,
      payload.departureDate
    );

    return updated;
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
      currentAcademicYear: this.academicYear(studentData.currentAcademicYear ?? existingStudent.CurrentAcademicYear),
      billingDate: this.requiredDate(studentData.billingDate ?? existingStudent.BillingDate, 'Billing date'),
      enrolledDate: this.requiredDate(studentData.enrolledDate ?? existingStudent.EnrolledDate, 'Enrolled date'),
      medicalNotes: this.optionalString(studentData.medicalNotes ?? existingStudent.MedicalNotes, 'Medical notes', 1000),
      billingCategoryId,
      billingCategoryIds,
      monthlyDiscounts: this.normalizeMonthlyDiscounts(studentData, existingStudent),
      ...this.buildResponsiblePayerPayload(studentData, existingStudent, family)
    };
  }

  buildResponsiblePayerPayload(studentData, existingStudent, family) {
    const type = this.normalizeResponsiblePayerType(
      studentData.responsiblePayerType ?? existingStudent.ResponsiblePayerType ?? 'Primary parent'
    );
    const parentContact = this.familyPayerContact(family, type);
    const responsiblePayerName = this.optionalString(
      studentData.responsiblePayerName ?? existingStudent.ResponsiblePayerName ?? parentContact.name,
      'Responsible payer name',
      255
    );
    const responsiblePayerPhone = this.optionalString(
      studentData.responsiblePayerPhone ?? existingStudent.ResponsiblePayerPhone ?? parentContact.phone,
      'Responsible payer phone',
      50
    );
    const responsiblePayerEmail = this.optionalString(
      studentData.responsiblePayerEmail ?? existingStudent.ResponsiblePayerEmail ?? parentContact.email,
      'Responsible payer email',
      255
    );

    if (!responsiblePayerName) {
      throw new Error('Responsible payer is required');
    }

    return {
      responsiblePayerType: type,
      responsiblePayerName,
      responsiblePayerPhone,
      responsiblePayerEmail
    };
  }

  normalizeResponsiblePayerType(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (['secondary', 'secondary parent', 'father'].includes(normalized)) {
      return 'Secondary parent';
    }

    if (['other', 'custom', 'guardian'].includes(normalized)) {
      return 'Other';
    }

    return 'Primary parent';
  }

  familyPayerContact(family, type) {
    if (type === 'Secondary parent') {
      return {
        name: family.SecondaryParentName,
        phone: family.SecondaryParentPhone,
        email: family.SecondaryParentEmail
      };
    }

    if (type === 'Primary parent') {
      return {
        name: family.PrimaryParentName,
        phone: family.PrimaryParentPhone,
        email: family.PrimaryParentEmail
      };
    }

    return {
      name: null,
      phone: null,
      email: null
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

  normalizeMonthlyDiscounts(studentData, existingStudent = {}) {
    if (studentData.monthlyDiscounts === undefined) {
      return undefined;
    }

    const raw = typeof studentData.monthlyDiscounts === 'string'
      ? this.parseJsonArray(studentData.monthlyDiscounts, 'Monthly discounts')
      : studentData.monthlyDiscounts;

    if (!Array.isArray(raw)) {
      throw new Error('Monthly discounts must be submitted as a list');
    }

    const enrolledDate = this.requiredDate(studentData.enrolledDate ?? existingStudent.EnrolledDate, 'Enrolled date');
    const enrolled = new Date(`${enrolledDate}T00:00:00`);
    const enrolledYear = enrolled.getFullYear();
    const enrolledMonth = enrolled.getMonth() + 1;
    const discounts = [];

    for (const item of raw) {
      const year = Number(item.year ?? item.DiscountYear);
      const month = Number(item.month ?? item.DiscountMonth);
      const amount = Math.round(Number(item.amount ?? item.Amount ?? 0) * 100) / 100;

      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error('Discount year must be between 2000 and 2100');
      }

      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('Discount month must be between 1 and 12');
      }

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Discount amount must be zero or more');
      }

      if (this.isBeforeEnrolmentMonth(year, month, enrolledYear, enrolledMonth) && amount > 0) {
        throw new Error('Discount cannot be applied before the learner enrolment month');
      }

      discounts.push({ year, month, amount });
    }

    return discounts;
  }

  parseJsonArray(value, label) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      // Use the common validation message below.
    }

    throw new Error(`${label} must be a valid list`);
  }

  isBeforeEnrolmentMonth(year, month, enrolledYear, enrolledMonth) {
    return year < enrolledYear || (year === enrolledYear && month < enrolledMonth);
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

  async ensureTeacherStudentAccess(student, currentUser) {
    const teacherUserId = this.teacherScopeUserId(currentUser);
    if (!teacherUserId) return;

    const assignedStudents = await this.studentRepository.getStudentsBySchool(student.SchoolID, 'all', teacherUserId);
    const canAccess = assignedStudents.some((item) => Number(item.StudentID) === Number(student.StudentID));
    if (!canAccess) throw new Error('You can only access students in your assigned classes');
  }

  teacherScopeUserId(currentUser) {
    if (!currentUser || currentUser.Role === 'admin') return null;
    if (hasSchoolPermission(currentUser, ['school.students.view', 'school.students.manage'])) return null;
    if (hasSchoolPermission(currentUser, ['classes.view_assigned', 'attendance.view_assigned', 'attendance.submit_assigned'])) {
      return currentUser.UserID;
    }
    return null;
  }

  sanitizeStudentForUser(student, currentUser) {
    if (this.canViewStudentBilling(currentUser)) {
      return student;
    }

    const clone = { ...student };
    [
      'BillingDate',
      'BillingCategoryID',
      'BillingCategoriesJson',
      'MonthlyDiscountsJson',
      'CategoryName',
      'CategoryAmount',
      'CategoryFrequency',
      'CategoryIsActive',
      'ResponsiblePayerType',
      'ResponsiblePayerName',
      'ResponsiblePayerPhone',
      'ResponsiblePayerEmail'
    ].forEach((field) => {
      delete clone[field];
    });
    return clone;
  }

  canViewStudentBilling(currentUser) {
    if (!currentUser || currentUser.Role === 'admin') return true;
    return hasSchoolPermission(currentUser, [
      'school.students.manage',
      'finance.invoices.view',
      'finance.invoices.create',
      'finance.invoices.edit',
      'finance.payments.view',
      'finance.payments.allocate',
      'finance.outstanding_fees.view',
      'reports.finance.view'
    ]);
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

  academicYear(value) {
    const year = Number(value || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Academic year must be between 2000 and 2100');
    }
    return year;
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
