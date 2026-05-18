// Application Layer - Re-enrolment, School Templates, Platform Usage routes

const express = require('express');
const { authenticateToken, requireSchoolPermission, requireAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { ReEnrolmentRepository, SchoolTemplateRepository, PlatformUsageRepository } = require('../data/rolloverTemplateRepositories');
const StudentRepository = require('../data/studentRepository');
const ClassRepository = require('../data/classRepository');

const router = express.Router();
const reEnrolmentRepo = new ReEnrolmentRepository();
const templateRepo = new SchoolTemplateRepository();
const usageRepo = new PlatformUsageRepository();
const studentRepo = new StudentRepository();
const classRepo = new ClassRepository();

function schoolId(user) {
  if (user.Role === 'admin') return user.SchoolID;
  if (!user.SchoolID) throw new Error('School users must be linked to a school');
  return user.SchoolID;
}

function validateAcademicYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Academic year must be between 2000 and 2100');
  }
  return year;
}

async function validateNextYearClass(sid, academicYear, action, newClassName) {
  if (!['Promoted', 'Retained'].includes(action)) {
    return null;
  }

  const className = String(newClassName || '').trim();
  if (!className) {
    throw new Error(`Select a class created for ${academicYear}`);
  }

  const targetClass = await classRepo.getBySchoolYearAndName(sid, academicYear, className);
  if (!targetClass) {
    throw new Error(`Class "${className}" must be an active class created for ${academicYear}`);
  }

  return targetClass;
}

function ensureNextAcademicYear(student, academicYear, action) {
  if (!['Promoted', 'Retained'].includes(action)) {
    return;
  }

  const currentYear = Number(student.CurrentAcademicYear || new Date().getFullYear());
  if (academicYear <= currentYear) {
    throw new Error(`Target academic year must be after the learner's current academic year (${currentYear})`);
  }
}

// =============================================
// RE-ENROLMENT / YEAR ROLLOVER
// =============================================

// Get re-enrolment records for a year
router.get('/re-enrolment/:year', authenticateToken, requireSchoolPermission('school.year_rollover.preview', 'school.year_rollover.apply', 'reports.year_end.view'), async (req, res) => {
  try {
    res.json(await reEnrolmentRepo.getBySchoolAndYear(schoolId(req.user), parseInt(req.params.year, 10)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get students not yet processed for re-enrolment
router.get('/re-enrolment/:year/pending', authenticateToken, requireSchoolPermission('school.year_rollover.preview', 'school.year_rollover.apply'), async (req, res) => {
  try {
    res.json(await reEnrolmentRepo.getPendingStudents(schoolId(req.user), parseInt(req.params.year, 10)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Process a single student for re-enrolment
router.post('/re-enrolment', authenticateToken, requireSchoolPermission('school.year_rollover.apply'), audit('ReEnrolment', 'Process'), async (req, res) => {
  try {
    const { academicYear, studentId, newClassName, action } = req.body;
    const validActions = ['Promoted', 'Left', 'Retained', 'Pending'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Action must be one of: ${validActions.join(', ')}` });
    }
    if (!academicYear || !studentId) {
      return res.status(400).json({ error: 'Academic year and student ID are required' });
    }

    const sid = schoolId(req.user);
    const targetYear = validateAcademicYear(academicYear);

    // Get student current state for balance carry-forward
    const student = await studentRepo.getStudentById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (Number(student.SchoolID) !== Number(sid)) return res.status(404).json({ error: 'Student not found for this school' });
    ensureNextAcademicYear(student, targetYear, action);
    await validateNextYearClass(sid, targetYear, action, newClassName);

    const record = await reEnrolmentRepo.processStudent({
      schoolId: sid,
      academicYear: targetYear,
      studentId: Number(studentId),
      previousClassName: student.ClassName,
      newClassName: newClassName || null,
      action,
      balanceCarriedForward: Number(req.body.balanceCarriedForward || 0),
      advanceCreditCarriedForward: Number(req.body.advanceCreditCarriedForward || 0),
      processedBy: req.user.UserID
    });

    if (['Promoted', 'Retained'].includes(action) && newClassName) {
      await studentRepo.updateAcademicPlacement(studentId, {
        schoolId: sid,
        className: newClassName,
        currentAcademicYear: targetYear
      });
    }

    // If left, mark student inactive
    if (action === 'Left') {
      await studentRepo.makeInactive(studentId, {
        departureDate: new Date().toISOString().slice(0, 10),
        departureReason: 'Left',
        departureNote: `Year rollover ${academicYear}`
      });
    }

    res.status(201).json(record);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Bulk process re-enrolment
router.post('/re-enrolment/bulk', authenticateToken, requireSchoolPermission('school.year_rollover.apply'), audit('ReEnrolment', 'BulkProcess'), async (req, res) => {
  try {
    const { academicYear, records } = req.body;
    if (!academicYear || !Array.isArray(records) || !records.length) {
      return res.status(400).json({ error: 'Academic year and records array are required' });
    }

    const sid = schoolId(req.user);
    const results = [];

    for (const record of records) {
      try {
        const student = await studentRepo.getStudentById(record.studentId);
        if (!student) continue;
        if (Number(student.SchoolID) !== Number(sid)) continue;
        const targetYear = validateAcademicYear(academicYear);
        const action = record.action || 'Pending';
        ensureNextAcademicYear(student, targetYear, action);
        await validateNextYearClass(sid, targetYear, action, record.newClassName);

        const processed = await reEnrolmentRepo.processStudent({
          schoolId: sid,
          academicYear: targetYear,
          studentId: Number(record.studentId),
          previousClassName: student.ClassName,
          newClassName: record.newClassName || null,
          action,
          balanceCarriedForward: Number(record.balanceCarriedForward || 0),
          advanceCreditCarriedForward: Number(record.advanceCreditCarriedForward || 0),
          processedBy: req.user.UserID
        });

        if (['Promoted', 'Retained'].includes(action) && record.newClassName) {
          await studentRepo.updateAcademicPlacement(record.studentId, {
            schoolId: sid,
            className: record.newClassName,
            currentAcademicYear: targetYear
          });
        }

        if (action === 'Left') {
          await studentRepo.makeInactive(record.studentId, {
            departureDate: new Date().toISOString().slice(0, 10),
            departureReason: 'Left',
            departureNote: `Year rollover ${academicYear}`
          });
        }

        results.push(processed);
      } catch (err) {
        results.push({ studentId: record.studentId, error: err.message });
      }
    }

    res.status(201).json({ processed: results.length, results });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// =============================================
// SCHOOL SETUP TEMPLATES (DevForge only)
// =============================================

router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json(await templateRepo.getAll()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const template = await templateRepo.getById(parseInt(req.params.id, 10));
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/templates', authenticateToken, requireAdmin, audit('SchoolTemplate', 'Create'), async (req, res) => {
  try {
    if (!req.body.templateName) return res.status(400).json({ error: 'Template name is required' });
    res.status(201).json(await templateRepo.create(req.body));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/templates/:id', authenticateToken, requireAdmin, audit('SchoolTemplate', 'Update'), async (req, res) => {
  try {
    res.json(await templateRepo.update(parseInt(req.params.id, 10), req.body));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Apply a template to a school (does NOT overwrite — just marks which template was applied)
router.post('/templates/:id/apply/:schoolId', authenticateToken, requireAdmin, audit('SchoolTemplate', 'Apply'), async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const targetSchoolId = parseInt(req.params.schoolId, 10);
    const template = await templateRepo.getById(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    await templateRepo.markSchoolTemplate(targetSchoolId, templateId);
    res.json({ message: `Template "${template.TemplateName}" applied to school ${targetSchoolId}`, template });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// =============================================
// PLATFORM USAGE REPORT (DevForge only)
// =============================================

router.get('/platform-usage', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json(await usageRepo.getUsageReport()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/platform-usage/trends', authenticateToken, requireAdmin, async (req, res) => {
  try { res.json(await usageRepo.getUsageTrends()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
