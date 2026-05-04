// Data Layer - Feature repositories (behaviour, academic, documents, credit notes, discounts, promise-to-pay, templates, communication)

const { getPool, sql } = require('./db');

class BehaviourLogRepository {
  async getByStudent(studentId) {
    const pool = await getPool();
    const result = await pool.request().input('studentId', sql.Int, studentId)
      .query('SELECT * FROM BehaviourLogs WHERE StudentID = @studentId ORDER BY LogDate DESC');
    return result.recordset;
  }
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT b.*, s.FirstName, s.LastName FROM BehaviourLogs b
              INNER JOIN Students s ON b.StudentID = s.StudentID WHERE b.SchoolID = @schoolId ORDER BY b.LogDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId)
      .input('logDate', sql.Date, data.logDate).input('category', sql.NVarChar, data.category)
      .input('description', sql.NVarChar, data.description).input('actionTaken', sql.NVarChar, data.actionTaken || null)
      .input('recordedBy', sql.Int, data.recordedBy || null)
      .query(`INSERT INTO BehaviourLogs (SchoolID,StudentID,LogDate,Category,Description,ActionTaken,RecordedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@logDate,@category,@description,@actionTaken,@recordedBy)`);
    return result.recordset[0];
  }
}

class AcademicNoteRepository {
  async getByStudent(studentId) {
    const pool = await getPool();
    const result = await pool.request().input('studentId', sql.Int, studentId)
      .query('SELECT * FROM AcademicNotes WHERE StudentID = @studentId ORDER BY Year DESC, Term');
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId)
      .input('term', sql.NVarChar, data.term).input('year', sql.Int, data.year)
      .input('notes', sql.NVarChar, data.notes).input('recordedBy', sql.Int, data.recordedBy || null)
      .query(`INSERT INTO AcademicNotes (SchoolID,StudentID,Term,Year,Notes,RecordedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@term,@year,@notes,@recordedBy)`);
    return result.recordset[0];
  }
}

class DocumentRepository {
  async getStudentDocuments(studentId) {
    const pool = await getPool();
    const result = await pool.request().input('studentId', sql.Int, studentId)
      .query('SELECT DocumentID, SchoolID, StudentID, DocumentType, FileName, UploadedBy, CreatedDate FROM StudentDocuments WHERE StudentID = @studentId ORDER BY CreatedDate DESC');
    return result.recordset;
  }
  async createStudentDocument(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId)
      .input('documentType', sql.NVarChar, data.documentType).input('fileName', sql.NVarChar, data.fileName)
      .input('fileData', sql.NVarChar(sql.MAX), data.fileData || null).input('uploadedBy', sql.Int, data.uploadedBy || null)
      .query(`INSERT INTO StudentDocuments (SchoolID,StudentID,DocumentType,FileName,FileData,UploadedBy)
              OUTPUT INSERTED.DocumentID, INSERTED.SchoolID, INSERTED.StudentID, INSERTED.DocumentType, INSERTED.FileName, INSERTED.CreatedDate
              VALUES (@schoolId,@studentId,@documentType,@fileName,@fileData,@uploadedBy)`);
    return result.recordset[0];
  }
  async getStaffDocuments(employeeId) {
    const pool = await getPool();
    const result = await pool.request().input('employeeId', sql.Int, employeeId)
      .query('SELECT DocumentID, SchoolID, EmployeeID, DocumentType, FileName, UploadedBy, CreatedDate FROM StaffDocuments WHERE EmployeeID = @employeeId ORDER BY CreatedDate DESC');
    return result.recordset;
  }
  async createStaffDocument(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('employeeId', sql.Int, data.employeeId)
      .input('documentType', sql.NVarChar, data.documentType).input('fileName', sql.NVarChar, data.fileName)
      .input('fileData', sql.NVarChar(sql.MAX), data.fileData || null).input('uploadedBy', sql.Int, data.uploadedBy || null)
      .query(`INSERT INTO StaffDocuments (SchoolID,EmployeeID,DocumentType,FileName,FileData,UploadedBy)
              OUTPUT INSERTED.DocumentID, INSERTED.SchoolID, INSERTED.EmployeeID, INSERTED.DocumentType, INSERTED.FileName, INSERTED.CreatedDate
              VALUES (@schoolId,@employeeId,@documentType,@fileName,@fileData,@uploadedBy)`);
    return result.recordset[0];
  }
}

class CreditNoteRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT cn.*, i.InvoiceNumber FROM CreditNotes cn
              INNER JOIN Invoices i ON cn.InvoiceID = i.InvoiceID WHERE cn.SchoolID = @schoolId ORDER BY cn.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('invoiceId', sql.Int, data.invoiceId)
      .input('amount', sql.Decimal(10,2), data.amount).input('reason', sql.NVarChar, data.reason)
      .input('createdBy', sql.Int, data.createdBy || null)
      .query(`INSERT INTO CreditNotes (SchoolID,InvoiceID,Amount,Reason,CreatedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@invoiceId,@amount,@reason,@createdBy)`);
    return result.recordset[0];
  }
}

class DiscountRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT d.*, s.FirstName, s.LastName, bc.CategoryName FROM Discounts d
              INNER JOIN Students s ON d.StudentID = s.StudentID
              LEFT JOIN BillingCategories bc ON d.BillingCategoryID = bc.BillingCategoryID
              WHERE d.SchoolID = @schoolId ORDER BY s.LastName`);
    return result.recordset;
  }
  async getActiveByStudent(studentId) {
    const pool = await getPool();
    const result = await pool.request().input('studentId', sql.Int, studentId)
      .query('SELECT * FROM Discounts WHERE StudentID = @studentId AND IsActive = 1');
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId)
      .input('billingCategoryId', sql.Int, data.billingCategoryId || null)
      .input('discountType', sql.NVarChar, data.discountType)
      .input('fixedAmount', sql.Decimal(10,2), data.fixedAmount || null)
      .input('percentage', sql.Decimal(5,2), data.percentage || null)
      .input('description', sql.NVarChar, data.description || null)
      .query(`INSERT INTO Discounts (SchoolID,StudentID,BillingCategoryID,DiscountType,FixedAmount,Percentage,Description)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@billingCategoryId,@discountType,@fixedAmount,@percentage,@description)`);
    return result.recordset[0];
  }
}

class PromiseToPayRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT p.*, f.FamilyName FROM PromiseToPay p
              INNER JOIN Families f ON p.FamilyID = f.FamilyID WHERE p.SchoolID = @schoolId ORDER BY p.PromisedDate`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('familyId', sql.Int, data.familyId)
      .input('promisedDate', sql.Date, data.promisedDate).input('promisedAmount', sql.Decimal(10,2), data.promisedAmount)
      .input('notes', sql.NVarChar, data.notes || null).input('recordedBy', sql.Int, data.recordedBy || null)
      .query(`INSERT INTO PromiseToPay (SchoolID,FamilyID,PromisedDate,PromisedAmount,Notes,RecordedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@promisedDate,@promisedAmount,@notes,@recordedBy)`);
    return result.recordset[0];
  }
  async updateStatus(id, status) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('status', sql.NVarChar, status)
      .query('UPDATE PromiseToPay SET Status=@status OUTPUT INSERTED.* WHERE PromiseID=@id');
    return result.recordset[0];
  }
}

class InvoiceTemplateRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM InvoiceTemplates WHERE SchoolID = @schoolId ORDER BY IsDefault DESC, TemplateName');
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('templateName', sql.NVarChar, data.templateName)
      .input('logoUrl', sql.NVarChar(sql.MAX), data.logoUrl || null)
      .input('headerText', sql.NVarChar, data.headerText || null).input('footerText', sql.NVarChar, data.footerText || null)
      .input('contactDetails', sql.NVarChar, data.contactDetails || null)
      .input('bankingDetails', sql.NVarChar, data.bankingDetails || null)
      .input('notes', sql.NVarChar, data.notes || null).input('isDefault', sql.Bit, data.isDefault || false)
      .query(`INSERT INTO InvoiceTemplates (SchoolID,TemplateName,LogoUrl,HeaderText,FooterText,ContactDetails,BankingDetails,Notes,IsDefault)
              OUTPUT INSERTED.* VALUES (@schoolId,@templateName,@logoUrl,@headerText,@footerText,@contactDetails,@bankingDetails,@notes,@isDefault)`);
    return result.recordset[0];
  }
  async update(id, data) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id)
      .input('templateName', sql.NVarChar, data.templateName)
      .input('logoUrl', sql.NVarChar(sql.MAX), data.logoUrl || null)
      .input('headerText', sql.NVarChar, data.headerText || null).input('footerText', sql.NVarChar, data.footerText || null)
      .input('contactDetails', sql.NVarChar, data.contactDetails || null)
      .input('bankingDetails', sql.NVarChar, data.bankingDetails || null)
      .input('notes', sql.NVarChar, data.notes || null).input('isDefault', sql.Bit, data.isDefault || false)
      .query(`UPDATE InvoiceTemplates SET TemplateName=@templateName,LogoUrl=@logoUrl,HeaderText=@headerText,
              FooterText=@footerText,ContactDetails=@contactDetails,BankingDetails=@bankingDetails,
              Notes=@notes,IsDefault=@isDefault,UpdatedDate=GETDATE() OUTPUT INSERTED.* WHERE TemplateID=@id`);
    return result.recordset[0];
  }
}

class CommunicationHistoryRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM CommunicationHistory WHERE SchoolID = @schoolId ORDER BY SentDate DESC');
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('familyId', sql.Int, data.familyId || null)
      .input('parentUserId', sql.Int, data.parentUserId || null)
      .input('communicationType', sql.NVarChar, data.communicationType)
      .input('subject', sql.NVarChar, data.subject || null)
      .input('status', sql.NVarChar, data.status || 'Sent')
      .input('deliveryStatus', sql.NVarChar, data.deliveryStatus || null)
      .query(`INSERT INTO CommunicationHistory (SchoolID,FamilyID,ParentUserID,CommunicationType,Subject,Status,DeliveryStatus)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@parentUserId,@communicationType,@subject,@status,@deliveryStatus)`);
    return result.recordset[0];
  }
}

class ParentCommunicationLogRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT pcl.*, f.FamilyName FROM ParentCommunicationLogs pcl
              INNER JOIN Families f ON pcl.FamilyID = f.FamilyID WHERE pcl.SchoolID = @schoolId ORDER BY pcl.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('familyId', sql.Int, data.familyId)
      .input('communicationType', sql.NVarChar, data.communicationType)
      .input('subject', sql.NVarChar, data.subject || null).input('notes', sql.NVarChar, data.notes || null)
      .input('recordedBy', sql.Int, data.recordedBy || null)
      .query(`INSERT INTO ParentCommunicationLogs (SchoolID,FamilyID,CommunicationType,Subject,Notes,RecordedBy)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@communicationType,@subject,@notes,@recordedBy)`);
    return result.recordset[0];
  }
}

class ParentDetailChangeRepository {
  async getPendingBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query(`SELECT pdc.*, f.FamilyName FROM ParentDetailChanges pdc
              INNER JOIN Families f ON pdc.FamilyID = f.FamilyID
              WHERE pdc.SchoolID = @schoolId AND pdc.Status = 'Pending' ORDER BY pdc.CreatedDate DESC`);
    return result.recordset;
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('familyId', sql.Int, data.familyId)
      .input('requestedBy', sql.Int, data.requestedBy).input('fieldName', sql.NVarChar, data.fieldName)
      .input('oldValue', sql.NVarChar, data.oldValue || null).input('newValue', sql.NVarChar, data.newValue || null)
      .query(`INSERT INTO ParentDetailChanges (SchoolID,FamilyID,RequestedBy,FieldName,OldValue,NewValue)
              OUTPUT INSERTED.* VALUES (@schoolId,@familyId,@requestedBy,@fieldName,@oldValue,@newValue)`);
    return result.recordset[0];
  }
  async review(id, status, reviewedBy) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id)
      .input('status', sql.NVarChar, status).input('reviewedBy', sql.Int, reviewedBy)
      .query(`UPDATE ParentDetailChanges SET Status=@status, ReviewedBy=@reviewedBy, ReviewedDate=GETDATE()
              OUTPUT INSERTED.* WHERE ChangeID=@id`);
    return result.recordset[0];
  }
}

module.exports = {
  BehaviourLogRepository, AcademicNoteRepository, DocumentRepository,
  CreditNoteRepository, DiscountRepository, PromiseToPayRepository,
  InvoiceTemplateRepository, CommunicationHistoryRepository,
  ParentCommunicationLogRepository, ParentDetailChangeRepository
};
