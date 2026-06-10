'use strict';

const path = require('path');

function portalHome(portal) {
  if (portal === 'devforge') return '/devforge';
  if (portal === 'parent') return '/parent';
  return '/sms';
}

function formatDate(value, opts) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-ZA', Object.assign({ year: 'numeric', month: 'short', day: '2-digit' }, opts || {}));
}

function formatMoney(amount, currency) {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(n);
  } catch (_) { return n.toFixed(2); }
}

function initials(name) {
  if (!name) return '?';
  return String(name).trim().split(/\s+/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join('');
}

function activeClass(currentPath, target) {
  if (currentPath === target) return 'active';
  if (target !== '/' && currentPath.startsWith(target + '/')) return 'active';
  return '';
}

function registerLocals(req, res, next) {
  res.locals.portal = (res.locals.portal || (req.user && req.user.role === 'admin' ? 'devforge' : req.user && req.user.role === 'parent' ? 'parent' : 'sms'));
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.formatDate = formatDate;
  res.locals.formatMoney = formatMoney;
  res.locals.initials = initials;
  res.locals.activeClass = activeClass;
  res.locals.portalHome = portalHome;
  res.locals.title = res.locals.title || 'Kinder Care Hub';
  next();
}

function setupViewEngine(app) {
  app.set('views', path.resolve(__dirname, '..', '..', 'views'));
  app.set('view engine', 'ejs');
}

module.exports = { registerLocals, setupViewEngine, portalHome, formatDate, formatMoney, initials, activeClass };
