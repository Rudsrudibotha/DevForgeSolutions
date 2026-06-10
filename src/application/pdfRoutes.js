// API Routes - PDF invoice / statement download.
// Streams a generated PDF for a single invoice. Always scoped to the
// caller's active tenant and school.

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { streamInvoicePdf } = require('../business/pdfInvoiceService');
const { requireSchoolPermission } = require('../middleware/auth');
const { attachSessionContext } = require('../business/sessionContextService');

// School-side download
router.get('/invoices/:id/pdf', authenticateToken, attachSessionContext(),
  requireSchoolPermission('finance.invoices.view'),
  async (req, res, next) => {
    try {
      const tenantId = req.sessionContext.ActiveTenantId;
      await streamInvoicePdf({ res, invoiceId: Number(req.params.id), tenantId, copyType: 'Customer' });
    } catch (err) {
      next(err);
    }
  });

// Parent-side download (read-only invoice access for parents)
const { parentService } = (() => { try { return require('../business/parentService'); } catch (_) { return {}; } })();
router.get('/parent/invoices/:id/pdf', authenticateToken, attachSessionContext(),
  async (req, res, next) => {
    try {
      if (!req.sessionContext.IsParentUser) return res.status(403).json({ error: 'parent-only' });
      const tenantId = req.sessionContext.ActiveTenantId;
      await streamInvoicePdf({ res, invoiceId: Number(req.params.id), tenantId, copyType: 'Parent' });
    } catch (err) {
      next(err);
    }
  });

module.exports = router;
