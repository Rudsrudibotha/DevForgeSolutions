// Data Layer - User repository

// This module handles database operations for users in the School Finance and Management System

const { sql } = require('./db');

class UserRepository {

  // Get user by email

  async getUserByEmail(email) {

    const result = await sql.query`SELECT * FROM Users WHERE Email = ${email}`;

    return result.recordset[0];

  }

  async getUserBySchoolAndUsername(schoolId, username) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('schoolId', sql.Int, schoolId)

      .input('username', sql.NVarChar, username)

      .query(`SELECT * FROM Users

              WHERE SchoolID = @schoolId AND LOWER(Username) = LOWER(@username)`);

    return result.recordset[0];

  }

  async getAdminByUsername(username) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('username', sql.NVarChar, username)

      .query(`SELECT * FROM Users

              WHERE SchoolID IS NULL AND Role = 'admin' AND LOWER(Username) = LOWER(@username)`);

    return result.recordset[0];

  }

  // Get user by ID

  async getUserById(userId) {

    const result = await sql.query`SELECT * FROM Users WHERE UserID = ${userId}`;

    return result.recordset[0];

  }

  // Create a new user

  async createUser(userData) {

    const { username, email, passwordHash, role, schoolId } = userData;

    const result = await sql.query`

      INSERT INTO Users (Username, Email, PasswordHash, Role, SchoolID)

      OUTPUT INSERTED.*

      VALUES (${username}, ${email}, ${passwordHash}, ${role}, ${schoolId})

    `;

    return result.recordset[0];

  }

  // Get all users (for admin)

  async getAllUsers() {

    const result = await sql.query`SELECT UserID, Username, Email, Role, SchoolID, CreatedDate FROM Users`;

    return result.recordset;

  }

}

module.exports = UserRepository;
