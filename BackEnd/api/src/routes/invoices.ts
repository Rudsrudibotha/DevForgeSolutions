import { Router } from 'express';
import { z } from 'zod';
import { Database } from '../services/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const csrfProtection = (req: any, res: any, next: any) => {
  const token = req.headers['x-csrf-token'];
  if (!token) return res.status(403).json({ ok: false, error: 'CSRF token required' });
  next();
};

const router = Router();

const invoiceSchema = z.object({
  studentId: z.string().uuid(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(z.object({
    feeItemId: z.string().uuid().optional(),
    description: z.string(),
    qty: z.number().positive(),
    unitCents: z.number().min(0)
  }))
});

// Get invoices
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { studentId, status } = req.query;
    
    let query = `
      SELECT i.*, s.first_name, s.last_name, s.student_no
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (studentId) {
      query += ` AND i.student_id = $${paramCount++}`;
      params.push(studentId);
    }
    
    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }
    
    query += ' ORDER BY i.issue_date DESC';

    const result = await Database.query(query, params, req.user!.schoolId);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create invoice
router.post('/', csrfProtection, authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);

    const result = await Database.transaction(async (client) => {
      // Create invoice
      const invoiceResult = await client.query(
        `INSERT INTO invoices (school_id, student_id, issue_date, due_date, status)
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING *`,
        [req.user!.schoolId, data.studentId, data.issueDate, data.dueDate]
      );

      const invoice = invoiceResult.rows[0];

      // Add invoice lines
      for (const line of data.lines) {
        await client.query(
          `INSERT INTO invoice_lines (school_id, invoice_id, fee_item_id, description, qty, unit_cents)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user!.schoolId, invoice.id, line.feeItemId, line.description, line.qty, line.unitCents]
        );
      }

      return invoice;
    }, req.user!.schoolId);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Get invoice details
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const invoiceResult = await Database.query(
      `SELECT i.*, s.first_name, s.last_name, s.student_no
       FROM invoices i
       JOIN students s ON i.student_id = s.id
       WHERE i.id = $1`,
      [req.params.id],
      req.user!.schoolId
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const linesResult = await Database.query(
      `SELECT il.*, fi.code as fee_code
       FROM invoice_lines il
       LEFT JOIN fee_items fi ON il.fee_item_id = fi.id
       WHERE il.invoice_id = $1
       ORDER BY il.id`,
      [req.params.id],
      req.user!.schoolId
    );

    const invoice = invoiceResult.rows[0];
    invoice.lines = linesResult.rows;

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Record payment
router.post('/:id/payments', csrfProtection, authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const { amountCents, method, reference, notes } = req.body;

    const result = await Database.transaction(async (client) => {
      // Get invoice details
      const invoiceResult = await client.query(
        'SELECT student_id, balance_cents FROM invoices WHERE id = $1',
        [req.params.id]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Create payment
      const paymentResult = await client.query(
        `INSERT INTO payments (school_id, student_id, received_at, method, reference, amount_cents, notes)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
         RETURNING *`,
        [req.user!.schoolId, invoice.student_id, method, reference, amountCents, notes]
      );

      const payment = paymentResult.rows[0];

      // Allocate payment to invoice
      const allocationAmount = Math.min(amountCents, invoice.balance_cents);
      await client.query(
        `INSERT INTO payment_allocations (school_id, payment_id, invoice_id, amount_cents)
         VALUES ($1, $2, $3, $4)`,
        [req.user!.schoolId, payment.id, req.params.id, allocationAmount]
      );

      return payment;
    }, req.user!.schoolId);

    res.status(201).json(result);
  } catch (error) {
    console.error('Payment recording error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

export { router as invoicesRouter };