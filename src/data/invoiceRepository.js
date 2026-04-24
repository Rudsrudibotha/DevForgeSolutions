// Data Layer - Invoice repository

// This module handles database operations for invoices in the School Finance and Management System

const { sql } = require('./db');

class InvoiceRepository {

  // Get all invoices

  async getAllInvoices() {

    const pool = await sql.connect();

    const result = await pool.request().query('SELECT * FROM Invoices');

    return result.recordset;

  }

  // Get invoice by ID

  async getInvoiceById(id) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('id', sql.Int, id)

      .query('SELECT * FROM Invoices WHERE InvoiceID = @id');

    return result.recordset[0];

  }

  // Get invoices by school ID

  async getInvoicesBySchool(schoolId) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('schoolId', sql.Int, schoolId)

      .query('SELECT * FROM Invoices WHERE SchoolID = @schoolId');

    return result.recordset;

  }

  // Create new invoice

  async createInvoice(invoiceData) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('schoolId', sql.Int, invoiceData.schoolId)

      .input('invoiceNumber', sql.NVarChar, invoiceData.invoiceNumber)

      .input('amount', sql.Decimal(10,2), invoiceData.amount)

      .input('description', sql.NVarChar, invoiceData.description)

      .input('status', sql.NVarChar, invoiceData.status || 'Pending')

      .input('dueDate', sql.DateTime, invoiceData.dueDate)

      .query(`INSERT INTO Invoices (SchoolID, InvoiceNumber, Amount, Description, Status, DueDate)

              OUTPUT INSERTED.*

              VALUES (@schoolId, @invoiceNumber, @amount, @description, @status, @dueDate)`);

    return result.recordset[0];

  }

  // Update invoice

  async updateInvoice(id, invoiceData) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('id', sql.Int, id)

      .input('schoolId', sql.Int, invoiceData.schoolId)

      .input('invoiceNumber', sql.NVarChar, invoiceData.invoiceNumber)

      .input('amount', sql.Decimal(10,2), invoiceData.amount)

      .input('description', sql.NVarChar, invoiceData.description)

      .input('status', sql.NVarChar, invoiceData.status)

      .input('dueDate', sql.DateTime, invoiceData.dueDate)

      .input('paidDate', sql.DateTime, invoiceData.paidDate)

      .query(`UPDATE Invoices SET SchoolID = @schoolId, InvoiceNumber = @invoiceNumber, Amount = @amount,

              Description = @description, Status = @status, DueDate = @dueDate, PaidDate = @paidDate,

              UpdatedDate = GETDATE()

              OUTPUT INSERTED.*

              WHERE InvoiceID = @id`);

    return result.recordset[0];

  }

  // Delete invoice

  async deleteInvoice(id) {

    const pool = await sql.connect();

    await pool.request()

      .input('id', sql.Int, id)

      .query('DELETE FROM Invoices WHERE InvoiceID = @id');

    return { message: 'Invoice deleted' };

  }

  // Mark invoice as paid

  async markAsPaid(id) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('id', sql.Int, id)

      .query(`UPDATE Invoices SET Status = 'Paid', PaidDate = GETDATE(), UpdatedDate = GETDATE() WHERE InvoiceID = @id`);

    return result.rowsAffected[0] > 0;

  }

}

module.exports = InvoiceRepository;
