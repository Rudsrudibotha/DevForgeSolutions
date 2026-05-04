// Application Layer - Family routes

const express = require('express');
const FamilyService = require('../business/familyService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const familyService = new FamilyService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const families = await familyService.getFamilies(req.user);
    res.json(families);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const family = await familyService.getFamilyById(parseInt(req.params.id, 10), req.user);
    res.json(family);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const family = await familyService.createFamily(req.body, req.user);
    res.status(201).json(family);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const family = await familyService.updateFamily(parseInt(req.params.id, 10), req.body, req.user);
    res.json(family);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
