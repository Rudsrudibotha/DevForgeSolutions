// Business Layer - Class service

const ClassRepository = require('../data/classRepository');

class ClassService {
  constructor() {
    this.repo = new ClassRepository();
  }

  async getClasses(currentUser) {
    return await this.repo.getBySchool(this.resolveSchoolId(currentUser));
  }

  async getClassById(id, currentUser) {
    const cls = await this.repo.getById(id);
    if (!cls) throw new Error('Class not found');
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== cls.SchoolID) {
      throw new Error('You can only access classes for your own school');
    }
    return cls;
  }

  async createClass(data, currentUser) {
    const schoolId = this.resolveSchoolId(currentUser);
    if (!data.className || !String(data.className).trim()) throw new Error('Class name is required');
    return await this.repo.create({
      schoolId,
      className: data.className.trim(),
      teacherId: data.teacherId || null,
      capacity: data.capacity || null,
      activeYear: this.resolveActiveYear(data.classYear ?? data.activeYear)
    });
  }

  async updateClass(id, data, currentUser) {
    const existing = await this.getClassById(id, currentUser);
    const className = data.className !== undefined ? String(data.className || '').trim() : existing.ClassName;
    if (!className) throw new Error('Class name is required');

    return await this.repo.update(id, {
      className,
      teacherId: data.teacherId !== undefined ? data.teacherId : existing.TeacherID,
      capacity: data.capacity !== undefined ? data.capacity : existing.Capacity,
      activeYear: data.classYear !== undefined || data.activeYear !== undefined
        ? this.resolveActiveYear(data.classYear ?? data.activeYear)
        : existing.ActiveYear,
      isActive: data.isActive !== undefined ? data.isActive : existing.IsActive !== false
    });
  }

  async checkCapacity(classId, currentUser) {
    const cls = await this.getClassById(classId, currentUser);
    if (!cls) return { atCapacity: false };
    if (!cls.Capacity) return { atCapacity: false, capacity: null, current: cls.StudentCount || 0 };
    return { atCapacity: (cls.StudentCount || 0) >= cls.Capacity, capacity: cls.Capacity, current: cls.StudentCount || 0 };
  }

  async getTimetable(currentUser, classId) {
    return await this.repo.getTimetable(this.resolveSchoolId(currentUser), classId || null);
  }

  async addTimetableEntry(data, currentUser) {
    const schoolId = this.resolveSchoolId(currentUser);
    if (!data.classId || !data.dayOfWeek || !data.periodNumber) throw new Error('Class, day, and period are required');
    return await this.repo.addTimetableEntry({ schoolId, ...data });
  }

  resolveSchoolId(currentUser) {
    if (currentUser.Role === 'admin') return currentUser.SchoolID;
    if (!currentUser.SchoolID) throw new Error('School users must be linked to a school');
    return currentUser.SchoolID;
  }

  resolveActiveYear(value) {
    const year = value === undefined || value === null || value === ''
      ? new Date().getFullYear()
      : Number(value);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Class year must be between 2000 and 2100');
    }

    return year;
  }
}

module.exports = ClassService;
