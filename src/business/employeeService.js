// Business Layer - Employee service logic

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const EmployeeRepository = require('../data/employeeRepository');
const UserRepository = require('../data/userRepository');
const { StaffRoleRepository } = require('../data/permissionLeaveYearEndRepositories');

class EmployeeService {
  constructor(dependencies = {}) {
    this.employeeRepository = dependencies.employeeRepository || new EmployeeRepository();
    this.userRepository = dependencies.userRepository || new UserRepository();
    this.staffRoleRepository = dependencies.staffRoleRepository || new StaffRoleRepository();
  }

  async getEmployees(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.employeeRepository.getAllEmployees();
    }

    return await this.employeeRepository.getEmployeesBySchool(this.resolveSchoolId(currentUser));
  }

  async getPayrollOptions(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.employeeRepository.getAllPayrollOptions();
    }

    return await this.employeeRepository.getPayrollOptionsBySchool(this.resolveSchoolId(currentUser));
  }

  async getEmployeeById(id, currentUser) {
    this.validateId(id, 'Employee ID');
    const employee = await this.employeeRepository.getEmployeeById(id);

    if (!employee) {
      throw new Error('Employee not found');
    }

    this.ensureAccess(employee, currentUser);
    return employee;
  }

  async getEmployeeByUserId(userId) {
    return await this.employeeRepository.getEmployeeByUserId(userId);
  }

  async createEmployee(data, currentUser) {
    const schoolId = this.resolveSchoolId(currentUser, data.schoolId);
    const payload = this.buildPayload(data, schoolId);
    const employee = await this.employeeRepository.createEmployee(payload);

    if (this.shouldCreateSystemUser(data)) {
      return await this.createSystemUserForEmployee(employee, data, currentUser);
    }

    return employee;
  }

  async updateEmployee(id, data, currentUser) {
    this.validateId(id, 'Employee ID');
    const existing = await this.getEmployeeById(id, currentUser);
    const payload = this.buildPayload(data, existing.SchoolID, existing);
    const updated = await this.employeeRepository.updateEmployee(id, payload);

    if (existing.UserID) {
      await this.userRepository.setUserActive(existing.UserID, updated.IsActive !== false && updated.IsActive !== 0);
      if (data.staffRoleId && updated.IsActive !== false && updated.IsActive !== 0) {
        await this.replaceEmployeeRole(existing.UserID, data.staffRoleId, updated.SchoolID, currentUser);
      }
    }

    return updated;
  }

  buildPayload(data, schoolId, existing = {}) {
    return {
      schoolId,
      userId: data.userId ?? existing.UserID ?? null,
      employeeNumber: this.optionalString(data.employeeNumber ?? existing.EmployeeNumber, 'Employee number', 50),
      payrollNumber: this.optionalString(data.payrollNumber ?? existing.PayrollNumber, 'Payroll number', 50),
      firstName: this.requiredString(data.firstName ?? existing.FirstName, 'First name', 255),
      lastName: this.requiredString(data.lastName ?? existing.LastName, 'Last name', 255),
      email: this.optionalString(data.email ?? existing.Email, 'Email', 255),
      phone: this.optionalString(data.phone ?? existing.Phone, 'Phone', 50),
      physicalAddress: this.optionalString(data.physicalAddress ?? existing.PhysicalAddress, 'Physical address', 500),
      jobTitle: this.optionalString(data.jobTitle ?? existing.JobTitle, 'Job title', 255),
      department: this.optionalString(data.department ?? existing.Department, 'Department', 255),
      startDate: data.startDate ?? existing.StartDate ?? new Date().toISOString().slice(0, 10),
      salary: Number(data.salary ?? existing.Salary ?? 0),
      leaveBalance: Number.isInteger(Number(data.leaveBalance)) ? Number(data.leaveBalance) : (existing.LeaveBalance ?? 21),
      isActive: data.isActive !== undefined ? data.isActive : (existing.IsActive !== undefined ? existing.IsActive : true),
      idNumber: this.optionalString(data.idNumber ?? existing.IdNumber, 'ID number', 50),
      passportNumber: this.optionalString(data.passportNumber ?? existing.PassportNumber, 'Passport number', 50),
      taxNumber: this.optionalString(data.taxNumber ?? existing.TaxNumber, 'Tax number', 50),
      payeReference: this.optionalString(data.payeReference ?? existing.PayeReference, 'PAYE reference', 50),
      uifNumber: this.optionalString(data.uifNumber ?? existing.UifNumber, 'UIF number', 50),
      uifReferenceNumber: this.optionalString(data.uifReferenceNumber ?? existing.UifReferenceNumber, 'UIF reference number', 50),
      paymentMethod: this.optionalString(data.paymentMethod ?? existing.PaymentMethod, 'Payment method', 50),
      bankName: this.optionalString(data.bankName ?? existing.BankName, 'Bank name', 100),
      bankAccountNumber: this.optionalString(data.bankAccountNumber ?? existing.BankAccountNumber, 'Bank account number', 50),
      branchCode: this.optionalString(data.branchCode ?? existing.BranchCode, 'Branch code', 20),
      accountType: this.optionalString(data.accountType ?? existing.AccountType, 'Account type', 50),
      standardAllowances: Number(data.standardAllowances ?? existing.StandardAllowances ?? 0),
      standardDeductions: Number(data.standardDeductions ?? existing.StandardDeductions ?? 0),
      taxPaye: Number(data.taxPaye ?? existing.TaxPaye ?? 0),
      uifDeduction: Number(data.uifDeduction ?? existing.UifDeduction ?? 0)
    };
  }

  shouldCreateSystemUser(data) {
    return data?.createSystemUser === true || data?.createSystemUser === 'true';
  }

  async createSystemUserForEmployee(employee, data, currentUser) {
    const schoolId = Number(employee.SchoolID);
    const email = this.requiredString(employee.Email, 'Staff email', 255).toLowerCase();
    const username = this.normalizeUsername(data.username || email);
    const password = String(data.password || this.generateTemporaryPassword());
    const staffRoleId = this.positiveInteger(data.staffRoleId, 'Access role');

    if (!this.isValidEmail(email)) {
      throw new Error('A valid staff email address is required before dashboard access can be created');
    }

    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error('Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens');
    }

    this.validatePassword(password);

    const role = await this.staffRoleRepository.getById(staffRoleId, schoolId);
    if (!role || role.IsActive === false) {
      throw new Error('Access role not found for this school');
    }

    const existingEmail = await this.userRepository.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('A user with this staff email already exists');
    }

    const existingUsername = await this.userRepository.getUserRecordBySchoolAndUsername(schoolId, username);
    if (existingUsername) {
      throw new Error('A user with this username already exists for this school');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepository.createUser({
      email,
      username,
      passwordHash,
      role: 'school',
      schoolId
    });

    const linkedEmployee = await this.employeeRepository.linkEmployeeUser(employee.EmployeeID, schoolId, user.UserID);
    await this.staffRoleRepository.assignRole(user.UserID, staffRoleId, schoolId, currentUser?.UserID);

    return linkedEmployee || { ...employee, UserID: user.UserID };
  }

  async replaceEmployeeRole(userId, staffRoleId, schoolId, currentUser) {
    const roleId = this.positiveInteger(staffRoleId, 'Access role');
    const role = await this.staffRoleRepository.getById(roleId, schoolId);

    if (!role || role.IsActive === false) {
      throw new Error('Access role not found for this school');
    }

    const existingRoles = await this.staffRoleRepository.getUserRoles(userId, schoolId);
    for (const existingRole of existingRoles) {
      if (Number(existingRole.StaffRoleID) !== Number(roleId)) {
        await this.staffRoleRepository.removeRole(userId, existingRole.StaffRoleID, schoolId);
      }
    }

    if (!existingRoles.some((existingRole) => Number(existingRole.StaffRoleID) === Number(roleId))) {
      await this.staffRoleRepository.assignRole(userId, roleId, schoolId, currentUser?.UserID);
    }
  }

  resolveSchoolId(currentUser, explicitSchoolId) {
    if (currentUser.Role !== 'admin') {
      if (!currentUser.SchoolID) {
        throw new Error('School users must be linked to a school');
      }
      return currentUser.SchoolID;
    }

    const id = Number(explicitSchoolId || currentUser.SchoolID);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('School ID is required');
    }
    return id;
  }

  ensureAccess(employee, currentUser) {
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== employee.SchoolID) {
      throw new Error('You can only access employees for your own school');
    }
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }

  positiveInteger(value, label) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${label} is required`);
    }

    return parsed;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('Password must be at least 8 characters long and include both letters and numbers');
    }
  }

  generateTemporaryPassword() {
    return `Kch${crypto.randomBytes(9).toString('base64url')}7`;
  }

  normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
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

module.exports = EmployeeService;
