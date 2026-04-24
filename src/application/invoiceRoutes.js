// Application Layer - Invoice routes

// This module defines the API routes for invoice-related operations in the School Finance and Management System

const express = require('express');

const InvoiceService = require('../business/invoiceService');

const { authenticateToken, requireAdmin, requireSchoolOrAdmin } = require('../middleware/auth');

const router = express.Router();

const invoiceService = new InvoiceService();

// GET /api/invoices - Get all invoices for admins, or current school's invoices for school users

router.get('/', authenticateToken, requireSchoolOrAdmin, async (req, res) => {

  try {

    const invoices = await invoiceService.getAllInvoices(req.user);

    res.json(invoices);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

// GET /api/invoices/school/:schoolId - Get invoices by school ID. This must stay before /:id.

router.get('/school/:schoolId', authenticateToken, requireSchoolOrAdmin, async (req, res) => {

  try {

    const invoices = await invoiceService.getInvoicesBySchool(parseInt(req.params.schoolId, 10), req.user);

    res.json(invoices);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});

// GET /api/invoices/:id - Get invoice by ID

router.get('/:id', authenticateToken, requireSchoolOrAdmin, async (req, res) => {

  try {

    const invoice = await invoiceService.getInvoiceById(parseInt(req.params.id, 10), req.user);

    res.json(invoice);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

// POST /api/invoices - Create new invoice (admin only)

router.post('/', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const newInvoice = await invoiceService.createInvoice(req.body);

    res.status(201).json(newInvoice);

  } catch (error) {

    res.status(400).json({ error: error.message });

  }

});

// PUT /api/invoices/:id - Update invoice (admin only)

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const updatedInvoice = await invoiceService.updateInvoice(parseInt(req.params.id, 10), req.body);

    res.json(updatedInvoice);

  } catch (error) {

    res.status(400).json({ error: error.message });

  }

});

// DELETE /api/invoices/:id - Delete invoice (admin only)

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const result = await invoiceService.deleteInvoice(parseInt(req.params.id, 10));

    res.json(result);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

// PUT /api/invoices/:id/pay - Mark invoice as paid (admin only)

router.put('/:id/pay', authenticateToken, requireAdmin, async (req, res) => {

  try {

    const result = await invoiceService.markAsPaid(parseInt(req.params.id, 10));

    res.json(result);

  } catch (error) {

    res.status(404).json({ error: error.message });

  }

});

module.exports = router;
