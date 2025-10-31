import { Router } from 'express';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ 
    ok: true, 
    service: 'devforge-api', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;