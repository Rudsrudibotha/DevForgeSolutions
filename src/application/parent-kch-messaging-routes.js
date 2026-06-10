// Thin re-export of the canonical KCH messaging factory with the
// 'parent' dashboard variant. Adds requireParent.
const createKchRouter = require('./shared/createKchRouter');
module.exports = createKchRouter({ dashboard: 'parent' });
