// Application Layer - Leave request routes

const express = require('express');
const LeaveService = require('../business/leaveService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const leaveService = new LeaveService();

// Get all leave requests for the school/admin
router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const leaves = await leaveService.getLeaves(req.user);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my own leave requests (employee self-service)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const leaves = await leaveService.getMyLeaves(req.user);
    res.json(leaves);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const leave = await leaveService.getLeaveById(parseInt(req.params.id, 10), req.user);
    res.json(leave);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Submit a leave request (any authenticated employee)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const leave = await leaveService.submitLeave(req.body, req.user);
    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Approve or reject a leave request (school admin or admin)
router.put('/:id/review', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const leave = await leaveService.reviewLeave(
      parseInt(req.params.id, 10),
      req.body.status,
      req.user
    );
    res.json(leave);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
