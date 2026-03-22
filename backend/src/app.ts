/**
 * src/app.ts
 *
 * Express application — production-grade setup.
 *
 * Middleware stack (order matters!):
 *   1. Helmet       → Security headers (XSS, clickjacking, etc.)
 *   2. CORS         → Cross-origin requests allow karo
 *   3. Compression  → Gzip responses (bandwidth save)
 *   4. Morgan       → HTTP request logging
 *   5. Body parsers → JSON + URL-encoded
 *   6. Cookie parser→ Password unlock cookies
 *   7. Auth         → Optional JWT/API key auth
 *   8. Routes       → Business logic
 *   9. Swagger UI   → API docs at /api-docs
 *  10. Error handler→ Global error catch
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

import { swaggerSpec } from './utils/swagger';
import logger from './utils/logger';

// Routes
import authRoutes       from './routes/auth';
import createRoutes     from './routes/create';
import redirectRoutes   from './routes/redirect';
import manageRoutes     from './routes/manage';
import qrRoutes         from './routes/qr';
import analyticsRoutes  from './routes/analytics';
import unlockRoutes     from './routes/unlock';
import apiKeyRoutes     from './routes/apiKeys';
import healthRoutes     from './routes/health';
import webhookRoutes    from './routes/webhooks';
import collectionRoutes, { collectionPublicRouter } from './routes/collections';
import reportRoutes     from './routes/report';
import abTestRoutes     from './routes/abtest';
import routingRoutes    from './routes/routing';
import previewRoutes    from './routes/preview';

import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();

// ─── 1. HELMET — Security headers ───────────────────────────────
// XSS protection, clickjacking prevention, MIME sniffing block, etc.
// Production mein yeh bahut zaroori hai.
app.use(
  helmet({
    // Swagger UI ke liye inline scripts allow karo
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// ─── 2. CORS — Cross-Origin Resource Sharing ────────────────────
// Frontend (React/Next.js) alag port pe hota hai — CORS allow karo.
// Production mein specific origins whitelist karo.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = same-origin request (Postman, curl, server-to-server) — allow karo
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        logger.warn('CORS blocked', { origin });
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials:      true,  // Cookies aur Authorization headers allow karo
    methods:          ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:   ['Content-Type', 'Authorization'],
    exposedHeaders:   ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge:           86400, // Preflight cache: 24 hours
  })
);

// ─── 3. COMPRESSION — Gzip responses ────────────────────────────
// Response size 60-80% reduce hoti hai — bandwidth aur latency save.
// 1KB se chhote responses compress nahi hote (overhead zyada hoga).
app.use(compression({ threshold: 1024 }));

// ─── 4. MORGAN — HTTP request logging ───────────────────────────
// Har request log hogi — debugging aur monitoring ke liye.
// Production: 'combined' format (Apache-style, log aggregators ke liye)
// Development: 'dev' format (colorized, readable)
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    // Morgan output Winston ke through bhejo
    stream: { write: (msg) => logger.http(msg.trim()) },
    // Health check requests log mat karo (noise)
    skip: (req) => req.url === '/health',
  })
);

// ─── 5. BODY PARSERS ────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── 6. COOKIE PARSER ───────────────────────────────────────────
app.use(cookieParser());

// ─── 7. ROUTES ──────────────────────────────────────────────────
// NOTE: authMiddleware is NOT applied globally - each route applies it as needed

// Health check — sabse pehle (load balancer ke liye)
app.use('/health', healthRoutes);

// Auth
app.use('/auth', authRoutes);

// URL creation
app.use('/', createRoutes);

// URL management (dashboard, update, delete, toggle)
app.use('/urls', manageRoutes);

// Analytics
app.use('/urls', analyticsRoutes);

// API Keys
app.use('/api-keys', apiKeyRoutes);

// Webhooks
app.use('/webhooks', webhookRoutes);

// Collections public page — /@username (no auth, redirect se PEHLE)
app.use('/', collectionPublicRouter);

// Collections CRUD — auth required
app.use('/collections', collectionRoutes);

// URL Reports
app.use('/', reportRoutes);

// Link Preview
app.use('/', previewRoutes);

// A/B Test management
app.use('/urls', abTestRoutes);

// Routing Rules management
app.use('/urls', routingRoutes);

// QR routes — redirect se PEHLE register karo
app.use('/', qrRoutes);

// Password unlock
app.use('/', unlockRoutes);

// Redirect — sabse last mein (catch-all /:shortUrl)
app.use('/', redirectRoutes);

// ─── 9. SWAGGER UI ──────────────────────────────────────────────
// API documentation — http://localhost:3000/api-docs
// Production mein disable karna ho toh NODE_ENV check karo
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'URL Shortener API Docs',
    customCss:       '.swagger-ui .topbar { display: none }', // Swagger logo hide karo
    swaggerOptions: {
      persistAuthorization: true, // Token refresh pe bhi save rahe
    },
  })
);

// Swagger JSON spec — programmatic access ke liye
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── 10. 404 HANDLER ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── 11. GLOBAL ERROR HANDLER ───────────────────────────────────
// Express error handler — 4 parameters hone chahiye
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
 
