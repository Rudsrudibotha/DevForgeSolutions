// Business Layer - Payslip service logic
// Enforces HR permission, finalization (read-only), school-scoped access, and staff self-view rules.

const PayslipRepository = require('../data/payslipRepository');
const EmployeeRepository = require('../data/employeeRepository');
const SchoolRepository = require('../data/schoolRepository');

class PayslipService {
  constructor() {
    this.payslipRepository = new PayslipRepository();
    this.employeeRepository = new EmployeeRepository();
    this.schoolRepository = new SchoolRepository();
  }

  // Get all payslips — requires HR permission for school users.
  async getPayslips(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.payslipRepository.getAllPayslips();
    }

    this.requireHrPermission(currentUser);
    return await this.payslipRepository.getPayslipsBySchool(currentUser.SchoolID);
  }

  // Get previous (finalized) payslips — requires HR permission.
  async getPreviousPayslips(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.payslipRepository.getAllPayslips();
    }

    this.requireHrPermission(currentUser);
    return await this.payslipRepository.getPreviousPayslipsBySchool(currentUser.SchoolID);
  }

  // Staff self-service: view own payslips only if school allows it.
  async getMyPayslips(currentUser) {
    const employee = await this.employeeRepository.getEmployeeByUserId(currentUser.UserID);
    if (!employee) {
      throw new Error('No employee record linked to your account');
    }

    // Check school-level toggle
    if (employee.SchoolID) {
      const school = await this.schoolRepository.getSchoolById(employee.SchoolID);
      if (!school || !school.AllowStaffPayslipView) {
        throw new Error('Your school has not enabled staff payslip viewing');
      }
    }

    return await this.payslipRepository.getPayslipsByEmployee(employee.EmployeeID);
  }

  // View a single payslip — HR permission required unless viewing own.
  async getPayslipById(id, currentUser) {
    this.validateId(id, 'Payslip ID');
    const payslip = await this.payslipRepository.getPayslipById(id);
    if (!payslip) {
      throw new Error('Payslip not found');
    }

    // School scope check
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== payslip.SchoolID) {
      throw new Error('You can only access payslips for your own school');
    }

    // If not admin, check if viewing own or has HR permission
    if (currentUser.Role !== 'admin') {
      const employee = await this.employeeRepository.getEmployeeByUserId(currentUser.UserID);
      const isOwnPayslip = employee && employee.EmployeeID === payslip.EmployeeID;

      if (isOwnPayslip) {
        const school = await this.schoolRepository.getSchoolById(payslip.SchoolID);
        if (!school || !school.AllowStaffPayslipView) {
          throw new Error('Your school has not enabled staff payslip viewing');
        }
      } else {
        this.requireHrPermission(currentUser);
      }
    }

    return payslip;
  }

  // Create a payslip — requires HR permission.
  async createPayslip(data, currentUser) {
    if (currentUser.Role !== 'admin') {
      this.requireHrPermission(currentUser);
    }

    this.validateId(Number(data.employeeId), 'Employee ID');

    const employee = await this.employeeRepository.getEmployeeById(Number(data.employeeId));
    if (!employee) {
      throw new Error('Employee not found');
    }

    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== employee.SchoolID) {
      throw new Error('You can only create payslips for your own school');
    }

    const payPeriod = String(data.payPeriod || '').trim();
    if (!/^\d{4}-\d{2}$/.test(payPeriod)) {
      throw new Error('Pay period must be in YYYY-MM format');
    }

    const exists = await this.payslipRepository.payslipExistsForPeriod(employee.EmployeeID, payPeriod);
    if (exists) {
      throw new Error('A payslip already exists for this employee and period');
    }

    const grossAmount = Number(data.grossAmount || employee.Salary || 0);
    const deductions = Number(data.deductions || 0);
    if (grossAmount <= 0) {
      throw new Error('Gross amount must be positive');
    }

    return await this.payslipRepository.createPayslip({
      employeeId: employee.EmployeeID,
      payPeriod,
      grossAmount,
      deductions,
      netAmount: grossAmount - deductions,
      notes: data.notes ? String(data.notes).trim().slice(0, 500) : null
    });
  }

  // Finalize a payslip — makes it read-only. Requires HR permission.
  async finalizePayslip(id, currentUser) {
    this.validateId(id, 'Payslip ID');

    if (currentUser.Role !== 'admin') {
      this.requireHrPermission(currentUser);
    }

    const payslip = await this.payslipRepository.getPayslipById(id);
    if (!payslip) {
      throw new Error('Payslip not found');
    }

    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== payslip.SchoolID) {
      throw new Error('You can only finalize payslips for your own school');
    }

    if (payslip.IsFinalized) {
      throw new Error('Payslip is already finalized');
    }

    const result = await this.payslipRepository.finalizePayslip(id);
    if (!result) {
      throw new Error('Failed to finalize payslip');
    }

    return result;
  }

  requireHrPermission(currentUser) {
    if (!currentUser.HasHrPermission) {
      throw new Error('HR permission is required to access payslip records');
    }
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }
}

module.exports = PayslipService;
