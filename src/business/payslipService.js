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

  async getPayslips(currentUser, options = {}) {
    if (currentUser.Role === 'admin') return await this.payslipRepository.getAllPayslips();
    this.requireHrPermission(currentUser);
    return await this.payslipRepository.getPayslipsBySchool(currentUser.SchoolID, options);
  }

  async getPreviousPayslips(currentUser) {
    if (currentUser.Role === 'admin') return await this.payslipRepository.getAllPayslips();
    this.requireHrPermission(currentUser);
    return await this.payslipRepository.getPreviousPayslipsBySchool(currentUser.SchoolID);
  }

  async getMyPayslips(currentUser) {
    const employee = await this.employeeRepository.getEmployeeByUserId(currentUser.UserID);
    if (!employee) throw new Error('No employee record linked to your account');
    if (employee.SchoolID) {
      const school = await this.schoolRepository.getSchoolById(employee.SchoolID);
      if (!school || !school.AllowStaffPayslipView) throw new Error('Your school has not enabled staff payslip viewing');
    }
    return await this.payslipRepository.getPayslipsByEmployee(employee.EmployeeID);
  }

  async getPayslipById(id, currentUser) {
    this.validateId(id, 'Payslip ID');
    const payslip = await this.payslipRepository.getPayslipById(id);
    if (!payslip) throw new Error('Payslip not found');

    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== payslip.SchoolID) {
      throw new Error('You can only access payslips for your own school');
    }

    if (currentUser.Role !== 'admin') {
      const employee = await this.employeeRepository.getEmployeeByUserId(currentUser.UserID);
      const isOwnPayslip = employee && employee.EmployeeID === payslip.EmployeeID;
      if (isOwnPayslip) {
        const school = await this.schoolRepository.getSchoolById(payslip.SchoolID);
        if (!school || !school.AllowStaffPayslipView) throw new Error('Your school has not enabled staff payslip viewing');
      } else {
        this.requireHrPermission(currentUser);
      }
    }
    return payslip;
  }

  async createPayslip(data, currentUser) {
    if (currentUser.Role !== 'admin') this.requireHrPermission(currentUser);

    this.validateId(Number(data.employeeId), 'Employee ID');
    const employee = await this.employeeRepository.getEmployeeById(Number(data.employeeId));
    if (!employee) throw new Error('Employee not found');
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== employee.SchoolID) {
      throw new Error('You can only create payslips for your own school');
    }

    const payPeriod = String(data.payPeriod || '').trim();
    if (!/^\d{4}-\d{2}$/.test(payPeriod)) throw new Error('Pay period must be in YYYY-MM format');

    const exists = await this.payslipRepository.payslipExistsForPeriod(employee.EmployeeID, payPeriod);
    if (exists) throw new Error('A payslip already exists for this employee and period');

    // Copy from previous month if available, otherwise use employee defaults
    let defaults = {};
    if (data.copyFromPrevious !== false) {
      const previous = await this.payslipRepository.getLatestFinalizedPayslip(employee.EmployeeID);
      if (previous) {
        defaults = {
          basicSalary: previous.BasicSalary, allowances: previous.Allowances,
          overtime: previous.Overtime, bonus: previous.Bonus,
          deductions: previous.Deductions, leaveDeduction: previous.LeaveDeduction,
          taxPaye: previous.TaxPaye, uifDeduction: previous.UifDeduction,
          otherDeductions: previous.OtherDeductions
        };
      }
    }

    // Use provided values, fall back to previous month, then employee defaults
    const basicSalary = Number(data.basicSalary ?? defaults.basicSalary ?? employee.Salary ?? 0);
    const allowances = Number(data.allowances ?? defaults.allowances ?? employee.StandardAllowances ?? 0);
    const overtime = Number(data.overtime ?? defaults.overtime ?? 0);
    const bonus = Number(data.bonus ?? defaults.bonus ?? 0);
    const leaveDeduction = Number(data.leaveDeduction ?? defaults.leaveDeduction ?? 0);
    const taxPaye = Number(data.taxPaye ?? defaults.taxPaye ?? employee.TaxPaye ?? 0);
    const uifDeduction = Number(data.uifDeduction ?? defaults.uifDeduction ?? employee.UifDeduction ?? 0);
    const otherDeductions = Number(data.otherDeductions ?? defaults.otherDeductions ?? 0);

    const grossAmount = basicSalary + allowances + overtime + bonus;
    const totalDeductions = leaveDeduction + taxPaye + uifDeduction + otherDeductions;
    const netAmount = grossAmount - totalDeductions;

    if (grossAmount <= 0) throw new Error('Gross amount must be positive');

    return await this.payslipRepository.createPayslip({
      employeeId: employee.EmployeeID, payPeriod, basicSalary, allowances, overtime, bonus,
      grossAmount, deductions: totalDeductions, leaveDeduction, taxPaye, uifDeduction, otherDeductions,
      netAmount, notes: data.notes ? String(data.notes).trim().slice(0, 500) : null,
      paymentDate: data.paymentDate || null, status: 'Draft', createdBy: currentUser.UserID
    });
  }

  async updatePayslip(id, data, currentUser) {
    this.validateId(id, 'Payslip ID');
    if (currentUser.Role !== 'admin') this.requireHrPermission(currentUser);

    const payslip = await this.payslipRepository.getPayslipById(id);
    if (!payslip) throw new Error('Payslip not found');
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== payslip.SchoolID) {
      throw new Error('You can only edit payslips for your own school');
    }
    if (payslip.IsFinalized) throw new Error('Finalized payslips cannot be edited');

    const basicSalary = Number(data.basicSalary ?? payslip.BasicSalary ?? 0);
    const allowances = Number(data.allowances ?? payslip.Allowances ?? 0);
    const overtime = Number(data.overtime ?? payslip.Overtime ?? 0);
    const bonus = Number(data.bonus ?? payslip.Bonus ?? 0);
    const leaveDeduction = Number(data.leaveDeduction ?? payslip.LeaveDeduction ?? 0);
    const taxPaye = Number(data.taxPaye ?? payslip.TaxPaye ?? 0);
    const uifDeduction = Number(data.uifDeduction ?? payslip.UifDeduction ?? 0);
    const otherDeductions = Number(data.otherDeductions ?? payslip.OtherDeductions ?? 0);

    const grossAmount = basicSalary + allowances + overtime + bonus;
    const totalDeductions = leaveDeduction + taxPaye + uifDeduction + otherDeductions;
    const netAmount = grossAmount - totalDeductions;

    return await this.payslipRepository.updatePayslip(id, {
      basicSalary, allowances, overtime, bonus, grossAmount,
      deductions: totalDeductions, leaveDeduction, taxPaye, uifDeduction, otherDeductions,
      netAmount, notes: data.notes !== undefined ? String(data.notes || '').trim().slice(0, 500) : payslip.Notes,
      paymentDate: data.paymentDate || payslip.PaymentDate
    });
  }

  async finalizePayslip(id, currentUser) {
    this.validateId(id, 'Payslip ID');
    if (currentUser.Role !== 'admin') this.requireHrPermission(currentUser);

    const payslip = await this.payslipRepository.getPayslipById(id);
    if (!payslip) throw new Error('Payslip not found');
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== payslip.SchoolID) {
      throw new Error('You can only finalize payslips for your own school');
    }
    if (payslip.IsFinalized) throw new Error('Payslip is already finalized');

    const result = await this.payslipRepository.finalizePayslip(id, currentUser.UserID);
    if (!result) throw new Error('Failed to finalize payslip');
    return result;
  }

  requireHrPermission(currentUser) {
    if (!currentUser.HasHrPermission) throw new Error('HR permission is required to access payslip records');
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) throw new Error(`${label} must be a positive integer`);
  }
}

module.exports = PayslipService;
