'use strict';

// Attach a ScopedDb to every request. Routes that need DB access go through
// req.schoolDb - never through getPool() directly. This is the single chokepoint
// for tenancy enforcement on the School Management Dashboard.

const { ScopedDb } = require('../data/scopedDb');

function scopeToSchool(req, res, next) {
  req.schoolDb = new ScopedDb(req.user);
  res.locals.schoolDb = req.schoolDb; // for EJS views
  next();
}

module.exports = scopeToSchool;
