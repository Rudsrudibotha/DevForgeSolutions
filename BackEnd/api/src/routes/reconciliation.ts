import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';
import { setTenantContext, requireRole } from '../middleware/tenant.js';
import { parseOFX, parseCSV, autoMatchTransactions } from '../services/ofxParser.js';
import multer from 'multer';

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Upload and parse bank file
r.post('/upload', requireAuth, setTenantContext, requireRole(['school_admin', 'staff']), 
  upload.single('bankFile'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf8');
    const isOFX = content.includes('<OFX>') || content.includes('<STMTTRN>');
    
    const transactions = isOFX ? parseOFX(content) : parseCSV(content);
    
    if (transactions.length === 0) {
      return res.status(400).json({ ok: false, error: 'No transactions found in file' });
    }

    // Store raw transactions with idempotency
    const client = await db.connect();
    try {
      await client.query('SELECT app.set_school($1)', [req.user.school_id]);
      
      const insertedTxns = [];
      for (const txn of transactions) {
        try {
          const { rows } = await client.query(
            `INSERT INTO bank_transactions (school_id, transaction_id, date, amount_cents, description, reference, file_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (school_id, transaction_id) DO NOTHING
             RETURNING *`,
            [req.user.school_id, txn.id, txn.date, txn.amount, txn.description, txn.reference, 
             req.file.originalname]
          );
          if (rows.length > 0) insertedTxns.push(rows[0]);
        } catch (e) {
          // Skip duplicates
        }
      }

      // Get open invoices for matching
      const invoices = await client.query(
        `SELECT id, invoice_no, student_id, balance_cents 
         FROM invoices WHERE status IN ('open', 'partial') AND balance_cents > 0`
      );

      const matches = autoMatchTransactions(insertedTxns, invoices.rows);
      
      res.json({
        ok: true,
        imported: insertedTxns.length,
        total: transactions.length,
        matches: matches
      });
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

// Get unmatched transactions
r.get('/unmatched', requireAuth, setTenantContext, requireRole(['school_admin', 'staff']), 
  async (req: any, res, next) => {
  try {
    const client = await db.connect();
    try {
      await client.query('SELECT app.set_school($1)', [req.user.school_id]);
      
      const { rows } = await client.query(
        `SELECT bt.*, pa.id as allocation_id
         FROM bank_transactions bt
         LEFT JOIN payment_allocations pa ON bt.id = pa.bank_transaction_id
         WHERE pa.id IS NULL
         ORDER BY bt.date DESC`
      );
      
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

// Confirm allocation
r.post('/allocate', requireAuth, setTenantContext, requireRole(['school_admin', 'staff']), 
  async (req: any, res, next) => {
  try {
    const { transaction_id, invoice_id, amount_cents } = req.body;
    
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT app.set_school($1)', [req.user.school_id]);
      
      // Create payment record
      const payment = await client.query(
        `INSERT INTO payments (school_id, amount_cents, payment_date, method, reference, recorded_by)
         SELECT school_id, $2, date, 'eft', reference, $3
         FROM bank_transactions WHERE id = $1
         RETURNING *`,
        [transaction_id, amount_cents, req.user.sub]
      );
      
      // Create allocation
      await client.query(
        `INSERT INTO payment_allocations (school_id, payment_id, invoice_id, amount_cents, bank_transaction_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.school_id, payment.rows[0].id, invoice_id, amount_cents, transaction_id]
      );
      
      // Update invoice paid amount
      await client.query(
        `UPDATE invoices SET paid_cents = paid_cents + $1,
         status = CASE WHEN paid_cents + $1 >= total_cents THEN 'paid' 
                      WHEN paid_cents + $1 > 0 THEN 'partial' 
                      ELSE status END
         WHERE id = $2`,
        [amount_cents, invoice_id]
      );
      
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

export default r;