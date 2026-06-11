// Thin re-export of the canonical KCH messaging factory. Mounted at
// /api/messages for every dashboard; the factory's role-aware guard
// applies requireSchoolPermission('messaging.school.use') to school
// users and lets parents/admins through to the per-conversation access
// checks. See ./shared/createKchRouter.js for the single source of truth.
const createKchRouter = require('./shared/createKchRouter');
module.exports = createKchRouter({ dashboard: 'shared' });
