/**
 * src/routes/health.ts
 * Health check endpoint.
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import urlCache from '../services/cache';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Server aur DB health check
 *     security: []
 *     responses:
 *       200:
 *         description: Healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:     { type: string, example: ok }
 *                 db:         { type: string, example: connected }
 *                 cache_size: { type: integer }
 *                 uptime:     { type: integer, description: Seconds }
 *       503: { description: Unhealthy }
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status:     'ok',
      db:         'connected',
      cache_size: urlCache.size,
      uptime:     Math.floor(process.uptime()),
      timestamp:  new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

export default router;
