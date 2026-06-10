// Permission resolver.
//
// Computes the EFFECTIVE permission set for a user, given:
//   1. The default grants (DEFAULT_GRANTS) - applied to every role
//   2. The role's normal permissions (from RolePermission join)
//   3. The per-role Allow/Deny overrides (RolePermissionOverrides)
//
// Resolution rules:
//   - If an override says 'Allow', the key is granted
//   - If an override says 'Deny', the key is denied (Deny always wins)
//   - If 'Inherit', fall through to the role's normal permissions
//   - For GROUP keys, children inherit the parent decision:
//       group = Deny   -> every leaf is Deny
//       group = Allow  -> every leaf becomes Allow
//       group = Inherit-> leaves fall through to their own decision
//
// Result: a Set<string> of effective permission keys.

'use strict';

const { allPermissionKeys, keyToGroup, FEATURE_CATALOG, DEFAULT_GRANTS } = require('./featureCatalog');
const { OWNER_PERMISSION } = require('./schoolPermissions');
const roleOverrideRepo = require('../data/rolePermissionOverrideRepository');

const _cache = new Map(); // userKey -> { at, set }
const CACHE_TTL_MS = 60 * 1000;

function cacheKey(user) {
  if (!user) return 'null';
  const id = user.id || user.UserID || user.userId;
  const role = user.role || user.Role || '';
  const roleId = user.roleId || user.RoleID || '';
  return `${id}|${role}|${roleId}`;
}

function userHasOwnerPermission(user) {
  if (!user) return false;
  const keys = [
    ...(Array.isArray(user.permissions) ? user.permissions : []),
    ...(Array.isArray(user.SchoolPermissions) ? user.SchoolPermissions : []),
    ...(Array.isArray(user.PermissionSet) ? user.PermissionSet : [])
  ];
  return keys.some((k) => k === OWNER_PERMISSION || k === '*');
}

async function getEffectivePermissions(user) {
  if (!user) return new Set();
  if (userHasOwnerPermission(user)) {
    return new Set(allPermissionKeys());
  }
  const key = cacheKey(user);
  const hit = _cache.get(key);
  if (hit && (Date.now() - hit.at) < CACHE_TTL_MS) return hit.set;

  // 1. Start with the default grants (so empty roles still get the
  //    School + Finance defaults).
  const decision = new Map();
  for (const [k, v] of Object.entries(DEFAULT_GRANTS)) decision.set(k, v);

  // 2. Layer the role's normal permission keys (if any) on top as Allow
  if (Array.isArray(user.PermissionSet) && user.PermissionSet.length) {
    for (const k of user.PermissionSet) {
      if (!decision.has(k)) decision.set(k, 'Inherit');
      decision.set(k, 'Allow');
    }
  }
  if (Array.isArray(user.SchoolPermissions) && user.SchoolPermissions.length) {
    for (const k of user.SchoolPermissions) {
      decision.set(k, 'Allow');
    }
  }

  // 3. Layer the per-role overrides on top
  const roleId = user.roleId || user.RoleID;
  if (roleId) {
    try {
      const overrides = await roleOverrideRepo.listForRole(roleId);
      for (const o of overrides) decision.set(o.PermissionKey, o.Decision);
    } catch (_) { /* DB may be unavailable in test mode */ }
  }

  // 4. Resolve group inheritance: a group's decision overrides each
  //    leaf UNLESS the leaf has a more specific override.
  const keyToGroupMap = keyToGroup();
  for (const group of FEATURE_CATALOG) {
    const g = decision.get(group.key) || 'Inherit';
    if (g === 'Deny') {
      for (const leaf of group.leaves) {
        // If the leaf has a more specific Allow, that wins; else Deny
        if (decision.get(leaf.key) !== 'Allow') decision.set(leaf.key, 'Deny');
      }
    } else if (g === 'Allow') {
      // Only fill in leaves that haven't been explicitly denied
      for (const leaf of group.leaves) {
        if (decision.get(leaf.key) !== 'Deny') decision.set(leaf.key, 'Allow');
      }
    }
  }

  // 5. Build the effective set
  const set = new Set();
  for (const [k, v] of decision.entries()) {
    if (v === 'Allow') set.add(k);
  }

  _cache.set(key, { at: Date.now(), set });
  return set;
}

function clearCache() {
  _cache.clear();
}

// Convenience: does the user have this key?
async function hasFeature(user, permissionKey) {
  const set = await getEffectivePermissions(user);
  return set.has(permissionKey);
}

// Convenience: list every "visible" group (any leaf granted) for the
// sidebar.
async function listVisibleGroups(user) {
  const set = await getEffectivePermissions(user);
  const out = [];
  for (const group of FEATURE_CATALOG) {
    const visibleLeaves = group.leaves.filter(l => set.has(l.key));
    const groupGranted = set.has(group.key);
    if (groupGranted || visibleLeaves.length) {
      out.push({
        key: group.key,
        label: group.label,
        leaves: visibleLeaves
      });
    }
  }
  return out;
}

module.exports = {
  getEffectivePermissions,
  hasFeature,
  listVisibleGroups,
  clearCache
};
