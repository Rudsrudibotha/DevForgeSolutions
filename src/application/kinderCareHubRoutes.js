// Thin re-export of the canonical KCH messaging factory.
// See ./shared/createKchRouter.js for the single source of truth.
// The 'shared' dashboard variant is the default; no extra role guard.
const createKchRouter = require('./shared/createKchRouter');
module.exports = createKchRouter({ dashboard: 'shared' });
