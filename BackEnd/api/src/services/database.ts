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
  try {
    if (!schoolId || typeof schoolId !== 'string') {
      throw new Error('Invalid school ID provided');
    }
    await client.query('SELECT app.set_school($1::uuid)', [schoolId]);
  } catch (error: any) {
    console.error('Failed to set tenant context:', error.message);
    throw error;
  }
}

// Keep backward compatibility
export const setTenant = setTenantContext;