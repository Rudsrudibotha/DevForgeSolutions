const express = require('express');
const RegistrationService = require('../business/registrationService');

const router = express.Router();
const registrationService = new RegistrationService();

router.get('/schools', async (req, res) => {
  try {
    res.json(await registrationService.getPublicSchools());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/schools', async (req, res) => {
  try {
    const result = await registrationService.registerSchoolClient(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.post('/parents', async (req, res) => {
  try {
    const result = await registrationService.registerParent(req.body);
    res.status(result.matched ? 201 : 202).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
