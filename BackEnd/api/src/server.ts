import express from 'express';
import { createServer } from 'http';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { security, limiter, notFound } from './middleware/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import schoolRoutes from './routes/school.js';
import parentRoutes from './routes/parent.js';
import platformRoutes from './routes/platform.js';
import billingRoutes from './routes/billing.js';
import reconciliationRoutes from './routes/reconciliation.js';
import contractRoutes from './routes/contracts.js';
import privacyRoutes from './routes/privacy.js';
import monitoringRoutes from './routes/monitoring.js';
import health from './routes/health.js';
import { enforceTenantLock } from './middleware/tenantLock.js';
import { popiaCompliance } from './middleware/popia.js';
import { env } from './config/env.js';
import swaggerUi from 'swagger-ui-express';
import { initRealtime } from './realtime.js';
import { initSentry } from './services/sentry.js';
import { validateRequiredEnvVars } from './config/validation.js';

// Validate environment before starting
validateRequiredEnvVars();
initSentry(process.env.SENTRY_DSN);

const app = express();
const server = createServer(app);
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
let io;
try {
  io = initRealtime(server);
  logger.info('Realtime server initialized');
} catch (e) {
  logger.error('Failed to initialize realtime server:', e);
  process.exit(1);
}

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '2mb' }));
app.use(security);
app.use(limiter);
app.use(popiaCompliance);
app.use(enforceTenantLock);

app.use('/api/health', health);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/parent', parentRoutes);

// (Optional) Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup({ openapi: '3.0.0', info: { title: 'DevForge API', version: '1.0.0' } }));

app.use(notFound);
app.use(errorHandler);

server.listen(env.PORT, () => logger.info({ msg: `API listening`, port: env.PORT }));