/**
 * src/routes/abtest.ts
 *
 * A/B Test management — ek short URL se multiple destinations pe traffic split karo.
 * Redirect logic already redirect.ts mein hai — yeh CRUD API hai.
 *
 * Endpoints:
 *   POST   /urls/:code/ab-test  → A/B test create/replace karo
 *   GET    /urls/:code/ab-test  → Current A/B test dekho
 *   DELETE /urls/:code/ab-test  → A/B test remove karo
 *
 * Variant format:
 *   [{ "url": "https://...", "weight": 50, "label": "A" }, ...]
 *   Weights ka sum 100 hona chahiye.
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAbTestSchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireAuth);

/**
 * @swagger
 * /urls/{code}/ab-test:
 *   post:
 *     tags: [URLs]
 *     summary: A/B test create ya replace karo
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variants]
 *             properties:
 *               variants:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required: [url, weight]
 *                   properties:
 *                     url:    { type: string, example: 'https://landing-a.com' }
 *                     weight: { type: integer, example: 50, description: 'Traffic % (all weights must sum to 100)' }
 *                     label:  { type: string, example: 'Variant A' }
 *     responses:
 *       201: { description: A/B test created }
 *       400: { description: Validation error }
 *       403: { description: Not your URL }
 */
router.post('/:code/ab-test', validate(createAbTestSchema), async (req: Request, res: Response) => {
  const { code }     = req.params;
  const { variants } = req.body;

  try {
    // URL ownership check
    const url = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!url || url.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (url.userId !== req.userId)
      return res.status(403).json({ error: 'You can only manage your own URLs' });

    // Upsert — agar pehle se hai toh replace karo
    const abTest = await prisma.abTest.upsert({
      where:  { shortUrl: code },
      create: { shortUrl: code, variants },
      update: { variants },
    });

    return res.status(201).json({
      message:  'A/B test configured',
      short_url: code,
      variants:  abTest.variants,
      created_at: abTest.createdAt,
    });
  } catch (err) {
    logger.error('Create AB test error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/ab-test:
 *   get:
 *     tags: [URLs]
 *     summary: Current A/B test configuration dekho
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: A/B test config }
 *       404: { description: No A/B test found }
 */
router.get('/:code/ab-test', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    // Ownership check
    const url = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!url || url.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (url.userId !== req.userId)
      return res.status(403).json({ error: 'Access denied' });

    const abTest = await prisma.abTest.findUnique({ where: { shortUrl: code } });
    if (!abTest) return res.status(404).json({ error: 'No A/B test configured for this URL' });

    return res.json({
      short_url:  code,
      variants:   abTest.variants,
      created_at: abTest.createdAt,
    });
  } catch (err) {
    logger.error('Get AB test error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/ab-test:
 *   delete:
 *     tags: [URLs]
 *     summary: A/B test remove karo (normal redirect resume hoga)
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:code/ab-test', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    const url = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!url || url.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (url.userId !== req.userId)
      return res.status(403).json({ error: 'Access denied' });

    const deleted = await prisma.abTest.deleteMany({ where: { shortUrl: code } });
    if (deleted.count === 0)
      return res.status(404).json({ error: 'No A/B test found for this URL' });

    return res.json({ message: 'A/B test removed. URL will now redirect normally.' });
  } catch (err) {
    logger.error('Delete AB test error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
