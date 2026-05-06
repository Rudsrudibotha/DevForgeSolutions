// Business Layer - Attendance service

const AttendanceRepository = require('../data/attendanceRepository');
const ParentRepository = require('../data/parentRepository');

class AttendanceService {
  constructor() {
    this.repo = new AttendanceRepository();
    this.parentRepository = new ParentRepository();
    this.validStatuses = ['Present', 'Absent'];
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
      arrivalTime: this.optionalTime(data.arrivalTime),
      departureTime: this.optionalTime(data.departureTime),
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
        arrivalTime: this.optionalTime(record.arrivalTime),
        departureTime: this.optionalTime(record.departureTime),
        notes: record.notes || null, recordedBy: currentUser.UserID
      });
      results.push(result);
    }
    return results;
  }

  async undoTime(attendanceId, field, currentUser) {
    const parsedId = Number(attendanceId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new Error('Attendance ID must be a positive integer');
    }

    if (!['arrival', 'departure'].includes(field)) {
      throw new Error('Undo field must be arrival or departure');
    }

    const updated = await this.repo.undoTime(parsedId, this.resolveSchoolId(currentUser), field, currentUser.UserID);
    if (!updated) {
      throw new Error('Attendance record not found');
    }

    return updated;
  }

  async getByDate(date, currentUser) {
    return await this.repo.getBySchoolAndDate(this.resolveSchoolId(currentUser), date);
  }

  async getByRange(fromDate, toDate, currentUser) {
    if (!fromDate || !toDate) {
      throw new Error('From date and to date are required');
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error('Date range is invalid');
    }
    if (from > to) {
      throw new Error('From date must be before to date');
    }
    if (to >= today) {
      throw new Error('Completed attendance excludes today');
    }

    return await this.repo.getBySchoolAndRange(this.resolveSchoolId(currentUser), fromDate, toDate);
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

  optionalTime(value) {
    if (value === '') {
      return '';
    }

    if (!value) {
      return null;
    }

    const normalized = String(value).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(normalized)) {
      throw new Error('Time must use HH:mm format');
    }

    return normalized.length === 5 ? `${normalized}:00` : normalized;
  }
}

module.exports = AttendanceService;
