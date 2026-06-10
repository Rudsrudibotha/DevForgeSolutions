// Thin re-export of the canonical KCH messaging factory with the
// 'sms' dashboard variant. Adds requireSchoolPermission('messaging.school.use').
// See ./shared/createKchRouter.js for the single source of truth.
const createKchRouter = require('./shared/createKchRouter');
module.exports = createKchRouter({ dashboard: 'sms' });
