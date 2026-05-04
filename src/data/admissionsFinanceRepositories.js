// Data Layer - Admissions, Consent, Adjustments, Refunds, Registration Fees repositories

const { getPool, sql } = require('./db');

class AdmissionsRepository {
  async getBySchool(schoolId, status) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE a.SchoolID = @schoolId';
    if (status) { req.input('status', sql.NVarChar, status); where += ' AND a.Status = @status'; }
    const result = await req.query(`SELECT a.*, f.FamilyName FROM Admissions a LEFT JOIN Families f ON a.FamilyID = f.FamilyID ${where} ORDER BY a.AppliedDate DESC`);
    return result.recordset;
  }
  async getById(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Admissions WHERE AdmissionID = @id');
    return result.recordset[0];
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('familyId', sql.Int, data.familyId || null)
      .input('firstName', sql.NVarChar, data.firstName).input('lastName', sql.NVarChar, data.lastName)
      .input('dateOfBirth', sql.Date, data.dateOfBirth || null).input('className', sql.NVarChar, data.className || null)
      .input('billingCategoryId', sql.Int, data.billingCategoryId || null).input('notes', sql.NVarChar, data.notes || null)
      .input('appliedDate', sql.Date, data.appliedDate || new Date())
      .query(`INSERT INTO Admissions (SchoolID,FamilyID,FirstName,LastName,DateOfBirth,ClassName,BillingCategoryID,Notes,AppliedDate)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@firstName,@lastName,@dateOfBirth,@className,@billingCategoryId,@notes,@appliedDate)`);
    return result.recordset[0];
  }
  async updateStatus(id, status, enrolledDate, convertedStudentId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('status', sql.NVarChar, status)
      .input('enrolledDate', sql.Date, enrolledDate || null).input('convertedStudentId', sql.Int, convertedStudentId || null)
      .query(`UPDATE Admissions SET Status=@status, EnrolledDate=@enrolledDate, ConvertedStudentID=@convertedStudentId, UpdatedDate=GETDATE()
              OUTPUT INSERTED.* WHERE AdmissionID=@id`);
    return result.recordset[0];
  }
}

class ConsentRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT cr.*, s.FirstName, s.LastName FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID WHERE cr.SchoolID = @schoolId ORDER BY cr.CreatedDate DESC`);
    return result.recordset;
  }
  async getByStudent(studentId) {
    const pool = await getPool();
    const result = await pool.request().input('studentId', sql.Int, studentId)
      .query('SELECT * FROM ConsentRecords WHERE StudentID = @studentId ORDER BY CreatedDate DESC');
    return result.recordset;
  }
  async getByParent(parentUserId) {
    const pool = await getPool();
    const result = await pool.request().input('parentUserId', sql.Int, parentUserId)
      .query(`SELECT cr.*, s.FirstName, s.LastName FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID
              WHERE pl.UserID = @parentUserId ORDER BY cr.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId)
      .input('parentUserId', sql.Int, data.parentUserId || null).input('consentType', sql.NVarChar, data.consentType)
      .input('notes', sql.NVarChar, data.notes || null)
      .query(`INSERT INTO ConsentRecords (SchoolID,StudentID,ParentUserID,ConsentType,Notes)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@parentUserId,@consentType,@notes)`);
    return result.recordset[0];
  }
  async respond(id, response, parentUserId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('response', sql.NVarChar, response)
      .input('parentUserId', sql.Int, parentUserId)
      .query(`UPDATE ConsentRecords SET Response=@response, ParentUserID=@parentUserId, ResponseDate=GETDATE(), UpdatedDate=GETDATE()
              OUTPUT INSERTED.* WHERE ConsentID=@id`);
    return result.recordset[0];
  }
  async getMissing(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT cr.*, s.FirstName, s.LastName FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              WHERE cr.SchoolID = @schoolId AND cr.Response = 'Pending' ORDER BY s.LastName`);
    return result.recordset;
  }
}

class FinancialAdjustmentRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT fa.*, s.FirstName, s.LastName, i.InvoiceNumber FROM FinancialAdjustments fa
              LEFT JOIN Students s ON fa.StudentID = s.StudentID LEFT JOIN Invoices i ON fa.InvoiceID = i.InvoiceID
              WHERE fa.SchoolID = @schoolId ORDER BY fa.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId || null)
      .input('familyId', sql.Int, data.familyId || null).input('invoiceId', sql.Int, data.invoiceId || null)
      .input('adjustmentType', sql.NVarChar, data.adjustmentType).input('amount', sql.Decimal(10,2), data.amount)
      .input('reason', sql.NVarChar, data.reason).input('createdBy', sql.Int, data.createdBy)
      .query(`INSERT INTO FinancialAdjustments (SchoolID,StudentID,FamilyID,InvoiceID,AdjustmentType,Amount,Reason,CreatedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@familyId,@invoiceId,@adjustmentType,@amount,@reason,@createdBy)`);
    return result.recordset[0];
  }
}

class RefundRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT r.*, f.FamilyName, s.FirstName, s.LastName FROM Refunds r
              INNER JOIN Families f ON r.FamilyID = f.FamilyID LEFT JOIN Students s ON r.StudentID = s.StudentID
              WHERE r.SchoolID = @schoolId ORDER BY r.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('familyId', sql.Int, data.familyId)
      .input('studentId', sql.Int, data.studentId || null).input('amount', sql.Decimal(10,2), data.amount)
      .input('reason', sql.NVarChar, data.reason).input('createdBy', sql.Int, data.createdBy)
      .query(`INSERT INTO Refunds (SchoolID,FamilyID,StudentID,Amount,Reason,CreatedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@studentId,@amount,@reason,@createdBy)`);
    return result.recordset[0];
  }
  async approve(id, approvedBy) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('approvedBy', sql.Int, approvedBy)
      .query(`UPDATE Refunds SET Status='Approved', ApprovedBy=@approvedBy, ApprovedDate=GETDATE()
              OUTPUT INSERTED.* WHERE RefundID=@id AND Status='Pending'`);
    return result.recordset[0];
  }
  async complete(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id)
      .query(`UPDATE Refunds SET Status='Completed' OUTPUT INSERTED.* WHERE RefundID=@id AND Status='Approved'`);
    return result.recordset[0];
  }
}

class RegistrationFeeRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT rf.*, s.FirstName, s.LastName, f.FamilyName FROM RegistrationFees rf
              LEFT JOIN Students s ON rf.StudentID = s.StudentID LEFT JOIN Families f ON rf.FamilyID = f.FamilyID
              WHERE rf.SchoolID = @schoolId ORDER BY rf.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId || null)
      .input('familyId', sql.Int, data.familyId || null).input('feeType', sql.NVarChar, data.feeType)
      .input('amount', sql.Decimal(10,2), data.amount).input('isRefundable', sql.Bit, data.isRefundable || false)
      .input('notes', sql.NVarChar, data.notes || null)
      .query(`INSERT INTO RegistrationFees (SchoolID,StudentID,FamilyID,FeeType,Amount,IsRefundable,Notes)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@familyId,@feeType,@amount,@isRefundable,@notes)`);
    return result.recordset[0];
  }
  async markPaid(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id)
      .query(`UPDATE RegistrationFees SET IsPaid=1, PaidDate=GETDATE() OUTPUT INSERTED.* WHERE RegistrationFeeID=@id`);
    return result.recordset[0];
  }
}

module.exports = { AdmissionsRepository, ConsentRepository, FinancialAdjustmentRepository, RefundRepository, RegistrationFeeRepository };
