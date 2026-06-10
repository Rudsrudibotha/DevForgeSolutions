// Data Layer - SaaS subscription, feature catalogue, and entitlement
// repositories. Implements Tasks 5-12: SubscriptionPlan, SaaSFeature,
// SubscriptionPlanFeature, TenantSubscription, TenantFeatureOverride,
// TenantFeatureUsage, plus the CanTenantUseFeature and
// CanTenantUseFeatureWithinLimit actions (Tasks 10 + 11).

const { getPool, sql } = require('./db');
const { positiveIntEnv } = require('./db');

// Cache: TenantId -> { featureKey -> { IsAllowed, Reason, LimitType, LimitValue, Expiry } }
const entitlementCache = new Map();
const CACHE_TTL_MS = positiveIntEnv('ENTITLEMENT_CACHE_TTL_MS', 5 * 60 * 1000);

function cacheKey(tenantId, featureKey) { return tenantId + '::' + featureKey; }

function evictEntitlement(tenantId) {
  for (const k of entitlementCache.keys()) {
    if (k.startsWith(tenantId + '::')) entitlementCache.delete(k);
  }
}

class SubscriptionPlanRepository {
  async create({ planCode, planName, description, isDefault }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('planCode', sql.NVarChar, planCode)
      .input('planName', sql.NVarChar, planName)
      .input('description', sql.NVarChar, description || null)
      .input('isDefault', sql.Bit, isDefault ? 1 : 0)
      .query(`
        INSERT INTO dbo.SubscriptionPlans (PlanCode, PlanName, Description, IsDefault, Status, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.SubscriptionPlanId
        VALUES (@planCode, @planName, @description, @isDefault, 'Active', SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].SubscriptionPlanId;
  }

  async getByCode(planCode) {
    const pool = await getPool();
    const result = await pool.request()
      .input('planCode', sql.NVarChar, planCode)
      .query(`
        SELECT SubscriptionPlanId, PlanCode, PlanName, Description, IsDefault, Status, CreatedAt, UpdatedAt, IsActive
        FROM dbo.SubscriptionPlans
        WHERE PlanCode = @planCode AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }

  async getById(subscriptionPlanId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, subscriptionPlanId)
      .query(`
        SELECT SubscriptionPlanId, PlanCode, PlanName, Description, IsDefault, Status, CreatedAt, UpdatedAt, IsActive
        FROM dbo.SubscriptionPlans
        WHERE SubscriptionPlanId = @id AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }
}

class SaaSFeatureRepository {
  async create({ featureKey, featureName, featureCategory, description }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('featureKey', sql.NVarChar, featureKey)
      .input('featureName', sql.NVarChar, featureName)
      .input('featureCategory', sql.NVarChar, featureCategory || null)
      .input('description', sql.NVarChar, description || null)
      .query(`
        INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory, Description, IsActive, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.SaaSFeatureId
        VALUES (@featureKey, @featureName, @featureCategory, @description, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
    return result.recordset[0].SaaSFeatureId;
  }

  async getByKey(featureKey) {
    const pool = await getPool();
    const result = await pool.request()
      .input('featureKey', sql.NVarChar, featureKey)
      .query(`
        SELECT SaaSFeatureId, FeatureKey, FeatureName, FeatureCategory, Description, IsActive, CreatedAt, UpdatedAt
        FROM dbo.SaaSFeatures
        WHERE FeatureKey = @featureKey AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }

  async listAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT SaaSFeatureId, FeatureKey, FeatureName, FeatureCategory, Description, IsActive
        FROM dbo.SaaSFeatures
        WHERE IsActive = 1
        ORDER BY FeatureCategory, FeatureName
      `);
    return result.recordset;
  }
}

class SubscriptionPlanFeatureRepository {
  async upsert({ subscriptionPlanId, saasFeatureId, isEnabled, limitType, limitValue }) {
    const pool = await getPool();
    await pool.request()
      .input('subscriptionPlanId', sql.Int, subscriptionPlanId)
      .input('saasFeatureId', sql.Int, saasFeatureId)
      .input('isEnabled', sql.Bit, isEnabled ? 1 : 0)
      .input('limitType', sql.NVarChar, limitType || null)
      .input('limitValue', sql.Int, limitValue || null)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.SubscriptionPlanFeatures WHERE SubscriptionPlanId = @subscriptionPlanId AND SaaSFeatureId = @saasFeatureId)
          UPDATE dbo.SubscriptionPlanFeatures
            SET IsEnabled = @isEnabled, LimitType = @limitType, LimitValue = @limitValue, UpdatedAt = SYSUTCDATETIME()
        ELSE
          INSERT INTO dbo.SubscriptionPlanFeatures (SubscriptionPlanId, SaaSFeatureId, IsEnabled, LimitType, LimitValue, CreatedAt, UpdatedAt)
          VALUES (@subscriptionPlanId, @saasFeatureId, @isEnabled, @limitType, @limitValue, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
  }

  async listForPlan(subscriptionPlanId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, subscriptionPlanId)
      .query(`
        SELECT spf.SubscriptionPlanFeatureId, spf.SubscriptionPlanId, spf.SaaSFeatureId, spf.IsEnabled,
               spf.LimitType, spf.LimitValue, f.FeatureKey, f.FeatureName, f.FeatureCategory
        FROM dbo.SubscriptionPlanFeatures spf
        INNER JOIN dbo.SaaSFeatures f ON f.SaaSFeatureId = spf.SaaSFeatureId
        WHERE spf.SubscriptionPlanId = @id AND f.IsActive = 1
        ORDER BY f.FeatureKey
      `);
    return result.recordset;
  }

  async getForFeature(subscriptionPlanId, saasFeatureId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('planId', sql.Int, subscriptionPlanId)
      .input('featureId', sql.Int, saasFeatureId)
      .query(`
        SELECT IsEnabled, LimitType, LimitValue
        FROM dbo.SubscriptionPlanFeatures
        WHERE SubscriptionPlanId = @planId AND SaaSFeatureId = @featureId
      `);
    return result.recordset[0] || null;
  }
}

class TenantSubscriptionRepository {
  async create({ tenantId, subscriptionPlanId, status, startDate, endDate }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('subscriptionPlanId', sql.Int, subscriptionPlanId)
      .input('status', sql.NVarChar, status || 'Active')
      .input('startDate', sql.Date, startDate || new Date())
      .input('endDate', sql.Date, endDate || null)
      .query(`
        INSERT INTO dbo.TenantSubscriptions (TenantId, SubscriptionPlanId, Status, StartDate, EndDate, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.TenantSubscriptionId
        VALUES (@tenantId, @subscriptionPlanId, @status, @startDate, @endDate, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].TenantSubscriptionId;
  }

  async getActiveForTenant(tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT ts.TenantSubscriptionId, ts.TenantId, ts.SubscriptionPlanId, ts.Status, ts.StartDate, ts.EndDate, ts.IsActive,
               sp.PlanCode, sp.PlanName, sp.IsDefault
        FROM dbo.TenantSubscriptions ts
        INNER JOIN dbo.SubscriptionPlans sp ON sp.SubscriptionPlanId = ts.SubscriptionPlanId
        WHERE ts.TenantId = @tenantId AND ts.IsActive = 1 AND ts.Status = 'Active'
        ORDER BY ts.StartDate DESC
      `);
    return result.recordset[0] || null;
  }

  async list({ page = 1, pageSize = 50, status } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['ts.IsActive = 1'];
    if (status) {
      request.input('status', sql.NVarChar, status);
      where.push('ts.Status = @status');
    }
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    request.input('offset', sql.Int, (safePage - 1) * safeSize);
    request.input('size', sql.Int, safeSize);
    const result = await request.query(`
      SELECT ts.TenantSubscriptionId, ts.TenantId, ts.SubscriptionPlanId, ts.Status, ts.StartDate, ts.EndDate,
             sp.PlanCode, sp.PlanName, t.TenantName
      FROM dbo.TenantSubscriptions ts
      INNER JOIN dbo.SubscriptionPlans sp ON sp.SubscriptionPlanId = ts.SubscriptionPlanId
      INNER JOIN dbo.Tenants t ON t.TenantId = ts.TenantId
      WHERE ${where.join(' AND ')}
      ORDER BY ts.StartDate DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `);
    return result.recordset;
  }

  async setStatus(tenantSubscriptionId, status) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, tenantSubscriptionId)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE dbo.TenantSubscriptions
        SET Status = @status, UpdatedAt = SYSUTCDATETIME()
        WHERE TenantSubscriptionId = @id
      `);
  }
}

class TenantFeatureOverrideRepository {
  async upsert({ tenantId, saasFeatureId, isEnabled, limitValueOverride, reason, startDate, endDate, createdByUserId }) {
    const pool = await getPool();
    await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('saasFeatureId', sql.Int, saasFeatureId)
      .input('isEnabled', sql.Bit, isEnabled ? 1 : 0)
      .input('limitValueOverride', sql.Int, limitValueOverride || null)
      .input('reason', sql.NVarChar, reason || null)
      .input('startDate', sql.Date, startDate || null)
      .input('endDate', sql.Date, endDate || null)
      .input('createdByUserId', sql.Int, createdByUserId || null)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.TenantFeatureOverrides WHERE TenantId = @tenantId AND SaaSFeatureId = @saasFeatureId AND IsActive = 1)
          UPDATE dbo.TenantFeatureOverrides
            SET IsEnabled = @isEnabled, LimitValueOverride = @limitValueOverride, Reason = @reason,
                StartDate = @startDate, EndDate = @endDate, CreatedByUserId = @createdByUserId, UpdatedAt = SYSUTCDATETIME()
        ELSE
          INSERT INTO dbo.TenantFeatureOverrides (TenantId, SaaSFeatureId, IsEnabled, LimitValueOverride, Reason, StartDate, EndDate, CreatedByUserId, CreatedAt, UpdatedAt, IsActive)
          VALUES (@tenantId, @saasFeatureId, @isEnabled, @limitValueOverride, @reason, @startDate, @endDate, @createdByUserId, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
  }

  async getActiveForFeature(tenantId, saasFeatureId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('saasFeatureId', sql.Int, saasFeatureId)
      .query(`
        SELECT TenantFeatureOverrideId, IsEnabled, LimitValueOverride, Reason, StartDate, EndDate
        FROM dbo.TenantFeatureOverrides
        WHERE TenantId = @tenantId AND SaaSFeatureId = @saasFeatureId AND IsActive = 1
          AND (StartDate IS NULL OR StartDate <= CAST(GETDATE() AS DATE))
          AND (EndDate IS NULL OR EndDate >= CAST(GETDATE() AS DATE))
      `);
    return result.recordset[0] || null;
  }

  async listForTenant(tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT o.TenantFeatureOverrideId, o.SaaSFeatureId, o.IsEnabled, o.LimitValueOverride, o.Reason, o.StartDate, o.EndDate, o.IsActive,
               f.FeatureKey, f.FeatureName
        FROM dbo.TenantFeatureOverrides o
        INNER JOIN dbo.SaaSFeatures f ON f.SaaSFeatureId = o.SaaSFeatureId
        WHERE o.TenantId = @tenantId AND f.IsActive = 1
        ORDER BY f.FeatureKey
      `);
    return result.recordset;
  }

  async deactivate(overrideId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, overrideId)
      .query(`
        UPDATE dbo.TenantFeatureOverrides
        SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
        WHERE TenantFeatureOverrideId = @id
      `);
  }
}

class TenantFeatureUsageRepository {
  async increment({ tenantId, saasFeatureId, usagePeriodStart, usagePeriodEnd, usageCountDelta, storageBytesDelta }) {
    const pool = await getPool();
    await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('saasFeatureId', sql.Int, saasFeatureId)
      .input('periodStart', sql.DateTime2, usagePeriodStart)
      .input('periodEnd', sql.DateTime2, usagePeriodEnd)
      .input('usageCount', sql.Int, usageCountDelta || 1)
      .input('storageBytes', sql.BigInt, storageBytesDelta || 0)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.TenantFeatureUsage WHERE TenantId = @tenantId AND SaaSFeatureId = @saasFeatureId AND UsagePeriodStart = @periodStart)
          UPDATE dbo.TenantFeatureUsage
            SET UsageCount = UsageCount + @usageCount, StorageBytesUsed = StorageBytesUsed + @storageBytes, UpdatedAt = SYSUTCDATETIME()
        ELSE
          INSERT INTO dbo.TenantFeatureUsage (TenantId, SaaSFeatureId, UsagePeriodStart, UsagePeriodEnd, UsageCount, StorageBytesUsed, CreatedAt, UpdatedAt)
          VALUES (@tenantId, @saasFeatureId, @periodStart, @periodEnd, @usageCount, @storageBytes, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
  }

  async getCurrentPeriod(tenantId, saasFeatureId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('saasFeatureId', sql.Int, saasFeatureId)
      .query(`
        SELECT TOP 1 TenantFeatureUsageId, TenantId, SaaSFeatureId, UsagePeriodStart, UsagePeriodEnd, UsageCount, StorageBytesUsed
        FROM dbo.TenantFeatureUsage
        WHERE TenantId = @tenantId AND SaaSFeatureId = @saasFeatureId
          AND UsagePeriodStart <= SYSUTCDATETIME() AND UsagePeriodEnd >= SYSUTCDATETIME()
        ORDER BY UsagePeriodStart DESC
      `);
    return result.recordset[0] || null;
  }

  async listForTenant(tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT u.TenantFeatureUsageId, u.SaaSFeatureId, u.UsagePeriodStart, u.UsagePeriodEnd, u.UsageCount, u.StorageBytesUsed,
               f.FeatureKey, f.FeatureName
        FROM dbo.TenantFeatureUsage u
        INNER JOIN dbo.SaaSFeatures f ON f.SaaSFeatureId = u.SaaSFeatureId
        WHERE u.TenantId = @tenantId
        ORDER BY u.UsagePeriodStart DESC
      `);
    return result.recordset;
  }
}

// ---- Entitlement actions (Tasks 10, 11, 20) ----

// CanTenantUseFeature - the single source of truth for whether a tenant
// has access to a feature. Checks subscription, plan features, and
// tenant overrides. Caches for 5 minutes by default; overrides on
// any change clear the cache.
async function canTenantUseFeature(tenantId, featureKey) {
  if (!tenantId || !featureKey) {
    return { IsAllowed: false, Reason: 'missing-tenant-or-feature', LimitType: null, LimitValue: null };
  }
  if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    return { IsAllowed: true, Reason: 'auth-disabled-dev', LimitType: null, LimitValue: null };
  }
  const ck = cacheKey(tenantId, featureKey);
  const cached = entitlementCache.get(ck);
  if (cached && cached.Expiry > Date.now()) return cached.result;

  const subRepo = new TenantSubscriptionRepository();
  const saasFeatureRepo = new SaaSFeatureRepository();
  const overrideRepo = new TenantFeatureOverrideRepository();
  const planFeatureRepo = new SubscriptionPlanFeatureRepository();

  // Check active subscription first.
  const sub = await subRepo.getActiveForTenant(tenantId);
  if (!sub) {
    const r = { IsAllowed: false, Reason: 'no-active-subscription', LimitType: null, LimitValue: null };
    entitlementCache.set(ck, { Expiry: Date.now() + CACHE_TTL_MS, result: r });
    return r;
  }

  // Check tenant override (takes precedence over plan).
  const feature = await saasFeatureRepo.getByKey(featureKey);
  if (!feature) {
    const r = { IsAllowed: false, Reason: 'feature-unknown', LimitType: null, LimitValue: null };
    entitlementCache.set(ck, { Expiry: Date.now() + CACHE_TTL_MS, result: r });
    return r;
  }
  const override = await overrideRepo.getActiveForFeature(tenantId, feature.SaaSFeatureId);
  if (override) {
    const r = {
      IsAllowed: !!override.IsEnabled,
      Reason: override.IsEnabled ? 'tenant-override-enabled' : 'tenant-override-disabled',
      LimitType: override.LimitValueOverride != null ? 'custom' : null,
      LimitValue: override.LimitValueOverride
    };
    entitlementCache.set(ck, { Expiry: Date.now() + CACHE_TTL_MS, result: r });
    return r;
  }

  // Fall back to plan feature.
  const planFeature = await planFeatureRepo.getForFeature(sub.SubscriptionPlanId, feature.SaaSFeatureId);
  if (!planFeature || !planFeature.IsEnabled) {
    const r = { IsAllowed: false, Reason: 'plan-feature-disabled', LimitType: null, LimitValue: null };
    entitlementCache.set(ck, { Expiry: Date.now() + CACHE_TTL_MS, result: r });
    return r;
  }
  const r = {
    IsAllowed: true,
    Reason: 'plan-feature-enabled',
    LimitType: planFeature.LimitType,
    LimitValue: planFeature.LimitValue
  };
  entitlementCache.set(ck, { Expiry: Date.now() + CACHE_TTL_MS, result: r });
  return r;
}

// CanTenantUseFeatureWithinLimit - returns whether the tenant is still
// within the allowed limit for the feature. For v1, unlimited features
// return allowed.
async function canTenantUseFeatureWithinLimit(tenantId, featureKey, requestedUsageAmount) {
  const base = await canTenantUseFeature(tenantId, featureKey);
  if (!base.IsAllowed) return { allowed: false, reason: base.Reason };
  if (base.LimitValue == null) return { allowed: true, reason: 'unlimited' };
  const usageRepo = new TenantFeatureUsageRepository();
  const saasFeatureRepo = new SaaSFeatureRepository();
  const feature = await saasFeatureRepo.getByKey(featureKey);
  if (!feature) return { allowed: false, reason: 'feature-unknown' };
  const usage = await usageRepo.getCurrentPeriod(tenantId, feature.SaaSFeatureId);
  const current = usage ? Number(usage.UsageCount || 0) : 0;
  const requested = Number(requestedUsageAmount || 0);
  if (current + requested > Number(base.LimitValue)) {
    return { allowed: false, reason: 'limit-exceeded', current, limit: Number(base.LimitValue) };
  }
  return { allowed: true, reason: 'within-limit', current, limit: Number(base.LimitValue) };
}

module.exports = {
  SubscriptionPlanRepository,
  SaaSFeatureRepository,
  SubscriptionPlanFeatureRepository,
  TenantSubscriptionRepository,
  TenantFeatureOverrideRepository,
  TenantFeatureUsageRepository,
  canTenantUseFeature,
  canTenantUseFeatureWithinLimit,
  evictEntitlement,
  entitlementCache
};
