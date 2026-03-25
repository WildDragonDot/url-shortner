/**
 * src/routes/report.ts
 *
 * URL Report — users malicious/spam links report kar sakte hain.
 * UrlReport model mein save hota hai — admin review ke liye.
 *
 * Endpoints:
 *   POST /:shortUrl/report → URL report karo
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { validate } from '../middleware/validate';
import { reportUrlSchema } from '../utils/validation';
import { reportLimiter } from '../middleware/rateLimit';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /{shortUrl}/report:
 *   post:
 *     tags: [URLs]
 *     summary: Malicious ya spam URL report karo
 *     security: []
 *     parameters:
 *       - in: path
 *         name: shortUrl
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [phishing, spam, malware, adult_content, copyright, other]
 *                 example: phishing
 *     responses:
 *       201: { description: Report submitted }
 *       400: { description: Invalid reason }
 *       404: { description: URL not found }
 *       429: { description: Already reported from this IP }
 */
router.post('/:shortUrl/report', reportLimiter, validate(reportUrlSchema), async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const { reason }   = req.body;

  try {
    // URL exist karta hai?
    const url = await prisma.url.findUnique({
      where:  { shortUrl },
      select: { status: true },
    });

    if (!url || url.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    // Reporter IP — rate limit: ek IP ek URL ko ek baar report kar sakta hai
    const reporterIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    const alreadyReported = await prisma.urlReport.findFirst({
      where: { shortUrl, reportedBy: reporterIp },
    });

    if (alreadyReported)
      return res.status(429).json({ error: 'You have already reported this URL' });

    await prisma.urlReport.create({
      data: { shortUrl, reason, reportedBy: reporterIp },
    });

    logger.info('URL reported', { shortUrl, reason, ip: reporterIp });

    return res.status(201).json({ message: 'Report submitted. Thank you for helping keep the internet safe.' });
  } catch (err) {
    logger.error('Report URL error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
