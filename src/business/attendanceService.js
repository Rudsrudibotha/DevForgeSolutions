// Business Layer - Attendance service

const AttendanceRepository = require('../data/attendanceRepository');
const ParentRepository = require('../data/parentRepository');

class AttendanceService {
  constructor() {
    this.repo = new AttendanceRepository();
    this.parentRepository = new ParentRepository();
    this.validStatuses = ['Present', 'Absent', 'Late', 'Excused'];
  }

  async recordAttendance(data, currentUser) {
    const schoolId = this.resolveSchoolId(currentUser);
    if (!this.validStatuses.includes(data.status)) {
      throw new Error(`Status must be one of: ${this.validStatuses.join(', ')}`);
    }
    if (!data.studentId || !data.attendanceDate) {
      throw new Error('Student ID and attendance date are required');
    }
    return await this.repo.recordAttendance({
      schoolId, studentId: Number(data.studentId), classId: data.classId ? Number(data.classId) : null,
      attendanceDate: data.attendanceDate, status: data.status,
      notes: data.notes || null, recordedBy: currentUser.UserID
    });
  }

  async recordBulkAttendance(records, currentUser) {
    const schoolId = this.resolveSchoolId(currentUser);
    const results = [];
    for (const record of records) {
      if (!this.validStatuses.includes(record.status)) continue;
      const result = await this.repo.recordAttendance({
        schoolId, studentId: Number(record.studentId), classId: record.classId ? Number(record.classId) : null,
        attendanceDate: record.attendanceDate, status: record.status,
        notes: record.notes || null, recordedBy: currentUser.UserID
      });
      results.push(result);
    }
    return results;
  }

  async getByDate(date, currentUser) {
    return await this.repo.getBySchoolAndDate(this.resolveSchoolId(currentUser), date);
  }

  async getByStudent(studentId, fromDate, toDate, currentUser) {
    const parsedStudentId = Number(studentId);

    if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
      throw new Error('Student ID must be a positive integer');
    }

    if (currentUser.Role === 'parent') {
      const students = await this.parentRepository.getStudentsByParentUserId(currentUser.UserID);
      const canAccess = students.some((student) => student.StudentID === parsedStudentId);

      if (!canAccess) {
        throw new Error('You can only view attendance for your own linked children');
      }

      return await this.repo.getByStudent(parsedStudentId, fromDate, toDate);
    }

    const schoolId = this.resolveSchoolId(currentUser);
    return await this.repo.getByStudentForSchool(parsedStudentId, schoolId, fromDate, toDate);
  }

  async getSummary(fromDate, toDate, currentUser) {
    return await this.repo.getSummaryBySchool(this.resolveSchoolId(currentUser), fromDate, toDate);
  }

  resolveSchoolId(currentUser) {
    if (currentUser.Role === 'admin') return currentUser.SchoolID;
    if (!currentUser.SchoolID) throw new Error('School users must be linked to a school');
    return currentUser.SchoolID;
  }
}

module.exports = AttendanceService;
