// Thin re-export of the canonical KCH messaging factory with the
// 'devforge' dashboard variant. Adds requireAdmin.
const createKchRouter = require('./shared/createKchRouter');
module.exports = createKchRouter({ dashboard: 'devforge' });
