// Sidebar visibility filter.
//
// Used by the SMS, DevForge, and Parent sidebars to hide nav items
// that the current user is not entitled to. Each nav item declares a
// `permissionKey` (from the feature catalog). Items without a key
// are always visible.

'use strict';

const { hasFeature } = require('./permissionResolver');

async function filterNavByVisibility(req, nav) {
  if (!req || !req.user) return nav;
  const groups = Array.isArray(nav) ? nav : (nav.groups || []);
  const out = [];
  for (const group of groups) {
    const items = group.items || group.leaves || [];
    const visibleItems = [];
    for (const item of items) {
      if (!item.permissionKey) {
        visibleItems.push(item);
        continue;
      }
      if (await hasFeature(req.user, item.permissionKey)) {
        visibleItems.push(item);
      }
    }
    if (group.alwaysShow || visibleItems.length) {
      out.push({ ...group, items: visibleItems, leaves: visibleItems });
    }
  }
  return Array.isArray(nav) ? out : { ...nav, groups: out };
}

module.exports = { filterNavByVisibility };
