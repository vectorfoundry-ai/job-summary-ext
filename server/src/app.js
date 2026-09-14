import express from 'express';
import cors from 'cors';
import summariesRouter from './routes/summaries.routes.js';
import applicationsRouter from './routes/applications.routes.js';
import analyticsRouter from './routes/analytics.routes.js';

function isLocalOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') return true;
    if (hostname.endsWith('.local')) return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function corsOrigin(origin, callback) {
  if (!origin || origin.startsWith('chrome-extension://')) return callback(null, true);
  if (isLocalOrigin(origin)) return callback(null, true);
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith('.trycloudflare.com') || hostname.endsWith('.loca.lt')) return callback(null, true);
  } catch { /* ignore */ }
  const allowed = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
  return callback(null, false);
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '3mb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/summaries', summariesRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use((error, _req, res, _next) => {
    const status = error.status || error.statusCode || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: error.message || (status >= 500 ? 'Internal server error' : 'Bad request') });
  });
  return app;
}
