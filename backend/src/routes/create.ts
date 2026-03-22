/**
 * src/routes/create.ts
 * URL creation — single aur bulk. Prisma version.
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import urlCache from '../services/cache';
import { generateShortCode } from '../services/encoder';
import { generateQRBase64 } from '../services/qr';
import { authMiddleware } from '../middleware/auth';
import { anonymousCreateLimiter, authCreateLimiter } from '../middleware/rateLimit';
import { isValidUrl, validateAlias, isValidExpiryDate } from '../middleware/validation';
import { validate } from '../middleware/validate';
import { createUrlSchema, bulkCreateSchema } from '../utils/validation';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /create:
 *   post:
 *     tags: [URLs]
 *     summary: Long URL ko short URL mein convert karo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:        { type: string, example: 'https://very-long-url.com/path' }
 *               alias:      { type: string, example: 'mylink', description: 'Custom alias (3-16 chars)' }
 *               expires_at: { type: string, example: '2027-12-31T00:00:00Z' }
 *               password:   { type: string, example: 'secret123', description: 'Password protect the link' }
 *               utm:
 *                 type: object
 *                 properties:
 *                   source:   { type: string }
 *                   medium:   { type: string }
 *                   campaign: { type: string }
 *                   term:     { type: string }
 *                   content:  { type: string }
 *     responses:
 *       201:
 *         description: Short URL created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ShortUrl' }
 *       400: { description: Invalid URL or alias }
 *       409: { description: Alias already taken }
 */
router.post('/create', authMiddleware, validate(createUrlSchema), async (req: Request, res: Response) => {
  const { url, alias, expires_at, password, utm } = req.body;

  // Rate limit — logged-in users ke liye zyada
  const limiter = req.userId ? authCreateLimiter : anonymousCreateLimiter;
  await new Promise<void>((resolve, reject) =>
    limiter(req, res, (err) => (err ? reject(err) : resolve()))
  );

  // UTM params append karo
  let finalUrl = utm ? appendUTMParams(url, utm) : url;

  try {
    // Dedup check — same user ki same URL
    if (req.userId) {
      const existing = await prisma.url.findFirst({
        where: { longUrl: finalUrl, userId: req.userId, status: 'active' },
        select: { shortUrl: true },
      });
      if (existing) {
        const shortUrl = `${process.env.BASE_URL}/${existing.shortUrl}`;
        return res.status(200).json({ message: 'URL already shortened', short_url: shortUrl, code: existing.shortUrl });
      }
    }

    // Alias conflict check
    if (alias) {
      const taken = await prisma.url.findUnique({ where: { shortUrl: alias } });
      if (taken) return res.status(409).json({ error: 'Alias already taken. Try another.' });
    }

    // Password hash
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // DB insert — pehle TEMP ke saath, phir id se code generate karo
    const record = await prisma.url.create({
      data: {
        shortUrl:     alias || 'TEMP_PLACEHOLDER',
        longUrl:      finalUrl,
        userId:       req.userId || null,
        passwordHash: passwordHash,
        expiresAt:    expires_at ? new Date(expires_at) : null,
      },
    });

    let code = alias;
    if (!alias) {
      code = generateShortCode(Number(record.id));
      await prisma.url.update({
        where: { id: record.id },
        data:  { shortUrl: code },
      });
    }

    // Cache mein store karo
    urlCache.set(code!, {
      long_url:   finalUrl,
      expires_at: expires_at ? new Date(expires_at) : null,
      status:     'active',
    });

    // QR generate karo
    const shortUrl = `${process.env.BASE_URL}/${code}`;
    const qrCode   = await generateQRBase64(shortUrl, { size: 256 });

    logger.info('URL created', { code, userId: req.userId?.toString() });

    return res.status(201).json({
      short_url:  shortUrl,
      long_url:   finalUrl,
      code,
      qr_code:    qrCode,
      qr_url:     `${shortUrl}/qr`,
      share_url:  `${shortUrl}/qr/share`,
      embed_url:  `${shortUrl}/qr/embed`,
      expires_at: expires_at || null,
      created_at: record.createdAt,
    });
  } catch (err) {
    logger.error('Create URL error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /bulk/create:
 *   post:
 *     tags: [URLs]
 *     summary: Multiple URLs ek saath shorten karo (max 100)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [urls]
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:   { type: string }
 *                     alias: { type: string }
 *     responses:
 *       207: { description: Multi-status response }
 *       400: { description: Validation error }
 */
router.post('/bulk/create', authMiddleware, validate(bulkCreateSchema), async (req: Request, res: Response) => {
  const { urls } = req.body;

  const results = await Promise.allSettled(
    urls.map(async (item: { url: string; alias?: string }) => {
      const record = await prisma.url.create({
        data: {
          shortUrl: item.alias || 'TEMP_BULK',
          longUrl:  item.url,
          userId:   req.userId || null,
        },
      });

      let code = item.alias;
      if (!item.alias) {
        code = generateShortCode(Number(record.id));
        await prisma.url.update({ where: { id: record.id }, data: { shortUrl: code } });
      }

      return { status: 201, short_url: `${process.env.BASE_URL}/${code}`, code, long_url: item.url };
    })
  );

  const formatted = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { status: (r.reason as any).status || 500, error: (r.reason as any).error || 'Failed' }
  );

  const successCount = formatted.filter((r) => (r as any).status === 201).length;
  return res.status(207).json({ results: formatted, summary: { success: successCount, failed: formatted.length - successCount } });
});

// ── UTM helper ───────────────────────────────────────────────────
function appendUTMParams(url: string, utm: Record<string, string>): string {
  try {
    const parsed = new URL(url);
    const map: Record<string, string> = {
      source: 'utm_source', medium: 'utm_medium', campaign: 'utm_campaign',
      term: 'utm_term', content: 'utm_content',
    };
    Object.entries(map).forEach(([key, param]) => {
      if (utm[key]) parsed.searchParams.set(param, utm[key]);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

export default router;
