/**
 * src/routes/analytics.ts
 * Analytics routes — Prisma version.
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { getAnalyticsSummary, getAnalyticsBreakdown, getAnalyticsTimeseries } from '../services/analytics';
import logger from '../utils/logger';

const router = Router();

// Owner check helper
async function checkOwner(code: string, userId: bigint): Promise<boolean> {
  const url = await prisma.url.findUnique({
    where:  { shortUrl: code },
    select: { userId: true, status: true },
  });
  return !!url && url.status !== 'deleted' && url.userId === userId;
}

/**
 * @swagger
 * /urls/{code}/analytics/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Click summary — total, unique, today, week, month
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_clicks:      { type: integer }
 *                 unique_clicks:     { type: integer }
 *                 clicks_today:      { type: integer }
 *                 clicks_this_week:  { type: integer }
 *                 clicks_this_month: { type: integer }
 */
router.get('/:code/analytics/summary', requireAuth, async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    if (!(await checkOwner(code, req.userId!)))
      return res.status(403).json({ error: 'Access denied' });

    return res.json(await getAnalyticsSummary(code));
  } catch (err) {
    logger.error('Analytics summary error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/analytics/breakdown:
 *   get:
 *     tags: [Analytics]
 *     summary: Breakdown by country/device/browser/os/referrer
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: by
 *         required: true
 *         schema: { type: string, enum: [country, device, browser, os, referrer] }
 *     responses:
 *       200:
 *         description: Breakdown data
 */
router.get('/:code/analytics/breakdown', requireAuth, async (req: Request, res: Response) => {
  const { code } = req.params;
  const by = req.query.by as string;
  const allowed = ['country', 'device', 'browser', 'os', 'referrer'];

  if (!by || !allowed.includes(by))
    return res.status(400).json({ error: `'by' param required. Allowed: ${allowed.join(', ')}` });

  try {
    if (!(await checkOwner(code, req.userId!)))
      return res.status(403).json({ error: 'Access denied' });

    return res.json(await getAnalyticsBreakdown(code, by as any));
  } catch (err) {
    logger.error('Analytics breakdown error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/analytics/timeseries:
 *   get:
 *     tags: [Analytics]
 *     summary: Daily click counts over time
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [7d, 30d, 90d], default: 7d }
 *     responses:
 *       200:
 *         description: Time series data
 */
router.get('/:code/analytics/timeseries', requireAuth, async (req: Request, res: Response) => {
  const { code }  = req.params;
  const periodMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days      = periodMap[req.query.period as string] || 7;

  try {
    if (!(await checkOwner(code, req.userId!)))
      return res.status(403).json({ error: 'Access denied' });

    return res.json(await getAnalyticsTimeseries(code, days));
  } catch (err) {
    logger.error('Analytics timeseries error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
