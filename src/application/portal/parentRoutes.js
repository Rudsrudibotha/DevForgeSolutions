'use strict';

const express = require('express');
const { requireAuth } = require('../../middleware/portalAuth');
const ParentDashboardService = require('../../business/parentDashboardService');
const ParentPaymentService = require('../../business/parentPaymentService');
const ParentMessagingService = require('../../business/parentMessagingService');

const router = express.Router();
const service = new ParentDashboardService();
const paymentService = new ParentPaymentService();
const messagingService = new ParentMessagingService();

function safeCall(promise, fallback) {
  return promise.catch(err => {
    console.warn('[parent] data call failed, returning fallback:', err.message);
    return fallback;
  });
}

function requireParent(req, res, next) {
  if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  if (req.user.role !== 'parent') return res.redirect('/');
  next();
}

// GET /parent  - Parent shell (dashboard)
router.get('/', requireAuth, requireParent, async (req, res, next) => {
  try {
    res.locals.title = 'My family | Kinder Care Hub';
    res.locals.portal = 'parent';
    res.locals.activeNav = 'home';

    const [children, summary, messages] = await Promise.all([
      safeCall(service.getChildren(req.user.id), []),
      safeCall(service.getInvoicesSummary(req.user.id), { totalOwed: 0, totalPaid: 0, outstandingCount: 0, overdueCount: 0, overdueAmount: 0, invoiceCount: 0 }),
      safeCall(service.getRecentMessages(req.user.id, { limit: 5 }), [])
    ]);

    res.render('parent/dashboard', { children, summary, messages });
  } catch (err) { next(err); }
});

// GET /parent/child/:studentId  - Single child overview
router.get('/child/:studentId(\\d+)', requireAuth, requireParent, async (req, res, next) => {
  try {
    res.locals.title = 'My child | Kinder Care Hub';
    res.locals.portal = 'parent';
    res.locals.activeNav = 'children';

    const studentId = Number(req.params.studentId);
    const [children, invoices, attendance, consents] = await Promise.all([
      safeCall(service.getChildren(req.user.id), []),
      safeCall(service.getInvoices(req.user.id, { studentId }), []),
      safeCall(service.getAttendance(req.user.id, { studentId, days: 14 }), []),
      safeCall(service.getConsents(req.user.id), [])
    ]);

    const child = children.find(c => c.StudentID === studentId);
    if (!child) {
      return res.status(404).render('errors/csrf', { message: 'Child not found, or you do not have access.' });
    }

    const childConsents = consents.filter(c => c.StudentID === studentId);

    res.render('parent/child', { child, invoices, attendance, consents: childConsents });
  } catch (err) { next(err); }
});

// GET /parent/invoices
router.get('/invoices', requireAuth, requireParent, async (req, res, next) => {
  try {
    res.locals.title = 'Invoices | Kinder Care Hub';
    res.locals.portal = 'parent';
    res.locals.activeNav = 'invoices';

    const { studentId, status } = req.query;
    const [invoices, summary, children] = await Promise.all([
      safeCall(service.getInvoices(req.user.id, { studentId: studentId ? Number(studentId) : undefined, status }), []),
      safeCall(service.getInvoicesSummary(req.user.id), { totalOwed: 0, totalPaid: 0, outstandingCount: 0, overdueCount: 0, overdueAmount: 0, invoiceCount: 0 }),
      safeCall(service.getChildren(req.user.id), [])
    ]);

    res.render('parent/invoices', { invoices, summary, children, filters: { studentId, status } });
  } catch (err) { next(err); }
});

// HTMX partials
router.get('/partials/children-grid', requireAuth, requireParent, async (req, res, next) => {
  try {
    const children = await safeCall(service.getChildren(req.user.id), []);
    res.render('parent/partials/child-grid', { children, layout: false });
  } catch (err) { next(err); }
});

router.get('/partials/invoice-row/:id(\\d+)', requireAuth, requireParent, async (req, res, next) => {
  try {
    const invoices = await safeCall(service.getInvoices(req.user.id), []);
    const invoice = invoices.find(i => i.InvoiceID === Number(req.params.id));
    if (!invoice) return res.status(404).send('<tr><td colspan="8" class="text-muted text-center text-sm py-4">Not found</td></tr>');
    res.render('parent/partials/invoice-row', { invoice, layout: false });
  } catch (err) { next(err); }
});

// POST /parent/invoices/:id/pay
// HTMX target: replaces the row. Sets HX-Trigger header so the client
// shows a toast. Tenant-scoped via ParentPaymentService.
router.post('/invoices/:id(\\d+)/pay', requireAuth, requireParent, async (req, res, next) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await safeCall(
      paymentService.payInvoice(req.user.id, invoiceId),
      { ok: false, reason: 'Service unavailable' }
    );

    if (!result.ok) {
      // HX-Trigger: client shows a toast and the row stays as-is
      res.set('HX-Trigger', JSON.stringify({
        toast: { type: 'error', message: result.reason || 'Could not mark invoice as paid' }
      }));
      // Return the row unchanged. Re-fetch in case it actually exists.
      const invoices = await safeCall(service.getInvoices(req.user.id), []);
      const invoice = invoices.find(i => i.InvoiceID === invoiceId);
      if (!invoice) return res.status(404).send('<tr><td colspan="8" class="text-muted text-center text-sm py-4">Not found</td></tr>');
      return res.render('parent/partials/invoice-row', { invoice, layout: false });
    }

    // Success: refresh the row to show PendingPayment badge.
    res.set('HX-Trigger', JSON.stringify({
      toast: {
        type: 'success',
        message: result.alreadyPending
          ? 'Payment already pending school confirmation.'
          : 'Marked as paid. The school will confirm once the payment clears.'
      }
    }));
    res.render('parent/partials/invoice-row', { invoice: result.invoice, layout: false });
  } catch (err) { next(err); }
});

// ========================================================
// Parent messaging (SSR + HTMX)
// ========================================================

// GET /parent/messages - Conversation list
router.get('/messages', requireAuth, requireParent, async (req, res, next) => {
  try {
    res.locals.title = 'Messages | Kinder Care Hub';
    res.locals.portal = 'parent';
    res.locals.activeNav = 'messages';
    const conversations = await safeCall(messagingService.listConversations(req.user, {}), []);
    res.render('parent/messages/list', { conversations });
  } catch (err) { next(err); }
});

// GET /parent/messages/partials/list - HTMX partial for conversation list
router.get('/messages/partials/list', requireAuth, requireParent, async (req, res, next) => {
  try {
    const conversations = await safeCall(messagingService.listConversations(req.user, {}), []);
    res.render('parent/messages/partials/list', { conversations, layout: false });
  } catch (err) { next(err); }
});

// GET /parent/messages/:id - Single conversation view
router.get('/messages/:id(\\d+)', requireAuth, requireParent, async (req, res, next) => {
  try {
    res.locals.title = 'Conversation | Kinder Care Hub';
    res.locals.portal = 'parent';
    res.locals.activeNav = 'messages';
    const conversationId = Number(req.params.id);
    const [conversations, data] = await Promise.all([
      safeCall(messagingService.listConversations(req.user, {}), []),
      safeCall(messagingService.getMessages(req.user, conversationId), { conversation: null, messages: [] })
    ]);
    const active = conversations.find(c => c.ConversationID === conversationId) || data.conversation;
    if (!active) return res.status(404).send('Conversation not found');
    res.render('parent/messages/detail', { active, conversation: data.conversation, messages: data.messages || [], conversations });
  } catch (err) { next(err); }
});

// GET /parent/messages/:id/partials/messages - HTMX partial for messages
router.get('/messages/:id(\\d+)/partials/messages', requireAuth, requireParent, async (req, res, next) => {
  try {
    const conversationId = Number(req.params.id);
    const data = await safeCall(messagingService.getMessages(req.user, conversationId), { conversation: null, messages: [] });
    res.render('parent/messages/partials/messages', { messages: data.messages || [], layout: false });
  } catch (err) { next(err); }
});

// POST /parent/messages/:id/reply
router.post('/messages/:id(\\d+)/reply', requireAuth, requireParent, async (req, res, next) => {
  try {
    const conversationId = Number(req.params.id);
    const body = (req.body && (req.body.body || req.body.message)) || '';
    if (!body || String(body).trim().length === 0) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Message cannot be empty' } }));
      return res.status(400).send('');
    }
    if (String(body).length > 5000) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: 'Message is too long' } }));
      return res.status(400).send('');
    }
    await safeCall(messagingService.reply(req.user, conversationId, { body }), null);
    res.set('HX-Trigger', JSON.stringify({ toast: { type: 'success', message: 'Reply sent' } }));
    // Return the refreshed messages partial
    const data = await safeCall(messagingService.getMessages(req.user, conversationId), { messages: [] });
    res.render('parent/messages/partials/messages', { messages: data.messages || [], layout: false });
  } catch (err) {
    if (err && err.message) {
      res.set('HX-Trigger', JSON.stringify({ toast: { type: 'error', message: err.message } }));
      return res.status(400).send('');
    }
    next(err);
  }
});

// Kinder Care Hub inside the Parent portal (messaging only, no AI per Task 61)
router.get('/kch', requireAuth, requireParent, async (req, res, next) => {
  try {
    res.locals.title = 'Kinder Care Hub | My Family';
    res.locals.portal = 'parent';
    res.locals.activeNav = 'kch';
    res.render('partials/kch-chat', { showAi: false, sidebarOverride: 'parent', currentUserId: req.user.id });
  } catch (err) { next(err); }
});

// Parent consent signing page
router.get('/consent', (req, res) => {
  res.locals.title = 'Consent | Kinder Care Hub';
  res.locals.portal = 'parent';
  res.render('parent/consent/list', { list: [] });
});

// Parent re-enrolment confirmation page
router.get('/reenrolment', (req, res) => {
  res.locals.title = 'Re-enrolment | Kinder Care Hub';
  res.locals.portal = 'parent';
  res.render('parent/reenrolment/list', { list: [] });
});

// Parent verification pages (no auth required)
router.get('/verify', (req, res) => {
  res.locals.title = 'Verify | Kinder Care Hub';
  res.locals.portal = 'parent';
  res.render('parent/verify');
});

router.get('/verify/check-email', (req, res) => {
  res.locals.title = 'Check your email | Kinder Care Hub';
  res.locals.portal = 'parent';
  res.render('parent/verify-check-email', { email: req.query.email || '' });
});

module.exports = router;
