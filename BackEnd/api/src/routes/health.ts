import { Router } from 'express';

const r = Router();

r.get('/healthz', (_req, res) => res.json({ ok: true, service: 'api', time: new Date().toISOString() }));

export default r;