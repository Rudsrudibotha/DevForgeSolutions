// Application Layer - Billing category routes

const express = require('express');
const BillingCategoryService = require('../business/billingCategoryService');
const { authenticateToken, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();
const billingCategoryService = new BillingCategoryService();

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const categories = await billingCategoryService.getCategories(req.user);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const category = await billingCategoryService.getCategoryById(parseInt(req.params.id, 10), req.user);
    res.json(category);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const category = await billingCategoryService.createCategory(req.body, req.user);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const category = await billingCategoryService.updateCategory(parseInt(req.params.id, 10), req.body, req.user);
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {
  try {
    const result = await billingCategoryService.deleteCategory(parseInt(req.params.id, 10), req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
