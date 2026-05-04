// Application Layer - Staff Roles, Leave Types, Leave Balances, Year-End Closing routes

const express = require('express');
const { authenticateToken, requireSchoolOrAdmin, requireAdmin } = require('../middleware/auth');
const { audit, auditLog } = require('../middleware/audit');
const { StaffRoleRepository, LeaveTypeRepository, LeaveBalanceRepository, YearEndClosingRepository } = require('../data/permissionLeaveYearEndRepositories');

const router = express.Router();
const roleRepo = new StaffRoleRepository();
const leaveTypeRepo = new LeaveTypeRepository();
const leaveBalanceRepo = new LeaveBalanceRepository();
const yearEndRepo = new YearEndClosingRepository();

function schoolId(user) {
  if (user.Role === 'admin') return user.SchoolID;
  if (!user.SchoolID) throw new Error('School users must be linked to a school');
  return user.SchoolID;
}

// =============================================
// STAFF ROLES & PERMISSIONS
// =============================================

router.get('/roles', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await roleRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/roles/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const role = await roleRepo.getById(parseInt(req.params.id, 10));
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/roles', authenticateToken, requireSchoolOrAdmin, audit('StaffRole', 'Create'), async (req, res) => {
  try {
    if (!req.body.roleName) return res.status(400).json({ error: 'Role name is required' });
    res.status(201).json(await roleRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/roles/:id', authenticateToken, requireSchoolOrAdmin, audit('StaffRole', 'Update'), async (req, res) => {
  try { res.json(await roleRepo.update(parseInt(req.params.id, 10), req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/roles/user/:userId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await roleRepo.getUserRoles(parseInt(req.params.userId, 10))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/roles/assign', authenticateToken, requireSchoolOrAdmin, audit('StaffRole', 'Assign'), async (req, res) => {
  try {
    if (!req.body.userId || !req.body.staffRoleId) return res.status(400).json({ error: 'User ID and role ID are required' });
    auditLog.log({ userId: req.user.UserID, schoolId: schoolId(req.user), entityName: 'RoleAssignment',
      entityId: req.body.userId, action: 'Assign', after: { staffRoleId: req.body.staffRoleId, assignedBy: req.user.UserID }, ipAddress: req.ip });
    res.status(201).json(await roleRepo.assignRole(Number(req.body.userId), Number(req.body.staffRoleId), req.user.UserID));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/roles/assign/:userId/:staffRoleId', authenticateToken, requireSchoolOrAdmin, audit('StaffRole', 'Remove'), async (req, res) => {
  try {
    await roleRepo.removeRole(parseInt(req.params.userId, 10), parseInt(req.params.staffRoleId, 10));
    res.json({ message: 'Role removed' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// =============================================
// LEAVE TYPES
// =============================================

router.get('/leave-types', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await leaveTypeRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leave-types/active', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await leaveTypeRepo.getActiveBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leave-types', authenticateToken, requireSchoolOrAdmin, audit('LeaveType', 'Create'), async (req, res) => {
  try {
    if (!req.body.leaveTypeName) return res.status(400).json({ error: 'Leave type name is required' });
    res.status(201).json(await leaveTypeRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/leave-types/:id', authenticateToken, requireSchoolOrAdmin, audit('LeaveType', 'Update'), async (req, res) => {
  try { res.json(await leaveTypeRepo.update(parseInt(req.params.id, 10), req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// =============================================
// LEAVE BALANCES
// =============================================

router.get('/leave-balances/:employeeId/:year', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await leaveBalanceRepo.getByEmployee(parseInt(req.params.employeeId, 10), parseInt(req.params.year, 10))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leave-balances/initialize', authenticateToken, requireSchoolOrAdmin, audit('LeaveBalance', 'Initialize'), async (req, res) => {
  try {
    const { employeeId, leaveTypeId, year, allocation } = req.body;
    if (!employeeId || !leaveTypeId || !year) return res.status(400).json({ error: 'Employee, leave type, and year are required' });
    res.status(201).json(await leaveBalanceRepo.getOrCreate(Number(employeeId), Number(leaveTypeId), Number(year), Number(allocation || 0)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/leave-balances/adjust', authenticateToken, requireSchoolOrAdmin, audit('LeaveBalance', 'Adjust'), async (req, res) => {
  try {
    const { employeeId, leaveTypeId, year, adjustment, reason } = req.body;
    if (!employeeId || !leaveTypeId || !year || adjustment === undefined) return res.status(400).json({ error: 'Employee, leave type, year, and adjustment are required' });
    if (!reason) return res.status(400).json({ error: 'Reason is required for balance adjustments' });
    res.json(await leaveBalanceRepo.adjust(Number(employeeId), Number(leaveTypeId), Number(year), Number(adjustment), reason));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// =============================================
// YEAR-END FINANCIAL CLOSING
// =============================================

router.get('/year-end', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try { res.json(await yearEndRepo.getBySchool(schoolId(req.user))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/year-end/:year', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const closing = await yearEndRepo.getBySchoolAndYear(schoolId(req.user), parseInt(req.params.year, 10));
    if (!closing) return res.status(404).json({ error: 'Year-end record not found' });
    res.json(closing);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/year-end', authenticateToken, requireSchoolOrAdmin, audit('YearEndClosing', 'Create'), async (req, res) => {
  try {
    if (!req.body.financialYear) return res.status(400).json({ error: 'Financial year is required' });
    const existing = await yearEndRepo.getBySchoolAndYear(schoolId(req.user), Number(req.body.financialYear));
    if (existing) return res.status(400).json({ error: 'Year-end record already exists for this year' });
    res.status(201).json(await yearEndRepo.create({ ...req.body, schoolId: schoolId(req.user) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/year-end/:id/status', authenticateToken, requireSchoolOrAdmin, audit('YearEndClosing', 'UpdateStatus'), async (req, res) => {
  try {
    const valid = ['Open', 'In Review', 'Ready to Close', 'Closed', 'Reopened for Correction'];
    if (!valid.includes(req.body.status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    if (req.body.status === 'Reopened for Correction' && !req.body.reason) {
      return res.status(400).json({ error: 'Reason is required when reopening a closed year' });
    }
    res.json(await yearEndRepo.updateStatus(parseInt(req.params.id, 10), req.body.status, req.user.UserID, req.body.reason));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/year-end/:year/balances-forward', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    res.json(await yearEndRepo.getBalancesBroughtForward(schoolId(req.user), year, year + 1));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/year-end/carry-forward', authenticateToken, requireSchoolOrAdmin, audit('YearEndClosing', 'CarryForward'), async (req, res) => {
  try {
    const { studentId, familyId, fromYear, toYear, outstandingAmount, advanceCreditAmount } = req.body;
    if (!studentId || !fromYear || !toYear) return res.status(400).json({ error: 'Student, from year, and to year are required' });
    res.status(201).json(await yearEndRepo.createBalanceBroughtForward({
      schoolId: schoolId(req.user), studentId: Number(studentId), familyId: familyId ? Number(familyId) : null,
      fromYear: Number(fromYear), toYear: Number(toYear),
      outstandingAmount: Number(outstandingAmount || 0), advanceCreditAmount: Number(advanceCreditAmount || 0)
    }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
