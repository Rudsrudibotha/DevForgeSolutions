// res.locals middleware: inject the visible-nav-groups for the
// current user, plus the user object, into every EJS render.
//
// Mounted once in src/app.js before the portal routers. The sidebar
// partials read `visibleGroups` from the locals.

'use strict';

const { listVisibleGroups } = require('../security/permissionResolver');
const { SMS_NAV, DEVFORGE_NAV, PARENT_NAV } = require('../security/navSpec');

const NAV_BY_PORTAL = {
  sms: SMS_NAV,
  devforge: DEVFORGE_NAV,
  parent: PARENT_NAV
};

function applyNavVisibility(nav, visibleSet) {
  const out = [];
  for (const group of nav) {
    const items = (group.items || []).filter(item => {
      if (!item.permissionKey) return true;
      return visibleSet.has(item.permissionKey);
    });
    if (items.length || group.alwaysShow) {
      out.push({ ...group, items });
    }
  }
  return out;
}

async function portalLocals(req, res, next) {
  res.locals.user = req.user;
  // Try to derive the portal from the URL prefix; on shared pages
  // (e.g. /account) fall back to the signed-in user's role.
  let nav = SMS_NAV;
  if (req.path.startsWith('/devforge')) nav = DEVFORGE_NAV;
  else if (req.path.startsWith('/parent')) nav = PARENT_NAV;
  else if (req.path.startsWith('/sms')) nav = SMS_NAV;
  else if (req.user && req.user.role === 'admin') nav = DEVFORGE_NAV;
  else if (req.user && req.user.role === 'parent') nav = PARENT_NAV;
  // DevForge admins are authorised by role at every /devforge route
  // (requireAdmin), and the DEVFORGE_NAV permission keys are not part of
  // the SMS feature catalog the resolver scores against. Give admins the
  // full nav instead of filtering it to an empty set.
  if (req.user && req.user.role === 'admin' && nav === DEVFORGE_NAV) {
    res.locals.visibleGroups = nav;
    return next();
  }
  try {
    const visibleSet = await (require('../security/permissionResolver').getEffectivePermissions(req.user));
    res.locals.visibleGroups = applyNavVisibility(nav, visibleSet);
    if (process.env.DEBUG_NAV) console.log('[portalLocals]', req.path, 'user=', JSON.stringify(req.user && { role: req.user.role, perms: req.user.permissions }), 'set=', visibleSet.size, 'groups=', res.locals.visibleGroups.length);
  } catch (_) {
    // DB unavailable (test mode): fall back to the full nav so the
    // user can still navigate.
    res.locals.visibleGroups = nav;
  }
  next();
}

module.exports = { portalLocals, applyNavVisibility };
