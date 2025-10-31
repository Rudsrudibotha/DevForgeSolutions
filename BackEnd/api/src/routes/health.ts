import { Router } from 'express';

const healthRouter = Router();

healthRouter.get('/healthz', (_req, res) => {
  res.json({ 
    ok: true, 
    service: 'devforge-api', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default healthRouter;