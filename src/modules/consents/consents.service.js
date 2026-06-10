// src/modules/consents/consents.service.js
//
// Business facade for the Consents module. The existing
// src/business/smsPortalFacades.js continues to back production; this
// file is the recommended home for consent-specific business rules
// going forward.

'use strict';

const { getPool } = require('../../data/db');
const repo = require('./consents.repository');

async function listForSchool(ctx) {
  const pool = await getPool();
  return await repo.listForSchool(pool, {
    tenantId: ctx.ActiveTenantId,
    schoolId: ctx.ActiveSchoolId
  });
}

async function listForParent(ctx) {
  const pool = await getPool();
  return await repo.listForParent(pool, {
    tenantId: ctx.ActiveTenantId,
    parentUserId: ctx.UserId
  });
}

async function create(ctx, payload) {
  if (!payload.title || !payload.body) {
    throw new Error('create: title and body are required');
  }
  const pool = await getPool();
  return await repo.create(pool, {
    tenantId: ctx.ActiveTenantId,
    schoolId: ctx.ActiveSchoolId,
    studentId: payload.studentId,
    parentUserId: payload.parentUserId,
    title: payload.title,
    body: payload.body,
    status: 'Pending',
    createdByUserId: ctx.UserId
  });
}

async function respond(ctx, { consentId, status, responseNote }) {
  if (!['Granted', 'Declined'].includes(status)) {
    throw new Error('respond: status must be Granted or Declined');
  }
  const pool = await getPool();
  return await repo.respond(pool, {
    tenantId: ctx.ActiveTenantId,
    consentId,
    parentUserId: ctx.UserId,
    status,
    responseNote
  });
}

module.exports = { listForSchool, listForParent, create, respond };
