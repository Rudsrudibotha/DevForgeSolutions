// Business Layer - Employee service logic

const EmployeeRepository = require('../data/employeeRepository');

class EmployeeService {
  constructor() {
    this.employeeRepository = new EmployeeRepository();
  }

  async getEmployees(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.employeeRepository.getAllEmployees();
    }

    return await this.employeeRepository.getEmployeesBySchool(this.resolveSchoolId(currentUser));
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
    return await this.employeeRepository.createEmployee(payload);
  }

  async updateEmployee(id, data, currentUser) {
    this.validateId(id, 'Employee ID');
    const existing = await this.getEmployeeById(id, currentUser);
    const payload = this.buildPayload(data, existing.SchoolID, existing);
    return await this.employeeRepository.updateEmployee(id, payload);
  }

  buildPayload(data, schoolId, existing = {}) {
    return {
      schoolId,
      userId: data.userId ?? existing.UserID ?? null,
      firstName: this.requiredString(data.firstName ?? existing.FirstName, 'First name', 255),
      lastName: this.requiredString(data.lastName ?? existing.LastName, 'Last name', 255),
      email: this.optionalString(data.email ?? existing.Email, 'Email', 255),
      phone: this.optionalString(data.phone ?? existing.Phone, 'Phone', 50),
      jobTitle: this.optionalString(data.jobTitle ?? existing.JobTitle, 'Job title', 255),
      department: this.optionalString(data.department ?? existing.Department, 'Department', 255),
      startDate: data.startDate ?? existing.StartDate ?? new Date().toISOString().slice(0, 10),
      salary: Number(data.salary ?? existing.Salary ?? 0),
      leaveBalance: Number.isInteger(Number(data.leaveBalance)) ? Number(data.leaveBalance) : (existing.LeaveBalance ?? 21),
      isActive: data.isActive !== undefined ? data.isActive : (existing.IsActive !== undefined ? existing.IsActive : true)
    };
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
