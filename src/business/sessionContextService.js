// Business Layer - Session security context. The authenticated session
// now carries UserId, ActiveTenantId, ActiveSchoolId, UserRole,
// DashboardType, IsDevForgeUser, IsSchoolUser, IsParentUser, and
// PermissionSet. The backend always gets these from req.user (the JWT
// or test header) and never from frontend body/query. The session also
// stores a list of permission keys for fast RBAC checks (Task 4).

const UserTenantMembershipRepository = require('../data/userTenantMembershipRepository');
const { RolePermissionRepository } = require('../data/roleRepository');
const { isAuthDisabled, buildTestAuthResponse } = require('../security/testAuth');
const { allPermissionKeys } = require('../security/featureCatalog');
const { getPool, sql } = require('../data/db');

const memCache = new Map(); // UserId -> { TenantId -> { memberships, permissions, ts } }
const CACHE_TTL_MS = 60 * 1000; // 1 minute; server-side only, never trust client

function cachedForUser(userId) {
  if (!userId) return null;
  const userCache = memCache.get(userId);
  if (!userCache) return null;
  const entry = userCache.get('__default__');
  if (!entry || entry.ts + CACHE_TTL_MS < Date.now()) return null;
  return entry;
}

function setCacheForUser(userId, payload) {
  if (!userId) return;
  let userCache = memCache.get(userId);
  if (!userCache) { userCache = new Map(); memCache.set(userId, userCache); }
  userCache.set('__default__', { ...payload, ts: Date.now() });
}

function clearCacheForUser(userId) {
  if (userId) memCache.delete(userId);
}

async function resolveTenantIdForSchool(schoolId) {
  const id = Number(schoolId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const pool = await getPool();
  const result = await pool.request()
    .input('schoolId', sql.Int, id)
    .query('SELECT TenantId FROM dbo.Schools WHERE SchoolID = @schoolId');
  return result.recordset[0]?.TenantId || null;
}

// Build the security context for a user at a given tenant. Returns the
// shape that getActiveSchool + role handlers will attach to req.user.
async function buildSessionContext({ user, activeTenantId, activeSchoolId }) {
  if (!user || !user.id) return null;
  const cached = cachedForUser(user.id);
  if (cached && cached.userId === user.id && cached.tenantId === activeTenantId) {
    return cached.payload;
  }

  const memberRepo = new UserTenantMembershipRepository();
  const rolePermRepo = new RolePermissionRepository();

  const memberships = await memberRepo.listForUser(user.id);
  const activeMembership = activeTenantId ? await memberRepo.getActiveMembership(user.id, activeTenantId) : null;
  const permissions = activeTenantId ? await rolePermRepo.getPermissionKeysForUser(user.id, activeTenantId) : [];

  const isParent = user.role === 'parent';
  const isSchool = user.role === 'school';
  const isDevForge = user.role === 'admin';
  const dashboardType = isDevForge ? 'DevForge' : (isParent ? 'ParentManagement' : 'SchoolManagement');

  const payload = {
    UserId: user.id,
    ActiveTenantId: activeTenantId || null,
    ActiveSchoolId: activeSchoolId || (activeMembership ? activeMembership.SchoolId : null) || null,
    UserRole: user.role,
    DashboardType: dashboardType,
    IsDevForgeUser: isDevForge,
    IsSchoolUser: isSchool,
    IsParentUser: isParent,
    PermissionSet: permissions || [],
    HasTenantAccess: !!activeMembership,
    Memberships: memberships.map(m => ({ TenantId: m.TenantId, SchoolId: m.SchoolId, Status: m.Status, RoleId: m.RoleId }))
  };
  setCacheForUser(user.id, { userId: user.id, tenantId: activeTenantId, payload });
  return payload;
}

// Express middleware that enriches req.user with the security context.
// Use this AFTER requireAuth on protected routes.
function attachSessionContext() {
  return async function (req, res, next) {
    if (!req.user) return next();

    if (isAuthDisabled()) {
      try {
        const auth = buildTestAuthResponse();
        const schoolId = req.user.schoolId || auth.user.schoolId || Number(process.env.TEST_SCHOOL_ID) || 1;
        const tenantId = req.user.tenantId || schoolId;
        req.sessionContext = {
          UserId: req.user.id,
          ActiveTenantId: tenantId,
          ActiveSchoolId: schoolId,
          UserRole: req.user.role,
          DashboardType: req.user.role === 'admin' ? 'DevForge' : (req.user.role === 'parent' ? 'ParentManagement' : 'SchoolManagement'),
          IsDevForgeUser: req.user.role === 'admin',
          IsSchoolUser: req.user.role === 'school',
          IsParentUser: req.user.role === 'parent',
          PermissionSet: allPermissionKeys(),
          HasTenantAccess: true,
          Memberships: [{ TenantId: tenantId, SchoolId: schoolId, Status: 'Active' }]
        };
        req.user.tenantId = tenantId;
        req.user.schoolId = schoolId;
        req.user.PermissionSet = req.sessionContext.PermissionSet;
        req.user.SchoolPermissions = [auth.user.permissions?.[0] || '*'];
        return next();
      } catch (err) {
        console.warn('[sessionContext] auth-disabled fallback failed:', err.message);
      }
    }

    const activeSchoolId = req.user.schoolId || null;
    try {
      const activeTenantId = req.user.tenantId || await resolveTenantIdForSchool(activeSchoolId);
      const ctx = await buildSessionContext({ user: req.user, activeTenantId, activeSchoolId });
      req.sessionContext = ctx;
      if (ctx && ctx.ActiveTenantId) req.user.tenantId = ctx.ActiveTenantId;
      if (ctx && ctx.ActiveSchoolId) req.user.schoolId = ctx.ActiveSchoolId;
    } catch (err) {
      console.warn('[sessionContext] failed to enrich session:', err.message);
    }
    next();
  };
}

// Returns true if the current user has the named permission in the active
// tenant. Backend authoritative.
function userHasPermission(req, permissionKey) {
  if (!req.sessionContext) return false;
  if (req.sessionContext.IsDevForgeUser && req.sessionContext.PermissionSet && req.sessionContext.PermissionSet.includes('DEVFORGE_PLATFORM_ALL')) {
    return true;
  }
  return (req.sessionContext.PermissionSet || []).includes(permissionKey);
}

function requirePermission(permissionKey) {
  return function (req, res, next) {
    if (!req.sessionContext) {
      if (req.user && (req.user.role === 'admin' || req.user.role === 'school' || req.user.role === 'parent')) {
        // No context yet (pre-auth), let it pass to the next guard.
        return next();
      }
      return res.status(401).render('errors/offline', { message: 'No session context' });
    }
    if (userHasPermission(req, permissionKey)) return next();
    return res.status(403).render('errors/forbidden', { message: 'You do not have permission to perform this action.' });
  };
}

module.exports = {
  buildSessionContext,
  attachSessionContext,
  userHasPermission,
  requirePermission,
  clearCacheForUser
};
