// API Routes - Bank reconciliation (monthly OFX model, school-scoped).

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/portalAuth');
const { attachSessionContext } = require('../business/sessionContextService');
const { BankReconciliationService } = require('../business/bankReconciliationService');
const { assertBankAccountForSchool } = require('../data/bankReconciliationRepository');
const { canTenantUseFeature } = require('../data/entitlementRepository');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const service = new BankReconciliationService();

router.use(requireAuth);
router.use(attachSessionContext());

async function gateAccess(req, res, next) {
  try {
    if (!req.sessionContext || !req.sessionContext.ActiveTenantId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (req.sessionContext.IsParentUser) {
      return res.status(403).json({ error: 'parent-blocked' });
    }
    const ent = await canTenantUseFeature(req.sessionContext.ActiveTenantId, 'KINDER_CARE_HUB_BANK_RECONCILIATION');
    if (!ent.IsAllowed) {
      return res.status(402).json({ error: 'feature-disabled' });
    }
    next();
  } catch (err) {
    console.error('[bank-reconciliation] gate error', err);
    res.status(500).json({ error: 'gate-error' });
  }
}

function schoolContext(req) {
  return {
    tenantId: req.sessionContext?.ActiveTenantId || req.user?.tenantId || null,
    schoolId: req.sessionContext?.ActiveSchoolId || req.user?.schoolId || null
  };
}

router.post('/imports', gateAccess, upload.single('ofxFile'), async (req, res) => {
  try {
    const { tenantId, schoolId } = schoolContext(req);
    const bankAccountId = Number(req.body.bankAccountId);
    const importYear = Number(req.body.importYear);
    const importMonth = Number(req.body.importMonth);

    if (!bankAccountId || !importYear || !importMonth) {
      return res.status(400).json({ error: 'bankAccountId, importYear, importMonth required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'ofxFile required' });
    }

    const account = await assertBankAccountForSchool(schoolId, bankAccountId);
    if (!account) {
      return res.status(403).json({ error: 'bank-account-school-mismatch' });
    }

    const ofxContent = req.file.buffer.toString('utf8');
    const result = await service.importOFX({
      tenantId, schoolId, bankAccountId, importYear, importMonth,
      ofxContent,
      originalFileName: req.file.originalname,
      importedByUserId: req.user.id
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status === 409 || err.status === 403) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[bank-reconciliation/imports] error', err);
    res.status(500).json({ error: err.message || 'import-failed' });
  }
});

router.get('/statements', gateAccess, async (req, res) => {
  try {
    const { tenantId, schoolId } = schoolContext(req);
    const bankAccountId = req.query.bankAccountId ? Number(req.query.bankAccountId) : null;
    if (bankAccountId) {
      const account = await assertBankAccountForSchool(schoolId, bankAccountId);
      if (!account) return res.status(403).json({ error: 'bank-account-school-mismatch' });
    }
    const statusFilter = req.query.filter || req.query.status || null;
    const list = await service.listStatements({
      tenantId, schoolId, bankAccountId, statusFilter, page: req.query.page || 1, pageSize: req.query.pageSize || 50
    });
    res.json({ items: list });
  } catch (err) {
    console.error('[bank-reconciliation/statements] error', err);
    res.status(err.status || 500).json({ error: err.message || 'list-failed' });
  }
});

router.get('/statements/:id/transactions', gateAccess, async (req, res) => {
  try {
    const { tenantId, schoolId } = schoolContext(req);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid-id' });
    const items = await service.listTransactionsForStatement(id, tenantId, schoolId);
    res.json({ items });
  } catch (err) {
    console.error('[bank-reconciliation/stmt/tx] error', err);
    res.status(err.status || 500).json({ error: err.message || 'tx-failed' });
  }
});

router.post('/statements/:id/transactions/:txId/match', gateAccess, async (req, res) => {
  try {
    const { tenantId, schoolId } = schoolContext(req);
    const statementId = Number(req.params.id);
    const bankTransactionId = Number(req.params.txId);
    const invoiceId = Number(req.body.invoiceId);
    if (!statementId || !bankTransactionId || !invoiceId) {
      return res.status(400).json({ error: 'statementId, bankTransactionId, invoiceId required' });
    }
    const result = await service.matchBankTransactionToInvoice({
      statementId, bankTransactionId, invoiceId, tenantId, schoolId, userId: req.user.id
    });
    res.json(result);
  } catch (err) {
    console.error('[bank-reconciliation/match] error', err);
    res.status(err.status || 500).json({ error: err.message || 'match-failed' });
  }
});

router.post('/statements/:id/reconcile', gateAccess, async (req, res) => {
  try {
    const { tenantId, schoolId } = schoolContext(req);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid-id' });
    const result = await service.markReconciled(id, tenantId, schoolId, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    console.error('[bank-reconciliation/stmt/reconcile] error', err);
    res.status(500).json({ error: err.message || 'reconcile-failed' });
  }
});

module.exports = router;
