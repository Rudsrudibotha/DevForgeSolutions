// Data Layer - Database connection and configuration
// Azure deployments should provide DATABASE_URL through App Service settings or Key Vault references.

const sql = require('mssql');

let pool = null;

const dbState = {
  connected: false,
  lastError: null
};

function positiveIntEnv(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}

// Parse a SQL Server connection string. mssql accepts the URL directly,
// but we want to override pool + timeout defaults with a config object so
// we can tune them per environment.
function getConnectionConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  // Default pool: 10 connections, 30s acquire, 30s idle, 60s query timeout.
  // Tunable via DB_POOL_MAX, DB_QUERY_TIMEOUT_MS, DB_CONNECT_TIMEOUT_MS.
  const config = {
    pool: {
      max: positiveIntEnv('DB_POOL_MAX', 10),
      min: 0,
      idleTimeoutMillis: positiveIntEnv('DB_POOL_IDLE_MS', 30000)
    },
    connectionTimeout: positiveIntEnv('DB_CONNECT_TIMEOUT_MS', 15000),
    requestTimeout: positiveIntEnv('DB_QUERY_TIMEOUT_MS', 60000),
    // Trust the server certificate when connecting to Azure SQL. Most
    // production Azure SQL endpoints are signed by a public CA so this is
    // usually fine; if a custom CA is used, set DB_TRUST_SERVER_CERT=false.
    options: {
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
      encrypt: process.env.DB_ENCRYPT !== 'false',
      enableArithAbort: true
    }
  };

  // If DATABASE_URL is a sqlserver:// URL, parse it. Otherwise treat the
  // whole thing as a connection string. mssql accepts both the URL form
  // and the legacy "Server=...;Database=...;User Id=...;Password=...;" form
  // directly, so we only need to build a config object when we want to
  // override pool + timeout defaults — which we always do, so we only
  // return a config object (never the raw string).
  const url = String(process.env.DATABASE_URL);
  if (/^sqlserver:\/\//i.test(url)) {
    const parsed = new URL(url);
    config.server = parsed.hostname;
    if (parsed.port) config.port = parseInt(parsed.port, 10);
    const db = (parsed.pathname || '').replace(/^\//, '');
    if (db) config.database = decodeURIComponent(db);
    const user = parsed.searchParams.get('user') || parsed.username;
    const pwd = parsed.searchParams.get('password') || parsed.password;
    if (user) config.user = decodeURIComponent(user);
    if (pwd) config.password = decodeURIComponent(pwd);
  } else {
    // Legacy key=value form. Pass it through as a connection string and
    // let mssql parse it. The pool/timeout overrides configured above
    // still take effect because mssql merges them with the parsed string.
    config.connectionString = url;
  }

  return config;
}

async function connectDB() {
  try {
    const poolInstance = await getPool();
    if (poolInstance.connected) {
      console.log('Connected to Azure SQL Database');
    }
  } catch (err) {
    dbState.connected = false;
    dbState.lastError = err.message;
    console.error('Database connection failed:', err);
    throw err;
  }
}

async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }

  if (pool && pool.connecting) {
    await pool.connect();
    if (pool.connected) {
      return pool;
    }
  }

  if (pool) {
    try {
      await pool.close();
    } catch (closeError) {
      console.warn('Closing stale database connection pool failed:', closeError?.message || closeError);
    }
    pool = null;
  }

  try {
    pool = await sql.connect(getConnectionConfig());
    dbState.connected = true;
    dbState.lastError = null;
    return pool;
  } catch (err) {
    dbState.connected = false;
    dbState.lastError = err.message;
    pool = null;
    throw err;
  }
}

function getDbState() {
  return { ...dbState };
}

module.exports = { connectDB, getPool, getDbState, sql, positiveIntEnv };
