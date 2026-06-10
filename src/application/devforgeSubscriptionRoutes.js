// API Routes - DevForge subscription management (Tasks 19, 20).
//
// DevForge-only endpoints to inspect tenants, change their plan,
// view per-tenant enabled features, add/remove tenant feature overrides,
// and view per-tenant feature usage. Every route is gated by
// sessionContext.IsDevForgeUser so schools and parents cannot call it.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/portalAuth');
const { attachSessionContext } = require('../business/sessionContextService');
const TenantRepository = require('../data/tenantRepository');
const {
  SubscriptionPlanRepository,
  SubscriptionPlanFeatureRepository,
  TenantSubscriptionRepository,
  TenantFeatureOverrideRepository,
  TenantFeatureUsageRepository,
  SaaSFeatureRepository,
  canTenantUseFeature,
  evictEntitlement
} = require('../data/entitlementRepository');

router.use(requireAuth);
router.use(attachSessionContext());

function requireDevForge(req, res, next) {
  if (!req.sessionContext || !req.sessionContext.IsDevForgeUser) {
    return res.status(403).json({ error: 'devforge-only' });
  }
  next();
}

// GET /api/devforge-subscriptions/plans
router.get('/plans', requireDevForge, async (req, res) => {
  try {
    const subRepo = new SubscriptionPlanRepository();
    const featRepo = new SubscriptionPlanFeatureRepository();
    const saas = new SaaSFeatureRepository();
    const allFeatures = await saas.listAll();
    const pool = require('../data/db').getPool;
    const plansResult = await pool.request().query(`
      SELECT SubscriptionPlanId, PlanCode, PlanName, Description, IsDefault, Status, CreatedAt, UpdatedAt, IsActive
      FROM dbo.SubscriptionPlans WHERE IsActive = 1 ORDER BY PlanName
    `);
    const plans = [];
    for (const p of plansResult.recordset) {
      const feats = await featRepo.listForPlan(p.SubscriptionPlanId);
      plans.push({ ...p, features: feats });
    }
    res.json({ plans, allFeatures });
  } catch (err) {
    console.error('[devforge-subs] plans error', err);
    res.status(500).json({ error: 'list-failed' });
  }
});

// GET /api/devforge-subscriptions/tenants
router.get('/tenants', requireDevForge, async (req, res) => {
  try {
    const subRepo = new TenantSubscriptionRepository();
    const items = await subRepo.list({ page: req.query.page || 1, pageSize: Math.min(200, Number(req.query.pageSize) || 50) });
    res.json({ items });
  } catch (err) {
    console.error('[devforge-subs] tenants error', err);
    res.status(500).json({ error: 'list-failed' });
  }
});

// POST /api/devforge-subscriptions/tenants/:tenantId/plan
router.post('/tenants/:tenantId/plan', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const { subscriptionPlanId } = req.body || {};
    if (!tenantId || !subscriptionPlanId) return res.status(400).json({ error: 'tenantId-and-subscriptionPlanId-required' });
    const subRepo = new TenantSubscriptionRepository();
    // Deactivate any active subscription for this tenant
    const pool = require('../data/db').getPool;
    await pool.request().input('t', require('../data/db').sql.Int, tenantId)
      .query(`UPDATE dbo.TenantSubscriptions SET IsActive = 0, Status = 'Cancelled', UpdatedAt = SYSUTCDATETIME() WHERE TenantId = @t AND IsActive = 1`);
    const id = await subRepo.create({ tenantId, subscriptionPlanId, status: 'Active', startDate: new Date() });
    evictEntitlement(tenantId);
    res.status(201).json({ tenantSubscriptionId: id, status: 'Active' });
  } catch (err) {
    console.error('[devforge-subs] plan-assign error', err);
    res.status(500).json({ error: 'assign-failed' });
  }
});

// POST /api/devforge-subscriptions/tenants/:tenantId/suspend
router.post('/tenants/:tenantId/suspend', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const subRepo = new TenantSubscriptionRepository();
    const current = await subRepo.getActiveForTenant(tenantId);
    if (current) await subRepo.setStatus(current.TenantSubscriptionId, 'Suspended');
    evictEntitlement(tenantId);
    res.json({ ok: true, status: 'Suspended' });
  } catch (err) {
    console.error('[devforge-subs] suspend error', err);
    res.status(500).json({ error: 'suspend-failed' });
  }
});

// POST /api/devforge-subscriptions/tenants/:tenantId/reactivate
router.post('/tenants/:tenantId/reactivate', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const subRepo = new TenantSubscriptionRepository();
    const current = await subRepo.getActiveForTenant(tenantId);
    if (current) await subRepo.setStatus(current.TenantSubscriptionId, 'Active');
    evictEntitlement(tenantId);
    res.json({ ok: true, status: 'Active' });
  } catch (err) {
    console.error('[devforge-subs] reactivate error', err);
    res.status(500).json({ error: 'reactivate-failed' });
  }
});

// GET /api/devforge-subscriptions/tenants/:tenantId/features
router.get('/tenants/:tenantId/features', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const subRepo = new TenantSubscriptionRepository();
    const saas = new SaaSFeatureRepository();
    const overRepo = new TenantFeatureOverrideRepository();
    const featRepo = new SubscriptionPlanFeatureRepository();
    const sub = await subRepo.getActiveForTenant(tenantId);
    const allFeatures = await saas.listAll();
    const overrides = await overRepo.listForTenant(tenantId);
    const planFeatures = sub ? await featRepo.listForPlan(sub.SubscriptionPlanId) : [];
    const enriched = await Promise.all(allFeatures.map(async (f) => {
      const ent = await canTenantUseFeature(tenantId, f.FeatureKey);
      const ov = overrides.find(o => o.SaaSFeatureId === f.SaaSFeatureId) || null;
      const pf = planFeatures.find(p => p.SaaSFeatureId === f.SaaSFeatureId) || null;
      return {
        SaaSFeatureId: f.SaaSFeatureId,
        FeatureKey: f.FeatureKey,
        FeatureName: f.FeatureName,
        FeatureCategory: f.FeatureCategory,
        IsAllowed: ent.IsAllowed,
        Reason: ent.Reason,
        LimitType: ent.LimitType,
        LimitValue: ent.LimitValue,
        InPlan: pf ? !!pf.IsEnabled : false,
        Override: ov
      };
    }));
    res.json({ tenantId, subscription: sub, features: enriched });
  } catch (err) {
    console.error('[devforge-subs] features error', err);
    res.status(500).json({ error: 'features-failed' });
  }
});

// POST /api/devforge-subscriptions/tenants/:tenantId/overrides
router.post('/tenants/:tenantId/overrides', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const { saasFeatureId, isEnabled, limitValueOverride, reason, startDate, endDate } = req.body || {};
    if (!tenantId || !saasFeatureId) return res.status(400).json({ error: 'tenantId-and-saasFeatureId-required' });
    const overRepo = new TenantFeatureOverrideRepository();
    await overRepo.upsert({ tenantId, saasFeatureId, isEnabled: !!isEnabled, limitValueOverride, reason, startDate, endDate, createdByUserId: req.user.id });
    evictEntitlement(tenantId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[devforge-subs] override error', err);
    res.status(500).json({ error: 'override-failed' });
  }
});

// DELETE /api/devforge-subscriptions/tenants/:tenantId/overrides/:id
router.delete('/tenants/:tenantId/overrides/:id', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const id = Number(req.params.id);
    const overRepo = new TenantFeatureOverrideRepository();
    await overRepo.deactivate(id);
    evictEntitlement(tenantId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[devforge-subs] override-delete error', err);
    res.status(500).json({ error: 'delete-failed' });
  }
});

// GET /api/devforge-subscriptions/tenants/:tenantId/usage
router.get('/tenants/:tenantId/usage', requireDevForge, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const usageRepo = new TenantFeatureUsageRepository();
    const items = await usageRepo.listForTenant(tenantId);
    res.json({ items });
  } catch (err) {
    console.error('[devforge-subs] usage error', err);
    res.status(500).json({ error: 'usage-failed' });
  }
});

// GET /api/devforge-subscriptions/features/catalogue
router.get('/features/catalogue', requireDevForge, async (req, res) => {
  try {
    const saas = new SaaSFeatureRepository();
    const items = await saas.listAll();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'catalogue-failed' });
  }
});

// POST /api/devforge-subscriptions/features  (add to catalogue)
router.post('/features', requireDevForge, async (req, res) => {
  try {
    const { featureKey, featureName, featureCategory, description } = req.body || {};
    if (!featureKey || !featureName) return res.status(400).json({ error: 'featureKey-and-featureName-required' });
    const saas = new SaaSFeatureRepository();
    const id = await saas.create({ featureKey, featureName, featureCategory, description });
    res.status(201).json({ saasFeatureId: id });
  } catch (err) {
    res.status(500).json({ error: 'create-failed' });
  }
});

// POST /api/devforge-subscriptions/plans
router.post('/plans', requireDevForge, async (req, res) => {
  try {
    const { planCode, planName, description, isDefault } = req.body || {};
    if (!planCode || !planName) return res.status(400).json({ error: 'planCode-and-planName-required' });
    const subRepo = new SubscriptionPlanRepository();
    const id = await subRepo.create({ planCode, planName, description, isDefault });
    res.status(201).json({ subscriptionPlanId: id });
  } catch (err) {
    res.status(500).json({ error: 'create-failed' });
  }
});

// POST /api/devforge-subscriptions/plans/:id/features
router.post('/plans/:id/features', requireDevForge, async (req, res) => {
  try {
    const planId = Number(req.params.id);
    const { saasFeatureId, isEnabled, limitType, limitValue } = req.body || {};
    if (!planId || !saasFeatureId) return res.status(400).json({ error: 'planId-and-saasFeatureId-required' });
    const featRepo = new SubscriptionPlanFeatureRepository();
    await featRepo.upsert({ subscriptionPlanId: planId, saasFeatureId, isEnabled: !!isEnabled, limitType, limitValue });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'upsert-failed' });
  }
});

module.exports = router;
