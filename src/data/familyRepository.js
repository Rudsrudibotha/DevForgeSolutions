// Data Layer - Family repository

const { getPool, sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

class FamilyRepository {
  async getFamiliesBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM Families WHERE SchoolID = @schoolId ORDER BY FamilyName');
    return result.recordset;
  }

  async getAllFamilies() {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Families ORDER BY FamilyName');
    return result.recordset;
  }

  async getFamilyById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Families WHERE FamilyID = @id');
    return result.recordset[0];
  }

  async createFamily(familyData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, familyData.schoolId)
      .input('familyName', sql.NVarChar, familyData.familyName)
      .input('primaryParentName', sql.NVarChar, familyData.primaryParentName)
      .input('primaryParentIdNumber', sql.NVarChar, optionalString(familyData.primaryParentIdNumber))
      .input('primaryParentPhone', sql.NVarChar, optionalString(familyData.primaryParentPhone))
      .input('primaryParentEmail', sql.NVarChar, optionalString(familyData.primaryParentEmail))
      .input('primaryParentOccupation', sql.NVarChar, optionalString(familyData.primaryParentOccupation))
      .input('primaryParentWorkPhone', sql.NVarChar, optionalString(familyData.primaryParentWorkPhone))
      .input('secondaryParentName', sql.NVarChar, optionalString(familyData.secondaryParentName))
      .input('secondaryParentIdNumber', sql.NVarChar, optionalString(familyData.secondaryParentIdNumber))
      .input('secondaryParentPhone', sql.NVarChar, optionalString(familyData.secondaryParentPhone))
      .input('secondaryParentEmail', sql.NVarChar, optionalString(familyData.secondaryParentEmail))
      .input('secondaryParentOccupation', sql.NVarChar, optionalString(familyData.secondaryParentOccupation))
      .input('secondaryParentWorkPhone', sql.NVarChar, optionalString(familyData.secondaryParentWorkPhone))
      .input('homeAddress', sql.NVarChar, optionalString(familyData.homeAddress))
      .input('emergencyContactName', sql.NVarChar, optionalString(familyData.emergencyContactName))
      .input('emergencyContactPhone', sql.NVarChar, optionalString(familyData.emergencyContactPhone))
      .input('familyDoctor', sql.NVarChar, optionalString(familyData.familyDoctor))
      .input('medicalAidName', sql.NVarChar, optionalString(familyData.medicalAidName))
      .input('medicalAidNumber', sql.NVarChar, optionalString(familyData.medicalAidNumber))
      .query(`INSERT INTO Families (
                SchoolID, FamilyName, PrimaryParentName, PrimaryParentIdNumber, PrimaryParentPhone,
                PrimaryParentEmail, PrimaryParentOccupation, PrimaryParentWorkPhone,
                SecondaryParentName, SecondaryParentIdNumber, SecondaryParentPhone, SecondaryParentEmail,
                SecondaryParentOccupation, SecondaryParentWorkPhone, HomeAddress, EmergencyContactName,
                EmergencyContactPhone, FamilyDoctor, MedicalAidName, MedicalAidNumber
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @familyName, @primaryParentName, @primaryParentIdNumber, @primaryParentPhone,
                @primaryParentEmail, @primaryParentOccupation, @primaryParentWorkPhone,
                @secondaryParentName, @secondaryParentIdNumber, @secondaryParentPhone, @secondaryParentEmail,
                @secondaryParentOccupation, @secondaryParentWorkPhone, @homeAddress, @emergencyContactName,
                @emergencyContactPhone, @familyDoctor, @medicalAidName, @medicalAidNumber
              )`);
    return result.recordset[0];
  }

  async updateFamily(id, familyData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('familyName', sql.NVarChar, familyData.familyName)
      .input('primaryParentName', sql.NVarChar, familyData.primaryParentName)
      .input('primaryParentIdNumber', sql.NVarChar, optionalString(familyData.primaryParentIdNumber))
      .input('primaryParentPhone', sql.NVarChar, optionalString(familyData.primaryParentPhone))
      .input('primaryParentEmail', sql.NVarChar, optionalString(familyData.primaryParentEmail))
      .input('primaryParentOccupation', sql.NVarChar, optionalString(familyData.primaryParentOccupation))
      .input('primaryParentWorkPhone', sql.NVarChar, optionalString(familyData.primaryParentWorkPhone))
      .input('secondaryParentName', sql.NVarChar, optionalString(familyData.secondaryParentName))
      .input('secondaryParentIdNumber', sql.NVarChar, optionalString(familyData.secondaryParentIdNumber))
      .input('secondaryParentPhone', sql.NVarChar, optionalString(familyData.secondaryParentPhone))
      .input('secondaryParentEmail', sql.NVarChar, optionalString(familyData.secondaryParentEmail))
      .input('secondaryParentOccupation', sql.NVarChar, optionalString(familyData.secondaryParentOccupation))
      .input('secondaryParentWorkPhone', sql.NVarChar, optionalString(familyData.secondaryParentWorkPhone))
      .input('homeAddress', sql.NVarChar, optionalString(familyData.homeAddress))
      .input('emergencyContactName', sql.NVarChar, optionalString(familyData.emergencyContactName))
      .input('emergencyContactPhone', sql.NVarChar, optionalString(familyData.emergencyContactPhone))
      .input('familyDoctor', sql.NVarChar, optionalString(familyData.familyDoctor))
      .input('medicalAidName', sql.NVarChar, optionalString(familyData.medicalAidName))
      .input('medicalAidNumber', sql.NVarChar, optionalString(familyData.medicalAidNumber))
      .query(`UPDATE Families SET
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
                MedicalAidNumber = @medicalAidNumber,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE FamilyID = @id`);
    return result.recordset[0];
  }
}

module.exports = FamilyRepository;
