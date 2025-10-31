import { Pool } from 'pg';
import { env } from '../config/env.js';

export const db = new Pool({ connectionString: env.DATABASE_URL, max: 10 });

export async function setTenant(client: any, schoolId: string) {
  await client.query('SELECT app.set_school($1::uuid)', [schoolId]);
}