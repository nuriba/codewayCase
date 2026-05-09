import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env.js';
import './config/firebase.js'; // initialize admin SDK
import parametersRouter from './routes/parameters.js';
import aiRouter from './routes/ai.js';
import configRouter from './routes/config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { COUNTRIES } from './utils/countries.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '256kb' }));

const allowed = env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: false,
}));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/api/countries', (_req, res) => res.json(COUNTRIES));

app.use('/api/parameters', parametersRouter);
app.use('/api', aiRouter);
app.use('/v1', configRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number.parseInt(env.PORT, 10) || 8080;
const server = app.listen(port, () => {
  console.log(`[backend] listening on :${port} (${env.NODE_ENV})`);
});

// Graceful shutdown for --watch restarts to prevent EADDRINUSE errors.
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 2000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
