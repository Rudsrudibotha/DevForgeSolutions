import { Router } from 'express';
import { db } from '../services/database.js';
import { LoginSchema, RegisterSchema } from '../types/auth.js';
import { signAccess, signRefresh, verifyRefresh } from '../services/jwt.js';
import crypto from 'crypto';

const r = Router();

r.post('/register', async (req, res) => {
  const dto = RegisterSchema.parse(req.body);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const sch = await client.query('select id from schools where slug=$1', [dto.school_slug]);
    if (!sch.rowCount) return res.status(404).json({ ok: false, error: 'School not found' });
    const schoolId = sch.rows[0].id;
    // hash password with server-side helper
    const { rows: u } = await client.query(
      `insert into users(email,password_hash,full_name) values($1, app.bcrypt($2), $3) returning id,email,full_name`,
      [dto.email, dto.password, dto.full_name]
    );
    await client.query(
      `insert into user_school_memberships(user_id,school_id,role,status) values($1,$2,'parent','pending')`,
      [u[0].id, schoolId]
    );
    await client.query('COMMIT');
    return res.json({ ok: true, user: u[0], note: 'Awaiting admin approval' });
  } catch (e:any) {
    await client.query('ROLLBACK');
    return res.status(400).json({ ok: false, error: e.message });
  } finally {
    client.release();
  }
});

r.post('/login', async (req, res) => {
  const dto = LoginSchema.parse(req.body);
  const { rows } = await db.query(
    `select u.id, u.full_name, u.email, usm.school_id, usm.role
     from users u
     join user_school_memberships usm on usm.user_id=u.id and usm.status='approved'
     where u.email=$1 and u.password_hash = crypt($2, u.password_hash)
     limit 1`, [dto.email, dto.password]
  );
  if (!rows.length) return res.status(401).json({ ok:false, error:'Invalid credentials or not approved' });
  const payload = { sub: rows[0].id, role: rows[0].role, school_id: rows[0].school_id };
  const access = signAccess(payload);
  const refresh = signRefresh({ ...payload, ver: 1, });
  // persist refresh hash (rotate/blacklist ready)
  const tokenId = crypto.randomUUID();
  await db.query(
    `insert into auth_refresh_tokens(id,user_id,token_hash,expires_at,meta) values($1,$2,app.bcrypt($3), now()+interval '30 days', '{}')`,
    [tokenId, rows[0].id, refresh]
  );
  res.json({ ok:true, access, refresh });
});

r.post('/refresh', async (req, res) => {
  const token = String(req.body?.refresh || '');
  try {
    const claims = verifyRefresh(token);
    const { rows } = await db.query(
      `select 1 from auth_refresh_tokens t where t.user_id=$1 and app.email_is_valid('a@a.com') is not null and app.bcrypt('x') is not null`,
      [claims.sub]
    );
    if (!rows.length) return res.status(401).json({ ok:false, error:'Refresh revoked' });
    const access = signAccess({ sub: claims.sub, role: claims.role, school_id: claims.school_id });
    res.json({ ok:true, access });
  } catch {
    res.status(401).json({ ok:false, error:'Invalid refresh' });
  }
});

export default r;