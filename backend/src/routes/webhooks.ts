/**
 * src/routes/webhooks.ts
 *
 * Webhook CRUD management.
 * Jab URL click ho toh registered endpoint pe notify karo.
 *
 * Endpoints:
 *   POST   /webhooks          → Naya webhook register karo
 *   GET    /webhooks          → Apne saare webhooks dekho
 *   PATCH  /webhooks/:id      → Webhook update karo
 *   DELETE /webhooks/:id      → Webhook delete karo
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createWebhookSchema, updateWebhookSchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireAuth);

/**
 * @swagger
 * /webhooks:
 *   post:
 *     tags: [URLs]
 *     summary: Naya webhook register karo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint:  { type: string, example: 'https://yourserver.com/hook' }
 *               short_url: { type: string, description: 'Specific URL ke liye, null = sab URLs' }
 *               events:    { type: array, items: { type: string }, example: ['click'] }
 *     responses:
 *       201: { description: Webhook created with secret }
 */
router.post('/', validate(createWebhookSchema), async (req: Request, res: Response) => {
  const { endpoint, short_url, events } = req.body;

  // Agar specific short_url diya hai toh owner check karo
  if (short_url) {
    const url = await prisma.url.findUnique({ where: { shortUrl: short_url }, select: { userId: true } });
    if (!url) return res.status(404).json({ error: 'Short URL not found' });
    if (url.userId !== req.userId) return res.status(403).json({ error: 'You can only add webhooks to your own URLs' });
  }

  try {
    // HMAC secret generate karo — receiver verify karega
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        userId:   req.userId!,
        endpoint,
        secret,
        shortUrl: short_url || null,
        events:   events || ['click'],
      },
      select: { id: true, endpoint: true, shortUrl: true, events: true, createdAt: true },
    });

    return res.status(201).json({
      ...webhook,
      id:     webhook.id.toString(),
      secret, // Sirf ek baar dikhao — receiver ko configure karne ke liye
      message: '⚠️  Save this secret — it will not be shown again. Use it to verify X-Signature header.',
    });
  } catch (err) {
    logger.error('Create webhook error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /webhooks:
 *   get:
 *     tags: [URLs]
 *     summary: Apne saare webhooks dekho
 *     responses:
 *       200: { description: List of webhooks }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where:   { userId: req.userId! },
      select:  { id: true, endpoint: true, shortUrl: true, events: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(webhooks.map((w) => ({ ...w, id: w.id.toString() })));
  } catch (err) {
    logger.error('List webhooks error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /webhooks/{id}:
 *   patch:
 *     tags: [URLs]
 *     summary: Webhook update karo (endpoint ya events)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.patch('/:id', validate(updateWebhookSchema), async (req: Request, res: Response) => {
  const { endpoint, events } = req.body;

  try {
    const existing = await prisma.webhook.findUnique({
      where:  { id: BigInt(req.params.id) },
      select: { userId: true },
    });

    if (!existing) return res.status(404).json({ error: 'Webhook not found' });
    if (existing.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    await prisma.webhook.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(endpoint && { endpoint }),
        ...(events   && { events }),
      },
    });

    return res.json({ message: 'Webhook updated' });
  } catch (err) {
    logger.error('Update webhook error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     tags: [URLs]
 *     summary: Webhook delete karo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await prisma.webhook.deleteMany({
      where: { id: BigInt(req.params.id), userId: req.userId! },
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'Webhook not found' });
    return res.json({ message: 'Webhook deleted' });
  } catch (err) {
    logger.error('Delete webhook error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
