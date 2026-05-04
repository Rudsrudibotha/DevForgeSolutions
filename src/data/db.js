// Data Layer - Database connection and configuration
// Azure deployments should provide DATABASE_URL through App Service settings or Key Vault references.

const sql = require('mssql');

let pool = null;

const dbState = {
  connected: false,
  lastError: null
};

function getConnectionConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return process.env.DATABASE_URL;
}

async function connectDB() {
  try {
    pool = await sql.connect(getConnectionConfig());
    dbState.connected = true;
    dbState.lastError = null;
    console.log('Connected to Azure SQL Database');
  } catch (err) {
    dbState.connected = false;
    dbState.lastError = err.message;
    console.error('Database connection failed:', err);
    throw err;
  }
}

async function getPool() {
  if (pool) {
    return pool;
  }

  return await sql.connect(getConnectionConfig());
}

function getDbState() {
  return { ...dbState };
}

module.exports = { connectDB, getPool, getDbState, sql };
