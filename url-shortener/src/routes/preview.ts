/**
 * src/routes/preview.ts
 *
 * Link Preview — OG meta tags return karo.
 * WhatsApp/Slack/Twitter pe share karne se pehle preview dikhao.
 *
 * Endpoints:
 *   GET /:shortUrl/preview → OG meta data return karo (JSON)
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /{shortUrl}/preview:
 *   get:
 *     tags: [URLs]
 *     summary: Short URL ka link preview (OG meta tags) dekho
 *     security: []
 *     parameters:
 *       - in: path
 *         name: shortUrl
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OG meta data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 short_url:   { type: string }
 *                 long_url:    { type: string }
 *                 og_title:    { type: string }
 *                 og_description: { type: string }
 *                 og_image:    { type: string }
 *                 expires_at:  { type: string }
 *       404: { description: URL not found }
 */
router.get('/:shortUrl/preview', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;

  try {
    const record = await prisma.url.findUnique({
      where:  { shortUrl },
      select: {
        shortUrl:       true,
        longUrl:        true,
        status:         true,
        ogTitle:        true,
        ogDescription:  true,
        ogImage:        true,
        ogFetchedAt:    true,
        expiresAt:      true,
        createdAt:      true,
      },
    });

    if (!record || record.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (record.status === 'disabled')
      return res.status(410).json({ error: 'This link has been disabled' });

    // Expiry check
    if (record.expiresAt && record.expiresAt < new Date())
      return res.status(410).json({ error: 'This link has expired' });

    return res.json({
      short_url:      `${process.env.BASE_URL}/${record.shortUrl}`,
      long_url:       record.longUrl,
      og_title:       record.ogTitle       || null,
      og_description: record.ogDescription || null,
      og_image:       record.ogImage       || null,
      og_fetched_at:  record.ogFetchedAt   || null,
      expires_at:     record.expiresAt     || null,
      created_at:     record.createdAt,
    });
  } catch (err) {
    logger.error('Preview error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
