import { Pool } from 'pg';
import { env } from '../config/env.js';

export const databasePool = new Pool({ 
  connectionString: env.DATABASE_URL, 
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Keep backward compatibility
export const db = databasePool;

export async function setTenantContext(client: any, schoolId: string) {
  if (!schoolId || typeof schoolId !== 'string') {
    throw new Error('Invalid school ID provided');
  }
  try {
    await client.query('SELECT app.set_school($1::uuid)', [schoolId]);
  } catch (error) {
    console.error('Tenant context setup failed:', { schoolId: schoolId.substring(0, 8), error: error?.message });
    throw new Error('Database tenant setup failed');
  }
}

// Keep backward compatibility
export const setTenant = setTenantContext;