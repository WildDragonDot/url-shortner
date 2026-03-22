/**
 * src/routes/manage.ts
 * URL management — dashboard, update, delete, toggle. Prisma version.
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import urlCache from '../services/cache';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUrlSchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();
router.use(authMiddleware);  // First parse token and set req.userId
router.use(requireAuth);     // Then check if authenticated

/**
 * @swagger
 * /urls:
 *   get:
 *     tags: [URLs]
 *     summary: Apni saari URLs dekho (dashboard)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated URL list
 *       401: { description: Authentication required }
 */
router.get('/', async (req: Request, res: Response) => {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip   = (page - 1) * limit;

  try {
    const [total, urls] = await Promise.all([
      prisma.url.count({ where: { userId: req.userId, status: { not: 'deleted' } } }),
      prisma.url.findMany({
        where:   { userId: req.userId, status: { not: 'deleted' } },
        select: {
          shortUrl: true, longUrl: true, status: true,
          expiresAt: true, createdAt: true, ogTitle: true, ogImage: true,
          _count: { select: { analytics: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      urls: urls.map((u: typeof urls[number]) => ({
        code:           u.shortUrl,
        short_url:      `${process.env.BASE_URL}/${u.shortUrl}`,
        long_url:       u.longUrl,
        status:         u.status,
        expires_at:     u.expiresAt,
        created_at:     u.createdAt,
        og_title:       u.ogTitle,
        click_count:    u._count.analytics,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Get URLs error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}:
 *   patch:
 *     tags: [URLs]
 *     summary: URL update karo (long_url ya expires_at)
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               long_url:   { type: string }
 *               expires_at: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Not your URL }
 *       404: { description: Not found }
 */
router.patch('/:code', validate(updateUrlSchema), async (req: Request, res: Response) => {
  const { code }             = req.params;
  const { long_url, expires_at } = req.body;

  if (!long_url && expires_at === undefined)
    return res.status(400).json({ error: 'Provide long_url or expires_at to update' });

  try {
    const existing = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!existing || existing.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (existing.userId !== req.userId)
      return res.status(403).json({ error: 'You can only update your own URLs' });

    await prisma.url.update({
      where: { shortUrl: code },
      data: {
        ...(long_url   && { longUrl: long_url }),
        ...(expires_at !== undefined && { expiresAt: expires_at ? new Date(expires_at) : null }),
      },
    });

    urlCache.delete(code);
    return res.json({ message: 'URL updated successfully', code });
  } catch (err) {
    logger.error('Update URL error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}:
 *   delete:
 *     tags: [URLs]
 *     summary: URL delete karo (soft delete)
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not your URL }
 */
router.delete('/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    const existing = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!existing || existing.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (existing.userId !== req.userId)
      return res.status(403).json({ error: 'You can only delete your own URLs' });

    await prisma.url.update({ where: { shortUrl: code }, data: { status: 'deleted' } });
    urlCache.delete(code);

    return res.json({ message: 'URL deleted successfully' });
  } catch (err) {
    logger.error('Delete URL error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/toggle:
 *   patch:
 *     tags: [URLs]
 *     summary: URL active/disabled toggle karo
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Toggled }
 */
router.patch('/:code/toggle', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    const existing = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!existing || existing.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (existing.userId !== req.userId)
      return res.status(403).json({ error: 'You can only manage your own URLs' });

    const newStatus = existing.status === 'active' ? 'disabled' : 'active';
    await prisma.url.update({ where: { shortUrl: code }, data: { status: newStatus } });
    urlCache.delete(code);

    return res.json({ message: `URL ${newStatus === 'active' ? 'enabled' : 'disabled'}`, status: newStatus });
  } catch (err) {
    logger.error('Toggle URL error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
