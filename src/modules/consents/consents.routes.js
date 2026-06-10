// src/modules/consents/consents.routes.js
//
// HTTP router for the Consents module. Mounted at /api/consents.
// All four methods route through the service layer (no direct repo
// imports). State-changing methods use the audit middleware.
//
// This file is the recommended home for new consent routes; the
// existing src/application/admissionsFinanceRoutes.js continues to
// back production at /api/school-features/consent.

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireParent } = require('../../middleware/auth');
const { audit } = require('../../middleware/audit');
const { attachSessionContext } = require('../../business/sessionContextService');
const service = require('./consents.service');
const { canView, canManage } = require('./consents.permissions');

router.use(authenticateToken);
router.use(attachSessionContext());

router.get('/', async (req, res) => {
  if (!canView(req.user)) return res.status(403).json({ error: 'forbidden' });
  const list = await service.listForSchool(req.sessionContext);
  res.json({ consents: list });
});

router.get('/parent', requireParent, async (req, res) => {
  const list = await service.listForParent(req.sessionContext);
  res.json({ consents: list });
});

router.post('/', async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ error: 'forbidden' });
  const created = await service.create(req.sessionContext, req.body || {});
  res.status(201).json(created);
});

router.put('/:id/respond', requireParent, audit('Consent', 'Respond'), async (req, res) => {
  const ok = await service.respond(req.sessionContext, {
    consentId: Number(req.params.id),
    status: (req.body || {}).status,
    responseNote: (req.body || {}).responseNote
  });
  if (!ok) return res.status(404).json({ error: 'not_found_or_not_pending' });
  res.json({ ok: true });
});

module.exports = router;
