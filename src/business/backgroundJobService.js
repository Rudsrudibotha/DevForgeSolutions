// Business facade for the background job worker.
//
// Wires the durable BackgroundJob table to the existing business
// services. In dev/test these run in the web process; in production
// they can be run as a separate worker process by importing this
// file and calling startBackgroundWorkers() once.
//
// Job types:
//   - monthly_invoices         calls invoiceService.generateMonthlyInvoices
//   - overdue_flag             marks invoices past due
//   - broadcast_delivery       processes pending broadcast deliveries
//   - ai_request_redact        redacts old AI request logs
//
// All job handlers receive a job row from backgroundJobRepository.

const { startWorkerLoop, enqueue, defaultWorkerId } = require('../data/backgroundJobRepository');
const { generateMonthlyInvoices } = require('./invoiceService');

let startedWorkers = [];

async function handleMonthlyInvoices(job) {
  if (!job.tenantId && !job.schoolId) {
    throw new Error('monthly_invoices job missing tenantId or schoolId');
  }
  const result = await generateMonthlyInvoices({
    Role: 'admin',
    TenantId: job.tenantId,
    SchoolId: job.schoolId,
    Period: job.period
  });
  return result;
}

async function handleOverdueFlag(job) {
  const { markOverdueInvoices } = require('./invoiceService');
  return await markOverdueInvoices({
    TenantId: job.tenantId,
    SchoolId: job.schoolId
  });
}

async function handleBroadcastDelivery(job) {
  const { BroadcastDeliveryRepository } = require('../data/kinderCareHubOperationsRepository');
  return await BroadcastDeliveryRepository.processBatch({
    tenantId: job.tenantId,
    broadcastId: job.payload ? job.payload.broadcastId : null,
    batchSize: 200
  });
}

async function handleAiRequestRedact(job) {
  const { redactOldAiRequestLogs } = require('./aiChatService');
  return await redactOldAiRequestLogs({
    TenantId: job.tenantId,
    olderThanDays: job.payload && job.payload.olderThanDays ? job.payload.olderThanDays : 90
  });
}

const HANDLERS = {
  monthly_invoices: handleMonthlyInvoices,
  overdue_flag: handleOverdueFlag,
  broadcast_delivery: handleBroadcastDelivery,
  ai_request_redact: handleAiRequestRedact
};

function startBackgroundWorkers(options = {}) {
  if (startedWorkers.length) return startedWorkers;
  const intervalMs = options.intervalMs || 5000;
  const workerId = options.workerId || defaultWorkerId();
  const lockMs = options.lockMs || (5 * 60 * 1000);
  for (const [jobType, handler] of Object.entries(HANDLERS)) {
    const w = startWorkerLoop({ jobType, handler, intervalMs, workerId, lockMs });
    startedWorkers.push(w);
  }
  return startedWorkers;
}

function stopBackgroundWorkers() {
  for (const w of startedWorkers) {
    try { w.stop(); } catch (_) { /* ignore */ }
  }
  startedWorkers = [];
}

async function scheduleMonthlyInvoicesForAll({ period = null, runAt = null } = {}) {
  return await enqueue({
    jobType: 'monthly_invoices',
    period,
    runAt: runAt || new Date(),
    payload: { source: 'scheduled' }
  });
}

async function scheduleOverdueFlagForAll({ runAt = null } = {}) {
  return await enqueue({
    jobType: 'overdue_flag',
    runAt: runAt || new Date(),
    payload: { source: 'scheduled' }
  });
}

module.exports = {
  startBackgroundWorkers,
  stopBackgroundWorkers,
  scheduleMonthlyInvoicesForAll,
  scheduleOverdueFlagForAll,
  HANDLERS
};
