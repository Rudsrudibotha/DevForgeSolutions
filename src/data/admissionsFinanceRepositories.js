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
  async getById(id, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM Admissions WHERE AdmissionID = @id AND SchoolID = @schoolId');
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
      .query(`IF @familyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              IF @billingCategoryId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM BillingCategories WHERE BillingCategoryID = @billingCategoryId AND SchoolID = @schoolId)
                THROW 50000, 'Billing category must belong to the selected school', 1;
              INSERT INTO Admissions (SchoolID,FamilyID,FirstName,LastName,DateOfBirth,ClassName,BillingCategoryID,Notes,AppliedDate)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@firstName,@lastName,@dateOfBirth,@className,@billingCategoryId,@notes,@appliedDate)`);
    return result.recordset[0];
  }
  async updateStatus(id, schoolId, status, enrolledDate, convertedStudentId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId).input('status', sql.NVarChar, status)
      .input('enrolledDate', sql.Date, enrolledDate || null).input('convertedStudentId', sql.Int, convertedStudentId || null)
      .query(`UPDATE Admissions SET Status=@status, EnrolledDate=@enrolledDate, ConvertedStudentID=@convertedStudentId, UpdatedDate=GETDATE()
              OUTPUT INSERTED.* WHERE AdmissionID=@id AND SchoolID=@schoolId
                AND (@convertedStudentId IS NULL OR EXISTS (
                  SELECT 1 FROM Students WHERE StudentID = @convertedStudentId AND SchoolID = @schoolId
                ))`);
    return result.recordset[0];
  }
}

class ConsentRepository {
  consentSelect() {
    return `cr.*,
              s.FirstName, s.LastName, s.ClassName, s.FamilyID,
              f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail,
              req.Title AS RequestTitle,
              req.ActivityDate,
              req.DueDate,
              req.Location,
              req.TargetScope,
              req.TargetValue,
              req.DocumentBody,
              req.RiskNotes,
              req.MedicalInstructions,
              req.Status AS RequestStatus`;
  }

  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT ${this.consentSelect()}
              FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN ConsentRequests req ON cr.ConsentRequestID = req.ConsentRequestID
              WHERE cr.SchoolID = @schoolId
              ORDER BY COALESCE(req.CreatedDate, cr.CreatedDate) DESC, s.LastName, s.FirstName`);
    return result.recordset;
  }
  async getByStudent(studentId, schoolId = null) {
    const pool = await getPool();
    const req = pool.request().input('studentId', sql.Int, studentId);
    let schoolFilter = '';
    if (schoolId) {
      req.input('schoolId', sql.Int, schoolId);
      schoolFilter = 'AND cr.SchoolID = @schoolId';
    }
    const result = await req
      .query(`SELECT ${this.consentSelect()}
              FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN ConsentRequests req ON cr.ConsentRequestID = req.ConsentRequestID
              WHERE cr.StudentID = @studentId ${schoolFilter}
              ORDER BY COALESCE(req.CreatedDate, cr.CreatedDate) DESC`);
    return result.recordset;
  }
  async getByParent(parentUserId) {
    const pool = await getPool();
    const result = await pool.request().input('parentUserId', sql.Int, parentUserId)
      .query(`SELECT ${this.consentSelect()}
              FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID
              LEFT JOIN ConsentRequests req ON cr.ConsentRequestID = req.ConsentRequestID
              WHERE pl.UserID = @parentUserId
              ORDER BY COALESCE(req.CreatedDate, cr.CreatedDate) DESC, s.LastName, s.FirstName`);
    return result.recordset;
  }

  normalizeScope(scope) {
    const normalized = String(scope || '').trim().toLowerCase();
    if (normalized === 'school' || normalized === 'all' || normalized === 'entire student body') return 'School';
    if (normalized === 'grade') return 'Grade';
    if (normalized === 'class') return 'Class';
    return 'Student';
  }

  defaultDocumentBody(data) {
    const title = data.title || data.consentType || 'School Permission Slip';
    const activityDate = data.activityDate ? ` on ${data.activityDate}` : '';
    const location = data.location ? ` at ${data.location}` : '';
    return `I confirm that I am the parent or legal guardian of the learner named on this permission slip. I have read and understood the details for ${title}${activityDate}${location}. I grant or decline permission for my child to participate as indicated below. I understand that the school will take reasonable care of learners and will contact me in an emergency using the contact details on record.`;
  }

  async getTargetStudents(transaction, data) {
    const scope = this.normalizeScope(data.targetScope || (data.studentId ? 'Student' : 'School'));
    const req = new sql.Request(transaction).input('schoolId', sql.Int, data.schoolId);
    let where = 'WHERE s.SchoolID = @schoolId AND ISNULL(s.IsActive, 1) = 1';

    if (scope === 'Student') {
      const studentId = Number(data.studentId || data.targetValue);
      if (!studentId) throw new Error('Student is required for an individual permission slip');
      req.input('studentId', sql.Int, studentId);
      where += ' AND s.StudentID = @studentId';
    }

    if (scope === 'Class') {
      const targetValue = String(data.targetValue || data.className || '').trim();
      if (!targetValue) throw new Error('Class is required for a class permission slip');
      req.input('targetValue', sql.NVarChar, targetValue);
      where += ' AND s.ClassName = @targetValue';
    }

    if (scope === 'Grade') {
      const targetValue = String(data.targetValue || data.gradeName || '').trim();
      if (!targetValue) throw new Error('Grade is required for a grade permission slip');
      req.input('targetValue', sql.NVarChar, targetValue);
      req.input('targetPrefix', sql.NVarChar, `${targetValue}%`);
      where += ' AND (s.ClassName = @targetValue OR s.ClassName LIKE @targetPrefix)';
    }

    const result = await req.query(`SELECT s.StudentID FROM Students s ${where} ORDER BY s.LastName, s.FirstName`);
    return { scope, students: result.recordset };
  }

  async create(data) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { scope, students } = await this.getTargetStudents(transaction, data);
      if (!students.length) {
        throw new Error('No active students match this permission slip target');
      }

      const consentType = String(data.consentType || 'General Permission').trim();
      const title = String(data.title || `${consentType} Permission Slip`).trim();
      const targetValue = scope === 'School' ? 'Entire student body' : String(data.targetValue || data.className || data.gradeName || data.studentId || '').trim();
      const documentBody = String(data.documentBody || data.notes || this.defaultDocumentBody({ ...data, title, consentType })).trim();

      const requestResult = await new sql.Request(transaction)
        .input('schoolId', sql.Int, data.schoolId)
        .input('consentType', sql.NVarChar, consentType)
        .input('title', sql.NVarChar, title)
        .input('activityDate', sql.Date, data.activityDate || null)
        .input('dueDate', sql.Date, data.dueDate || null)
        .input('location', sql.NVarChar, data.location || null)
        .input('targetScope', sql.NVarChar, scope)
        .input('targetValue', sql.NVarChar, targetValue || null)
        .input('documentBody', sql.NVarChar(sql.MAX), documentBody)
        .input('riskNotes', sql.NVarChar, data.riskNotes || null)
        .input('medicalInstructions', sql.NVarChar, data.medicalInstructions || null)
        .input('createdBy', sql.Int, data.createdBy || null)
        .query(`INSERT INTO ConsentRequests (
                  SchoolID, ConsentType, Title, ActivityDate, DueDate, Location, TargetScope,
                  TargetValue, DocumentBody, RiskNotes, MedicalInstructions, CreatedBy
                )
                OUTPUT INSERTED.*
                VALUES (
                  @schoolId, @consentType, @title, @activityDate, @dueDate, @location, @targetScope,
                  @targetValue, @documentBody, @riskNotes, @medicalInstructions, @createdBy
                )`);

      const request = requestResult.recordset[0];
      const records = [];
      for (const student of students) {
        const recordResult = await new sql.Request(transaction)
          .input('schoolId', sql.Int, data.schoolId)
          .input('studentId', sql.Int, student.StudentID)
          .input('consentRequestId', sql.Int, request.ConsentRequestID)
          .input('consentType', sql.NVarChar, consentType)
          .input('notes', sql.NVarChar, data.notes || null)
          .query(`INSERT INTO ConsentRecords (SchoolID, StudentID, ConsentRequestID, ConsentType, Notes)
                  OUTPUT INSERTED.*
                  VALUES (@schoolId, @studentId, @consentRequestId, @consentType, @notes)`);
        records.push(recordResult.recordset[0]);
      }

      await transaction.commit();
      return { request, records, createdCount: records.length };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {
        // The original error is more useful than a rollback failure here.
      }
      throw error;
    }
  }
  async respond(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('response', sql.NVarChar, data.response)
      .input('parentUserId', sql.Int, data.parentUserId)
      .input('signatureName', sql.NVarChar, data.signatureName || null)
      .input('signatureRelationship', sql.NVarChar, data.signatureRelationship || null)
      .input('responseNotes', sql.NVarChar, data.responseNotes || null)
      .query(`UPDATE cr
              SET Response=@response,
                  ParentUserID=@parentUserId,
                  SignatureName=@signatureName,
                  SignatureRelationship=@signatureRelationship,
                  ResponseNotes=@responseNotes,
                  ResponseDate=GETDATE(),
                  UpdatedDate=GETDATE()
              OUTPUT INSERTED.*
              FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              INNER JOIN ParentLinks pl ON pl.FamilyID = s.FamilyID AND pl.SchoolID = s.SchoolID
              WHERE cr.ConsentID=@id AND pl.UserID=@parentUserId`);
    return result.recordset[0];
  }
  async getMissing(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT ${this.consentSelect()}
              FROM ConsentRecords cr
              INNER JOIN Students s ON cr.StudentID = s.StudentID
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN ConsentRequests req ON cr.ConsentRequestID = req.ConsentRequestID
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
      .query(`IF @studentId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the selected school', 1;
              IF @familyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              IF @invoiceId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = @invoiceId AND SchoolID = @schoolId)
                THROW 50000, 'Invoice must belong to the selected school', 1;
              INSERT INTO FinancialAdjustments (SchoolID,StudentID,FamilyID,InvoiceID,AdjustmentType,Amount,Reason,CreatedBy)
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
      .query(`IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              IF @studentId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the selected school', 1;
              INSERT INTO Refunds (SchoolID,FamilyID,StudentID,Amount,Reason,CreatedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@studentId,@amount,@reason,@createdBy)`);
    return result.recordset[0];
  }
  async approve(id, schoolId, approvedBy) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId).input('approvedBy', sql.Int, approvedBy)
      .query(`UPDATE Refunds SET Status='Approved', ApprovedBy=@approvedBy, ApprovedDate=GETDATE()
              OUTPUT INSERTED.* WHERE RefundID=@id AND SchoolID=@schoolId AND Status='Pending'`);
    return result.recordset[0];
  }
  async complete(id, schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId)
      .query(`UPDATE Refunds SET Status='Completed' OUTPUT INSERTED.* WHERE RefundID=@id AND SchoolID=@schoolId AND Status='Approved'`);
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
      .query(`IF @studentId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the selected school', 1;
              IF @familyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              INSERT INTO RegistrationFees (SchoolID,StudentID,FamilyID,FeeType,Amount,IsRefundable,Notes)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@familyId,@feeType,@amount,@isRefundable,@notes)`);
    return result.recordset[0];
  }
  async markPaid(id, schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId)
      .query(`UPDATE RegistrationFees SET IsPaid=1, PaidDate=GETDATE() OUTPUT INSERTED.* WHERE RegistrationFeeID=@id AND SchoolID=@schoolId`);
    return result.recordset[0];
  }
}

module.exports = { AdmissionsRepository, ConsentRepository, FinancialAdjustmentRepository, RefundRepository, RegistrationFeeRepository };
