// Data Layer - User repository

// This module handles database operations for users in the School Finance and Management System

const { sql } = require('./db');

class UserRepository {

  // Get user by email

  async getUserByEmail(email) {

    const result = await sql.query`SELECT * FROM Users WHERE Email = ${email}`;

    return result.recordset[0];

  }

  // Get user by ID

  async getUserById(userId) {

    const result = await sql.query`SELECT * FROM Users WHERE UserID = ${userId}`;

    return result.recordset[0];

  }

  // Create a new user

  async createUser(userData) {

    const { email, passwordHash, role, schoolId } = userData;

    const result = await sql.query`

      INSERT INTO Users (Email, PasswordHash, Role, SchoolID)

      OUTPUT INSERTED.*

      VALUES (${email}, ${passwordHash}, ${role}, ${schoolId})

    `;

    return result.recordset[0];

  }

  // Get all users (for admin)

  async getAllUsers() {

    const result = await sql.query`SELECT UserID, Email, Role, SchoolID, CreatedDate FROM Users`;

    return result.recordset;

  }

}

module.exports = UserRepository;