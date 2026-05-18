const ReportRepository = require('../data/reportRepository');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class ReportService {
  constructor() {
    this.reportRepository = new ReportRepository();
  }

  async getSchoolReport(currentUser, filters = {}) {
    const schoolId = this.resolveSchoolId(currentUser);
    const year = this.academicYear(filters.year);
    const className = this.optionalString(filters.className);
    const data = await this.reportRepository.getSchoolReportData(schoolId, { year, className });

    if (!data.school) {
      throw new Error('School not found');
    }

    return this.buildReport(data, { year, className });
  }

  buildReport(data, filters) {
    const students = data.students || [];
    const invoices = data.invoices || [];
    const transactions = data.transactions || [];
    const attendance = data.attendance || [];
    const admissions = data.admissions || [];
    const consent = data.consent || [];
    const reEnrolment = data.reEnrolment || [];
    const balancesForward = data.balancesForward || [];

    return {
      generatedAt: new Date().toISOString(),
      filters,
      school: data.school,
      classOptions: (data.classOptions || []).map((item) => item.ClassName).filter(Boolean),
      students: this.studentReport(students, filters.year),
      finance: this.financeReport(invoices, transactions),
      attendance: this.attendanceReport(attendance),
      admissions: this.admissionsReport(admissions),
      consent: this.consentReport(consent),
      reEnrolment: this.reEnrolmentReport(reEnrolment),
      yearEnd: this.yearEndReport(data.yearEnd || [], balancesForward)
    };
  }

  studentReport(students, year) {
    const active = students.filter((student) => student.IsActive !== false && student.IsActive !== 0);
    const left = students.filter((student) => student.DepartureDate && this.yearOf(student.DepartureDate) === year);
    const newEnrolments = students.filter((student) => this.yearOf(student.EnrolledDate) === year);
    const birthdays = students
      .filter((student) => student.DateOfBirth)
      .map((student) => ({
        StudentID: student.StudentID,
        FirstName: student.FirstName,
        LastName: student.LastName,
        ClassName: student.ClassName,
        DateOfBirth: student.DateOfBirth,
        AgeThisYear: this.ageOn(student.DateOfBirth, `${year}-12-31`)
      }))
      .sort((a, b) => this.monthDay(a.DateOfBirth).localeCompare(this.monthDay(b.DateOfBirth)));

    return {
      rows: students,
      birthdays,
      stats: {
        total: students.length,
        active: active.length,
        inactive: students.length - active.length,
        left: left.length,
        newEnrolments: newEnrolments.length
      },
      byClass: this.countBy(students, (student) => student.ClassName || 'No class'),
      byGender: this.countBy(students, (student) => student.Gender || 'Not captured'),
      byAgeBand: this.countBy(students, (student) => this.ageBand(this.ageOn(student.DateOfBirth, `${year}-12-31`))),
      enrolmentByMonth: this.monthlyCounts(students, 'EnrolledDate')
    };
  }

  financeReport(invoices, transactions) {
    const totalInvoiced = this.sum(invoices, 'Amount');
    const totalPaidOnInvoices = this.sum(invoices, 'AmountPaid');
    const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)), 0);
    const advance = invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.AmountPaid || 0) - Number(invoice.Amount || 0)), 0);
    const collectionRate = totalInvoiced > 0 ? (totalPaidOnInvoices / totalInvoiced) * 100 : 0;
    const overdueRows = invoices.filter((invoice) => ['Overdue', 'Partial', 'Pending'].includes(invoice.Status) && Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)) > 0);

    return {
      rows: invoices,
      transactions,
      overdueRows,
      stats: {
        invoiceCount: invoices.length,
        totalInvoiced,
        totalPaid: totalPaidOnInvoices,
        outstanding,
        advance,
        collectionRate
      },
      monthly: MONTHS.map((label, index) => {
        const monthInvoices = invoices.filter((invoice) => this.monthOf(invoice.IssueDate) === index + 1);
        const invoiced = this.sum(monthInvoices, 'Amount');
        const paid = this.sum(monthInvoices, 'AmountPaid');
        return {
          label,
          month: index + 1,
          invoiced,
          paid,
          outstanding: Math.max(0, invoiced - paid),
          collectionRate: invoiced > 0 ? (paid / invoiced) * 100 : 0
        };
      }),
      byClass: this.groupFinanceByClass(invoices)
    };
  }

  attendanceReport(attendance) {
    const total = attendance.length;
    const byStatus = this.countBy(attendance, (row) => row.Status || 'Unknown');
    const present = Number(byStatus.Present || 0);
    const late = Number(byStatus.Late || 0);
    const absent = Number(byStatus.Absent || 0);
    const excused = Number(byStatus.Excused || 0);

    return {
      rows: attendance,
      stats: {
        total,
        present,
        late,
        absent,
        excused,
        attendanceRate: total > 0 ? ((present + late) / total) * 100 : 0
      },
      byStatus,
      byClass: this.groupAttendanceByClass(attendance),
      monthly: MONTHS.map((label, index) => {
        const rows = attendance.filter((row) => this.monthOf(row.AttendanceDate) === index + 1);
        const rowsByStatus = this.countBy(rows, (row) => row.Status || 'Unknown');
        const monthTotal = rows.length;
        const monthPresent = Number(rowsByStatus.Present || 0) + Number(rowsByStatus.Late || 0);
        return {
          label,
          month: index + 1,
          total: monthTotal,
          present: Number(rowsByStatus.Present || 0),
          late: Number(rowsByStatus.Late || 0),
          absent: Number(rowsByStatus.Absent || 0),
          excused: Number(rowsByStatus.Excused || 0),
          attendanceRate: monthTotal > 0 ? (monthPresent / monthTotal) * 100 : 0
        };
      })
    };
  }

  admissionsReport(admissions) {
    return {
      rows: admissions,
      stats: {
        total: admissions.length,
        enrolled: admissions.filter((item) => item.Status === 'Enrolled').length,
        accepted: admissions.filter((item) => item.Status === 'Accepted').length,
        waitlisted: admissions.filter((item) => item.Status === 'Waitlisted').length,
        refused: admissions.filter((item) => item.Status === 'Refused' || item.Status === 'Rejected').length
      },
      byStatus: this.countBy(admissions, (item) => item.Status || 'New'),
      monthly: this.monthlyCounts(admissions, 'AppliedDate')
    };
  }

  consentReport(consent) {
    return {
      rows: consent,
      stats: {
        total: consent.length,
        pending: consent.filter((item) => item.Response === 'Pending').length,
        accepted: consent.filter((item) => item.Response === 'Accepted').length,
        declined: consent.filter((item) => item.Response === 'Declined').length
      },
      byResponse: this.countBy(consent, (item) => item.Response || 'Pending'),
      byClass: this.countBy(consent, (item) => item.ClassName || 'No class')
    };
  }

  reEnrolmentReport(rows) {
    return {
      rows,
      stats: {
        total: rows.length,
        promoted: rows.filter((item) => item.Action === 'Promoted').length,
        retained: rows.filter((item) => item.Action === 'Retained').length,
        left: rows.filter((item) => item.Action === 'Left').length,
        pending: rows.filter((item) => item.Action === 'Pending').length
      },
      byAction: this.countBy(rows, (item) => item.Action || 'Pending')
    };
  }

  yearEndReport(yearEndRows, balancesForward) {
    return {
      rows: yearEndRows,
      balancesForward,
      stats: {
        records: yearEndRows.length,
        totalOutstanding: this.sum(yearEndRows, 'TotalOutstanding') || this.sum(balancesForward, 'OutstandingAmount'),
        totalAdvanceCredit: this.sum(yearEndRows, 'TotalAdvanceCredit') || this.sum(balancesForward, 'AdvanceCreditAmount'),
        totalInvoiced: this.sum(yearEndRows, 'TotalInvoiced'),
        totalPaid: this.sum(yearEndRows, 'TotalPaid')
      }
    };
  }

  groupFinanceByClass(invoices) {
    const groups = new Map();
    invoices.forEach((invoice) => {
      const key = invoice.ClassName || 'No class';
      if (!groups.has(key)) {
        groups.set(key, { label: key, invoiceCount: 0, invoiced: 0, paid: 0, outstanding: 0, collectionRate: 0 });
      }
      const group = groups.get(key);
      const amount = Number(invoice.Amount || 0);
      const paid = Number(invoice.AmountPaid || 0);
      group.invoiceCount += 1;
      group.invoiced += amount;
      group.paid += paid;
      group.outstanding += Math.max(0, amount - paid);
      group.collectionRate = group.invoiced > 0 ? (group.paid / group.invoiced) * 100 : 0;
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  groupAttendanceByClass(attendance) {
    const groups = new Map();
    attendance.forEach((row) => {
      const key = row.ClassName || 'No class';
      if (!groups.has(key)) {
        groups.set(key, { label: key, total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 });
      }
      const group = groups.get(key);
      group.total += 1;
      const status = row.Status || 'Unknown';
      if (status === 'Present') group.present += 1;
      if (status === 'Absent') group.absent += 1;
      if (status === 'Late') group.late += 1;
      if (status === 'Excused') group.excused += 1;
      group.attendanceRate = group.total > 0 ? ((group.present + group.late) / group.total) * 100 : 0;
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  countBy(rows, keyFn) {
    return rows.reduce((counts, row) => {
      const key = keyFn(row);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  monthlyCounts(rows, dateField) {
    return MONTHS.map((label, index) => ({
      label,
      month: index + 1,
      count: rows.filter((row) => this.monthOf(row[dateField]) === index + 1).length
    }));
  }

  sum(rows, field) {
    return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
  }

  monthOf(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getMonth() + 1 : 0;
  }

  yearOf(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : 0;
  }

  ageOn(dateOfBirth, onDate) {
    const dob = dateOfBirth ? new Date(dateOfBirth) : null;
    const target = onDate ? new Date(onDate) : new Date();
    if (!dob || Number.isNaN(dob.getTime())) return null;
    let age = target.getFullYear() - dob.getFullYear();
    const birthdayThisYear = new Date(target.getFullYear(), dob.getMonth(), dob.getDate());
    if (target < birthdayThisYear) age -= 1;
    return age;
  }

  ageBand(age) {
    if (!Number.isFinite(age)) return 'Not captured';
    if (age <= 5) return '0-5';
    if (age <= 7) return '6-7';
    if (age <= 9) return '8-9';
    if (age <= 12) return '10-12';
    return '13+';
  }

  monthDay(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '99-99';
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  academicYear(value) {
    const year = Number(value || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Report year must be between 2000 and 2100');
    }
    return year;
  }

  optionalString(value) {
    const cleaned = String(value || '').trim();
    return cleaned && cleaned !== 'all' ? cleaned.slice(0, 100) : null;
  }

  resolveSchoolId(currentUser) {
    if (!currentUser || currentUser.Role !== 'school' || !currentUser.SchoolID) {
      throw new Error('Reports are only available inside the logged-in school context');
    }
    return currentUser.SchoolID;
  }
}

module.exports = ReportService;
