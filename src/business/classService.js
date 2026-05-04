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
    return await this.repo.create({ schoolId, className: data.className.trim(), teacherId: data.teacherId || null, capacity: data.capacity || null });
  }

  async updateClass(id, data, currentUser) {
    await this.getClassById(id, currentUser);
    return await this.repo.update(id, data);
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
}

module.exports = ClassService;
