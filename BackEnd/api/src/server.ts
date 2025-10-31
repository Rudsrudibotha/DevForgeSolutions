import express from 'express';
import { createServer } from 'http';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { security, limiter, notFound } from './middleware/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import health from './routes/health.js';
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
const io = initRealtime(server);

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '2mb' }));
app.use(security);
app.use(limiter);

app.use('/api/health', health);
app.use('/api/auth', authRoutes);

// (Optional) Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup({ openapi: '3.0.0', info: { title: 'DevForge API', version: '1.0.0' } }));

app.use(notFound);
app.use(errorHandler);

server.listen(env.PORT, () => logger.info({ msg: `API listening`, port: env.PORT }));