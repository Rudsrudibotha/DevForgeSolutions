import express from 'express';
import { createServer } from 'http';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { securityMiddleware, rateLimiter, requireAuth, setTenantFromJwt } from './middleware/index.js';
import authRoutes from './routes/auth.js';
import health from './routes/health.js';
import { env } from './config/env.js';
import swaggerUi from 'swagger-ui-express';
import { initRealtime } from './realtime.js';
import { initSentry } from './services/sentry.js';

initSentry(process.env.SENTRY_DSN);

const app = express();
const server = createServer(app);
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const io = initRealtime(server);

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '2mb' }));
app.use(securityMiddleware);
app.use(rateLimiter);

// URL validation middleware
const validateUrl = (req: any, res: any, next: any) => {
  const url = req.body?.url || req.query?.url;
  if (url) {
    try {
      const parsed = new URL(url);
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
        return res.status(400).json({ ok: false, error: 'Invalid URL' });
      }
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid URL format' });
    }
  }
  next();
};

app.use('/api/health', health);
app.use('/api/auth', authRoutes);

// Example protected route
app.get('/api/me', requireAuth, setTenantFromJwt, (req, res) => {
  try {
    res.json({ ok: true, user: (req as any).user });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// (Optional) Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup({ openapi: '3.0.0', info: { title: 'DevForge API', version: '1.0.0' } }));

server.listen(env.PORT, () => logger.info({ msg: `API listening`, port: env.PORT }));