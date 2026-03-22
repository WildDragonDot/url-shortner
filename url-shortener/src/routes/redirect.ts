/**
 * src/routes/redirect.ts
 *
 * URL redirect — CRITICAL PATH. Prisma version.
 * Cache → DB → Smart routing → A/B → 302 → Analytics (async) → Webhooks (async)
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import urlCache from '../services/cache';
import { emitAnalytics } from '../services/analytics';
import { fireWebhooks } from '../services/webhook';
import { redirectLimiter } from '../middleware/rateLimit';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /{shortUrl}:
 *   get:
 *     tags: [Redirect]
 *     summary: Short URL ko original URL pe redirect karo
 *     security: []
 *     parameters:
 *       - in: path
 *         name: shortUrl
 *         required: true
 *         schema: { type: string }
 *         description: Short URL code (e.g., abc1234)
 *       - in: query
 *         name: ref
 *         schema: { type: string, enum: [qr] }
 *         description: QR scan se aaya hai toh ref=qr
 *     responses:
 *       302: { description: Redirect to original URL }
 *       404: { description: Short URL not found }
 *       410: { description: URL expired }
 *       403: { description: URL disabled }
 */
router.get('/:shortUrl', redirectLimiter, async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const source = req.query.ref === 'qr' ? 'qr_scan' : 'direct';

  try {
    // ── 1. LRU Cache check ───────────────────────────────────
    const cached = urlCache.get(shortUrl);
    let longUrl: string;
    let userId: bigint | null = null;
    let passwordHash: string | null = null;

    if (cached) {
      // Status/expiry check from cache
      if (cached.status === 'deleted') return res.status(404).json({ error: 'Short URL not found' });
      if (cached.status === 'disabled') return res.status(403).json({ error: 'This link has been disabled' });
      if (cached.expires_at && cached.expires_at < new Date()) return res.status(410).json({ error: 'This link has expired' });
      longUrl = cached.long_url;

      // Password check — cache mein hash nahi hota, DB se lo
      const pwRecord = await prisma.url.findUnique({
        where:  { shortUrl },
        select: { passwordHash: true, userId: true },
      });
      passwordHash = pwRecord?.passwordHash ?? null;
      userId       = pwRecord?.userId ?? null;
    } else {
      // ── 2. DB query ──────────────────────────────────────────
      const record = await prisma.url.findUnique({
        where:  { shortUrl },
        select: { longUrl: true, expiresAt: true, status: true, passwordHash: true, userId: true },
      });

      if (!record) return res.status(404).json({ error: 'Short URL not found' });

      if (record.status === 'deleted')  return res.status(404).json({ error: 'Short URL not found' });
      if (record.status === 'disabled') return res.status(403).json({ error: 'This link has been disabled' });
      if (record.expiresAt && record.expiresAt < new Date()) return res.status(410).json({ error: 'This link has expired' });

      longUrl      = record.longUrl;
      userId       = record.userId;
      passwordHash = record.passwordHash;

      // Cache mein store karo
      urlCache.set(shortUrl, {
        long_url:   record.longUrl,
        expires_at: record.expiresAt,
        status:     record.status,
      });
    }

    // ── 3. Password check ────────────────────────────────────
    if (passwordHash) {
      const unlockToken = req.cookies?.[`unlock_${shortUrl}`];
      if (!unlockToken || unlockToken !== `unlocked_${shortUrl}`) {
        return res.redirect(`/unlock?url=${shortUrl}`);
      }
    }

    // ── 4. Smart routing (Geo/Device) ────────────────────────
    const finalUrl = await resolveSmartRedirect(shortUrl, req, longUrl);

    // ── 5. A/B test ──────────────────────────────────────────
    const abResult = await resolveABTest(shortUrl, finalUrl);

    // ── 6. 302 Redirect ──────────────────────────────────────
    res.redirect(302, abResult.url);

    // ── 7. Analytics async (non-blocking) ───────────────────
    const ip        = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer  = req.headers['referer'] || '';

    emitAnalytics({ shortUrl, ipAddress: ip, userAgent, referrer, source, abVariant: abResult.variant });

    // ── 8. Webhooks async (non-blocking) ────────────────────
    const geo    = geoip.lookup(ip);
    const parser = new UAParser(userAgent);
    fireWebhooks(shortUrl, userId, {
      event: 'click', short_url: shortUrl, long_url: longUrl,
      clicked_at: new Date().toISOString(),
      country: geo?.country, device: parser.getDevice().type || 'desktop', source,
    });

  } catch (err) {
    logger.error('Redirect error', { shortUrl, error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Smart routing helper ─────────────────────────────────────────
async function resolveSmartRedirect(shortUrl: string, req: Request, defaultUrl: string): Promise<string> {
  try {
    const rules = await prisma.routingRule.findMany({
      where:   { shortUrl },
      orderBy: { priority: 'desc' },
    });
    if (!rules.length) return defaultUrl;

    const ip  = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || req.ip || '';
    const geo = geoip.lookup(ip);
    const ua  = new UAParser(req.headers['user-agent'] || '').getResult();

    for (const rule of rules) {
      if (rule.ruleType === 'geo'    && geo?.country === rule.condition) return rule.targetUrl;
      if (rule.ruleType === 'device' && ua.device.type === rule.condition) return rule.targetUrl;
      if (rule.ruleType === 'os'     && ua.os.name === rule.condition)     return rule.targetUrl;
    }
  } catch (err) {
    logger.error('Smart routing error', { error: (err as Error).message });
  }
  return defaultUrl;
}

// ── A/B test helper ──────────────────────────────────────────────
async function resolveABTest(shortUrl: string, defaultUrl: string): Promise<{ url: string; variant?: string }> {
  try {
    const abTest = await prisma.abTest.findUnique({ where: { shortUrl } });
    if (!abTest) return { url: defaultUrl };

    const variants = abTest.variants as Array<{ url: string; weight: number; label?: string }>;
    const rand     = Math.random() * 100;
    let cumulative = 0;

    for (let i = 0; i < variants.length; i++) {
      cumulative += variants[i].weight;
      if (rand <= cumulative) {
        return { url: variants[i].url, variant: variants[i].label || String.fromCharCode(65 + i) };
      }
    }
    return { url: variants[0].url, variant: 'A' };
  } catch {
    return { url: defaultUrl };
  }
}

export default router;
