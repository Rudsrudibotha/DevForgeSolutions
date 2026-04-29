// Application Layer - School routes

// This module defines the API routes for school-related operations in the School Finance and Management System

const express = require('express');

const SchoolService = require('../business/schoolService');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const schoolService = new SchoolService();

// GET /api/schools - Get all schools for admins, or the current school for school users

router.get('/', authenticateToken, async (req, res) => {

  try {

    const schools = await schoolService.getAllSchools(req.user);

    res.json(schools);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

// GET /api/schools/availability/school-name - Check if a school name can be registered

router.get('/availability/school-name', async (req, res) => {

  try {

    const registered = await schoolService.isSchoolNameRegistered(req.query.schoolName);

    res.json({ available: !registered });

  } catch (error) {

    res.status(400).json({ error: error.message });

  }

});

// GET /api/schools/:id - Get school by ID

router.get('/:id', authenticateToken, async (req, res) => {

  try {

    const school = await schoolService.getSchoolById(parseInt(req.params.id, 10), req.user);

    res.json(school);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

// POST /api/schools - Create new school (admin only)

router.post('/', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const newSchool = await schoolService.createSchool(req.body);

    res.status(201).json(newSchool);

  } catch (error) {

    res.status(400).json({ error: error.message });

  }

});

// PUT /api/schools/:id - Update school. Admins can update any school; school users can update their own profile.

router.put('/:id', authenticateToken, async (req, res) => {

  try {

    const updatedSchool = await schoolService.updateSchool(parseInt(req.params.id, 10), req.body, req.user);

    res.json(updatedSchool);

  } catch (error) {

    const status = error.message.includes('only update your own') ? 403 : 400;

    res.status(status).json({ error: error.message });

  }

});

// DELETE /api/schools/:id - Delete school (admin only)

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const result = await schoolService.deleteSchool(parseInt(req.params.id, 10));

    res.json(result);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

// PUT /api/schools/:id/suspend - Suspend school (admin only)

router.put('/:id/suspend', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const result = await schoolService.suspendSchool(parseInt(req.params.id, 10));

    res.json(result);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

// PUT /api/schools/:id/activate - Activate school (admin only)

router.put('/:id/activate', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const result = await schoolService.activateSchool(parseInt(req.params.id, 10));

    res.json(result);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

module.exports = router;
