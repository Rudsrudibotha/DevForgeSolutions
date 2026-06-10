'use strict';

// Family portal service. Scoped to school via req.schoolDb.

const { sql } = require('../data/db');

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class FamilyPortalService {
  constructor() {}

  // List with server-side search + pagination
  async list({ schoolDb, search, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('familyPortalService.list requires a scoped schoolId');

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['f.SchoolID = @schoolId', 'f.IsDeleted = 0'];
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(f.FamilyName LIKE @search OR f.PrimaryParentName LIKE @search OR f.PrimaryParentEmail LIKE @search OR f.HomeAddress LIKE @search)');
    }

    const text = `
      SELECT
        f.FamilyID, f.FamilyName,
        f.PrimaryParentName, f.PrimaryParentPhone, f.PrimaryParentEmail,
        f.HomeAddress, f.CreatedDate,
        (SELECT COUNT(*) FROM Students s WHERE s.FamilyID = f.FamilyID AND s.IsDeleted = 0) AS StudentCount,
        (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
           FROM Invoices i
           INNER JOIN Students s ON s.StudentID = i.StudentID
           WHERE s.FamilyID = f.FamilyID
             AND i.Status NOT IN ('Paid', 'Cancelled')) AS OutstandingAmount
      FROM Families f
      WHERE ${where.join(' AND ')}
      ORDER BY f.FamilyName
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    const countWhere = ['f.SchoolID = @schoolId', 'f.IsDeleted = 0'];
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(f.FamilyName LIKE @search OR f.PrimaryParentName LIKE @search OR f.PrimaryParentEmail LIKE @search OR f.HomeAddress LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Families f WHERE ${countWhere.join(' AND ')}`;
    schoolDb.guardTableScope(countText);
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      filters: { search: search || '' }
    };
  }

  async getById({ schoolDb, familyId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(familyId) || familyId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('familyPortalService.getById requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('familyId', sql.Int, familyId);
    const text = `
      SELECT *
      FROM Families
      WHERE SchoolID = @schoolId AND FamilyID = @familyId AND IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Children attached to this family
  async getChildren({ schoolDb, familyId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(familyId) || familyId <= 0) return [];
    const sid = schoolDb.schoolId;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('familyId', sql.Int, familyId);
    const text = `
      SELECT s.StudentID, s.FirstName, s.LastName, s.DateOfBirth, s.IsActive, s.EnrolledDate,
             c.ClassID, c.ClassName, c.Grade
      FROM Students s
      LEFT JOIN Classes c ON c.ClassID = s.ClassID
      WHERE s.SchoolID = @schoolId AND s.FamilyID = @familyId AND s.IsDeleted = 0
      ORDER BY s.LastName, s.FirstName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  async create({ schoolDb, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('familyPortalService.create requires a scoped schoolId');
    if (!data.familyName || !String(data.familyName).trim()) throw new Error('Family name is required');
    if (!data.primaryParentName || !String(data.primaryParentName).trim()) throw new Error('Primary parent name is required');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('familyName', sql.NVarChar, String(data.familyName).trim());
    request.input('primaryParentName', sql.NVarChar, String(data.primaryParentName).trim());
    request.input('primaryParentIdNumber', sql.NVarChar, data.primaryParentIdNumber || null);
    request.input('primaryParentPhone', sql.NVarChar, data.primaryParentPhone || null);
    request.input('primaryParentEmail', sql.NVarChar, data.primaryParentEmail || null);
    request.input('primaryParentOccupation', sql.NVarChar, data.primaryParentOccupation || null);
    request.input('primaryParentWorkPhone', sql.NVarChar, data.primaryParentWorkPhone || null);
    request.input('secondaryParentName', sql.NVarChar, data.secondaryParentName || null);
    request.input('secondaryParentIdNumber', sql.NVarChar, data.secondaryParentIdNumber || null);
    request.input('secondaryParentPhone', sql.NVarChar, data.secondaryParentPhone || null);
    request.input('secondaryParentEmail', sql.NVarChar, data.secondaryParentEmail || null);
    request.input('secondaryParentOccupation', sql.NVarChar, data.secondaryParentOccupation || null);
    request.input('secondaryParentWorkPhone', sql.NVarChar, data.secondaryParentWorkPhone || null);
    request.input('homeAddress', sql.NVarChar, data.homeAddress || null);
    request.input('emergencyContactName', sql.NVarChar, data.emergencyContactName || null);
    request.input('emergencyContactPhone', sql.NVarChar, data.emergencyContactPhone || null);
    request.input('familyDoctor', sql.NVarChar, data.familyDoctor || null);
    request.input('medicalAidName', sql.NVarChar, data.medicalAidName || null);
    request.input('medicalAidNumber', sql.NVarChar, data.medicalAidNumber || null);

    const text = `
      INSERT INTO Families
        (SchoolID, FamilyName, PrimaryParentName, PrimaryParentIdNumber, PrimaryParentPhone, PrimaryParentEmail,
         PrimaryParentOccupation, PrimaryParentWorkPhone,
         SecondaryParentName, SecondaryParentIdNumber, SecondaryParentPhone, SecondaryParentEmail,
         SecondaryParentOccupation, SecondaryParentWorkPhone,
         HomeAddress, EmergencyContactName, EmergencyContactPhone, FamilyDoctor, MedicalAidName, MedicalAidNumber)
      OUTPUT INSERTED.FamilyID
      VALUES
        (@schoolId, @familyName, @primaryParentName, @primaryParentIdNumber, @primaryParentPhone, @primaryParentEmail,
         @primaryParentOccupation, @primaryParentWorkPhone,
         @secondaryParentName, @secondaryParentIdNumber, @secondaryParentPhone, @secondaryParentEmail,
         @secondaryParentOccupation, @secondaryParentWorkPhone,
         @homeAddress, @emergencyContactName, @emergencyContactPhone, @familyDoctor, @medicalAidName, @medicalAidNumber)
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] ? Number(result.recordset[0].FamilyID) : null;
  }

  async update({ schoolDb, familyId, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('familyPortalService.update requires a scoped schoolId');
    if (!Number.isInteger(familyId) || familyId <= 0) return false;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('familyId', sql.Int, familyId);
    request.input('familyName', sql.NVarChar, String(data.familyName || '').trim());
    request.input('primaryParentName', sql.NVarChar, String(data.primaryParentName || '').trim());
    request.input('primaryParentIdNumber', sql.NVarChar, data.primaryParentIdNumber || null);
    request.input('primaryParentPhone', sql.NVarChar, data.primaryParentPhone || null);
    request.input('primaryParentEmail', sql.NVarChar, data.primaryParentEmail || null);
    request.input('primaryParentOccupation', sql.NVarChar, data.primaryParentOccupation || null);
    request.input('primaryParentWorkPhone', sql.NVarChar, data.primaryParentWorkPhone || null);
    request.input('secondaryParentName', sql.NVarChar, data.secondaryParentName || null);
    request.input('secondaryParentIdNumber', sql.NVarChar, data.secondaryParentIdNumber || null);
    request.input('secondaryParentPhone', sql.NVarChar, data.secondaryParentPhone || null);
    request.input('secondaryParentEmail', sql.NVarChar, data.secondaryParentEmail || null);
    request.input('secondaryParentOccupation', sql.NVarChar, data.secondaryParentOccupation || null);
    request.input('secondaryParentWorkPhone', sql.NVarChar, data.secondaryParentWorkPhone || null);
    request.input('homeAddress', sql.NVarChar, data.homeAddress || null);
    request.input('emergencyContactName', sql.NVarChar, data.emergencyContactName || null);
    request.input('emergencyContactPhone', sql.NVarChar, data.emergencyContactPhone || null);
    request.input('familyDoctor', sql.NVarChar, data.familyDoctor || null);
    request.input('medicalAidName', sql.NVarChar, data.medicalAidName || null);
    request.input('medicalAidNumber', sql.NVarChar, data.medicalAidNumber || null);

    const text = `
      UPDATE Families SET
        FamilyName = @familyName,
        PrimaryParentName = @primaryParentName,
        PrimaryParentIdNumber = @primaryParentIdNumber,
        PrimaryParentPhone = @primaryParentPhone,
        PrimaryParentEmail = @primaryParentEmail,
        PrimaryParentOccupation = @primaryParentOccupation,
        PrimaryParentWorkPhone = @primaryParentWorkPhone,
        SecondaryParentName = @secondaryParentName,
        SecondaryParentIdNumber = @secondaryParentIdNumber,
        SecondaryParentPhone = @secondaryParentPhone,
        SecondaryParentEmail = @secondaryParentEmail,
        SecondaryParentOccupation = @secondaryParentOccupation,
        SecondaryParentWorkPhone = @secondaryParentWorkPhone,
        HomeAddress = @homeAddress,
        EmergencyContactName = @emergencyContactName,
        EmergencyContactPhone = @emergencyContactPhone,
        FamilyDoctor = @familyDoctor,
        MedicalAidName = @medicalAidName,
        MedicalAidNumber = @medicalAidNumber
      WHERE SchoolID = @schoolId AND FamilyID = @familyId AND IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }

  async softDelete({ schoolDb, familyId, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(familyId) || familyId <= 0) return false;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('familyPortalService.softDelete requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('familyId', sql.Int, familyId);
    const text = `
      UPDATE Families
      SET IsDeleted = 1
      WHERE SchoolID = @schoolId AND FamilyID = @familyId AND IsDeleted = 0
    `;
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }
}

module.exports = FamilyPortalService;
