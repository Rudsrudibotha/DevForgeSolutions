// Data Layer - Database connection and configuration
// Azure deployments should provide DATABASE_URL through App Service settings or Key Vault references.

const sql = require('mssql');

function getConnectionConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return process.env.DATABASE_URL;
}

async function connectDB() {
  try {
    await sql.connect(getConnectionConfig());
    console.log('Connected to Azure SQL Database');
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}

module.exports = { connectDB, sql };
