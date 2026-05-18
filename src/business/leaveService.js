// Business Layer - Leave request service logic

const LeaveRepository = require('../data/leaveRepository');
const EmployeeRepository = require('../data/employeeRepository');
const { getSchoolPermissions, hasSchoolPermission } = require('../security/schoolPermissions');

class LeaveService {
  constructor() {
    this.leaveRepository = new LeaveRepository();
    this.employeeRepository = new EmployeeRepository();
    this.leaveTypes = ['Annual', 'Sick', 'Family', 'Unpaid', 'Other'];
    this.statuses = ['Pending', 'Approved', 'Rejected'];
  }

  async getLeaves(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.leaveRepository.getAllLeaves();
    }

    return await this.leaveRepository.getLeavesBySchool(currentUser.SchoolID);
  }

  async getMyLeaves(currentUser) {
    const employee = await this.employeeRepository.getEmployeeByUserId(currentUser.UserID);
    if (!employee) {
      throw new Error('No employee record linked to your account');
    }
    return await this.leaveRepository.getLeavesByEmployee(employee.EmployeeID);
  }

  async getLeaveById(id, currentUser) {
    this.validateId(id, 'Leave request ID');
    const leave = await this.leaveRepository.getLeaveById(id);
    if (!leave) {
      throw new Error('Leave request not found');
    }
    this.ensureAccess(leave, currentUser);
    return leave;
  }

  async submitLeave(data, currentUser) {
    const employee = await this.resolveLeaveEmployee(data, currentUser);

    const payload = this.buildPayload(data, employee.EmployeeID);

    if (payload.leaveType !== 'Unpaid' && payload.days > employee.LeaveBalance) {
      throw new Error(`Insufficient leave balance. Available: ${employee.LeaveBalance} days`);
    }

    return await this.leaveRepository.createLeave(payload);
  }

  async resolveLeaveEmployee(data, currentUser) {
    const requestedEmployeeId = Number(data.employeeId || 0);

    if (requestedEmployeeId) {
      if (!(await this.canCaptureForStaff(currentUser))) {
        throw new Error('Leave management permission is required to capture leave for staff');
      }

      const employee = await this.employeeRepository.getEmployeeById(requestedEmployeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      this.ensureEmployeeAccess(employee, currentUser);
      return employee;
    }

    const employee = await this.employeeRepository.getEmployeeByUserId(currentUser.UserID);
    if (!employee) {
      throw new Error('No employee record linked to your account');
    }
    return employee;
  }

  async reviewLeave(id, status, currentUser) {
    this.validateId(id, 'Leave request ID');

    if (!this.statuses.includes(status) || status === 'Pending') {
      throw new Error('Status must be Approved or Rejected');
    }

    const leave = await this.getLeaveById(id, currentUser);

    if (leave.Status !== 'Pending') {
      throw new Error('Only pending leave requests can be reviewed');
    }

    const result = await this.leaveRepository.updateLeaveStatus(id, status, currentUser.UserID);

    // Deduct leave balance on approval
    if (status === 'Approved' && leave.LeaveType !== 'Unpaid') {
      const employee = await this.employeeRepository.getEmployeeById(leave.EmployeeID);
      const newBalance = Math.max(0, (employee.LeaveBalance || 0) - leave.Days);
      await this.employeeRepository.updateEmployee(leave.EmployeeID, this.employeeUpdatePayload(employee, newBalance));
    }

    return result;
  }

  employeeUpdatePayload(employee, leaveBalance) {
    return {
      employeeNumber: employee.EmployeeNumber,
      firstName: employee.FirstName,
      lastName: employee.LastName,
      email: employee.Email,
      phone: employee.Phone,
      jobTitle: employee.JobTitle,
      department: employee.Department,
      startDate: employee.StartDate,
      salary: employee.Salary,
      leaveBalance,
      isActive: employee.IsActive !== false,
      idNumber: employee.IdNumber,
      passportNumber: employee.PassportNumber,
      taxNumber: employee.TaxNumber,
      uifNumber: employee.UifNumber,
      paymentMethod: employee.PaymentMethod,
      bankName: employee.BankName,
      bankAccountNumber: employee.BankAccountNumber,
      branchCode: employee.BranchCode,
      accountType: employee.AccountType,
      standardAllowances: employee.StandardAllowances,
      standardDeductions: employee.StandardDeductions,
      taxPaye: employee.TaxPaye,
      uifDeduction: employee.UifDeduction
    };
  }

  buildPayload(data, employeeId) {
    const leaveType = String(data.leaveType || '').trim();
    if (!this.leaveTypes.includes(leaveType)) {
      throw new Error(`Leave type must be one of: ${this.leaveTypes.join(', ')}`);
    }

    if (!data.startDate || !data.endDate) {
      throw new Error('Start date and end date are required');
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    if (end < start) {
      throw new Error('End date must be on or after start date');
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    return {
      employeeId,
      leaveType,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      days,
      reason: data.reason ? String(data.reason).trim().slice(0, 500) : null
    };
  }

  ensureAccess(leave, currentUser) {
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== leave.SchoolID) {
      throw new Error('You can only access leave requests for your own school');
    }
  }

  ensureEmployeeAccess(employee, currentUser) {
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== employee.SchoolID) {
      throw new Error('You can only capture leave for employees in your own school');
    }
  }

  async canCaptureForStaff(currentUser) {
    if (currentUser.Role === 'admin') {
      return true;
    }

    const permissions = currentUser.SchoolPermissions || await getSchoolPermissions(currentUser);
    const permissionUser = {
      ...currentUser,
      SchoolPermissions: permissions,
      SchoolPermissionSet: new Set(permissions)
    };

    return hasSchoolPermission(permissionUser, [
      'leave.view_all',
      'leave.approve',
      'leave.decline',
      'school.staff.manage'
    ]);
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }
}

module.exports = LeaveService;
