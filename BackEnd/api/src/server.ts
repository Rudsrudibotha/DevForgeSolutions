import express from 'express';
import { createServer } from 'http';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { secure, limiter, requireAuth, setTenantFromJwt } from './middleware/index.js';
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
app.use(secure);
app.use(limiter);

app.use('/api/health', health);
app.use('/api/auth', authRoutes);

// Example protected route
app.get('/api/me', requireAuth, setTenantFromJwt, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

// (Optional) Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup({ openapi: '3.0.0', info: { title: 'DevForge API', version: '1.0.0' } }));

server.listen(env.PORT, () => logger.info({ msg: `API listening`, port: env.PORT }));