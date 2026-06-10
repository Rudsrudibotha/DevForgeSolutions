// Application Layer - Billing category routes
// SECURITY (C3): clamp ?schoolId to the caller's own school for non-admin
// roles. School staff may never read another school's billing categories.

const express = require('express');
const BillingCategoryService = require('../business/billingCategoryService');
const { authenticateToken, requireSchoolPermission } = require('../middleware/auth');

const router = express.Router();
const billingCategoryService = new BillingCategoryService();

function safeSchoolIdForRequest(req, requestedSchoolId) {
  if (!req.user) return null;
  if (req.user.Role === 'admin') return requestedSchoolId ? parseInt(requestedSchoolId, 10) : null;
  if (requestedSchoolId && parseInt(requestedSchoolId, 10) !== Number(req.user.SchoolID)) {
    return null;
  }
  return Number(req.user.SchoolID) || null;
}

router.get('/', authenticateToken, requireSchoolPermission('finance.billing_categories.manage', 'finance.invoices.view', 'finance.invoices.create'), async (req, res) => {
  try {
    const schoolId = safeSchoolIdForRequest(req, req.query.schoolId);
    if (!schoolId && req.user.Role === 'school') {
      return res.status(403).json({ error: 'school-mismatch' });
    }
    const categories = await billingCategoryService.getCategories(req.user, { schoolId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireSchoolPermission('finance.billing_categories.manage', 'finance.invoices.view', 'finance.invoices.create'), async (req, res) => {
  try {
    const category = await billingCategoryService.getCategoryById(parseInt(req.params.id, 10), req.user);
    res.json(category);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireSchoolPermission('finance.billing_categories.manage'), async (req, res) => {
  try {
    const category = await billingCategoryService.createCategory(req.body, req.user);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireSchoolPermission('finance.billing_categories.manage'), async (req, res) => {
  try {
    const category = await billingCategoryService.updateCategory(parseInt(req.params.id, 10), req.body, req.user);
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireSchoolPermission('finance.billing_categories.manage'), async (req, res) => {
  try {
    const result = await billingCategoryService.deleteCategory(parseInt(req.params.id, 10), req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
