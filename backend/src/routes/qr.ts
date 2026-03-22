/**
 * src/routes/qr.ts
 *
 * QR Code routes.
 *
 * Endpoints:
 *   GET /:shortUrl/qr              → QR image download (PNG/SVG)
 *   GET /:shortUrl/qr/share        → Social media share links
 *   GET /:shortUrl/qr/embed        → HTML/Markdown embed code
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { generateQRBuffer, generateQRSvg } from '../services/qr';
import logger from '../utils/logger';

const router = Router();

// ─── QR IMAGE DOWNLOAD ───────────────────────────────────────────
/**
 * GET /:shortUrl/qr?format=png|svg&size=256&logo=true
 *
 * QR code image serve karta hai — browser mein download hoti hai.
 *
 * Query params:
 *   format = png | svg   (default: png)
 *   size   = 64–1024     (default: 256, PNG only)
 *   logo   = true|false  (default: false, PNG only)
 *
 * Response:
 *   Content-Type: image/png  OR  image/svg+xml
 *   Content-Disposition: attachment; filename="qr-abc1234.png"
 */
router.get('/:shortUrl/qr', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const format = (req.query.format as string) === 'svg' ? 'svg' : 'png';
  const size   = Math.min(Math.max(parseInt(req.query.size as string) || 256, 64), 1024);
  const logo   = req.query.logo === 'true';

  try {
    // URL exist karta hai? Expired toh nahi?
    const record = await prisma.url.findUnique({
      where: { shortUrl },
      select: { status: true, expiresAt: true },
    });

    if (!record || record.status === 'deleted') {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This link has expired' });
    }

    // QR mein short URL encode karo (redirect URL)
    const targetUrl = `${process.env.BASE_URL}/${shortUrl}?ref=qr`;

    if (format === 'svg') {
      const svg = await generateQRSvg(targetUrl);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="qr-${shortUrl}.svg"`);
      return res.send(svg);
    }

    // PNG
    const qrBuffer = await generateQRBuffer(targetUrl, { size, logo });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-${shortUrl}.png"`);
    // Cache karo — 1 hour (same QR baar baar generate na karna pade)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(qrBuffer);
  } catch (err) {
    logger.error('QR generation error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// ─── SHARE LINKS ─────────────────────────────────────────────────
/**
 * GET /:shortUrl/qr/share
 *
 * Social media share links return karta hai.
 * WhatsApp, Twitter, Facebook, Email, Telegram, LinkedIn ke ready-made URLs.
 * Web Share API data bhi include karta hai (mobile browsers ke liye).
 *
 * Response 200:
 * {
 *   "short_url": "http://localhost:3000/abc1234",
 *   "qr_image_url": "http://localhost:3000/abc1234/qr",
 *   "share_links": { "whatsapp": "...", "twitter": "...", ... },
 *   "web_share_data": { "title": "...", "text": "...", "url": "..." }
 * }
 */
router.get('/:shortUrl/qr/share', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;

  try {
    const record = await prisma.url.findUnique({
      where: { shortUrl },
      select: { status: true, ogTitle: true },
    });

    if (!record || record.status === 'deleted') {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const shortLink   = `${process.env.BASE_URL}/${shortUrl}`;
    const qrImageUrl  = `${process.env.BASE_URL}/${shortUrl}/qr`;
    const encoded     = encodeURIComponent(shortLink);
    const shareText   = encodeURIComponent(`Check this out: ${shortLink}`);
    const title       = record.ogTitle || 'Shared Link';

    return res.json({
      short_url:    shortLink,
      qr_image_url: qrImageUrl,
      share_links: {
        whatsapp: `https://wa.me/?text=${shareText}`,
        twitter:  `https://twitter.com/intent/tweet?url=${encoded}&text=Check+this+out`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
        email:    `mailto:?subject=${encodeURIComponent(title)}&body=${shareText}`,
        telegram: `https://t.me/share/url?url=${encoded}&text=Check+this+out`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      },
      // Web Share API ke liye — mobile browsers mein native share sheet open hoti hai
      web_share_data: {
        title: title,
        text:  `Check this out: ${shortLink}`,
        url:   shortLink,
      },
    });
  } catch (err) {
    logger.error('Share links error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── EMBED CODE ──────────────────────────────────────────────────
/**
 * GET /:shortUrl/qr/embed?size=256
 *
 * HTML aur Markdown embed code return karta hai.
 * Koi bhi apni website pe paste kar sake.
 *
 * Response 200:
 * {
 *   "html":      "<a href='...'><img src='...' /></a>",
 *   "markdown":  "[![QR Code](...)](...)",
 *   "image_url": "http://localhost:3000/abc1234/qr?size=256"
 * }
 */
router.get('/:shortUrl/qr/embed', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const size = Math.min(Math.max(parseInt(req.query.size as string) || 256, 64), 1024);

  try {
    const record = await prisma.url.findUnique({
      where: { shortUrl },
      select: { status: true },
    });

    if (!record || record.status === 'deleted') {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const shortLink  = `${process.env.BASE_URL}/${shortUrl}`;
    const qrImageUrl = `${process.env.BASE_URL}/${shortUrl}/qr?size=${size}`;

    return res.json({
      html: `<a href="${shortLink}" target="_blank" rel="noopener noreferrer">\n  <img src="${qrImageUrl}" alt="QR Code" width="${size}" height="${size}" />\n</a>`,
      markdown:  `[![QR Code](${qrImageUrl})](${shortLink})`,
      image_url: qrImageUrl,
    });
  } catch (err) {
    logger.error('Embed code error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
