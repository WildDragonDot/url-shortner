/**
 * src/routes/apiKeys.ts
 * API Key management. Prisma version.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createApiKeySchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireAuth);

/**
 * @swagger
 * /api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Naya API key generate karo
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:       { type: string, example: 'Production Key' }
 *               expires_at: { type: string, example: '2027-01-01T00:00:00Z' }
 *     responses:
 *       201:
 *         description: API key created (raw key sirf ek baar dikhega)
 */
router.post('/', validate(createApiKeySchema), async (req: Request, res: Response) => {
  const { name, expires_at } = req.body;

  try {
    const rawKey  = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix  = rawKey.substring(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId:    req.userId!,
        keyHash,
        keyPrefix: prefix,
        name:      name || 'API Key',
        expiresAt: expires_at ? new Date(expires_at) : null,
      },
      select: { id: true, keyPrefix: true, name: true, expiresAt: true, createdAt: true },
    });

    return res.status(201).json({
      message:    '⚠️  Save this key now — it will not be shown again',
      key:        rawKey,
      id:         apiKey.id.toString(),
      prefix:     apiKey.keyPrefix,
      name:       apiKey.name,
      expires_at: apiKey.expiresAt,
    });
  } catch (err) {
    logger.error('Create API key error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: Apne saare API keys dekho
 *     responses:
 *       200: { description: List of API keys }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where:   { userId: req.userId! },
      select:  { id: true, keyPrefix: true, name: true, lastUsed: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(keys.map((k: typeof keys[number]) => ({ ...k, id: k.id.toString() })));
  } catch (err) {
    logger.error('List API keys error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: API key revoke karo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Revoked }
 *       404: { description: Not found }
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await prisma.apiKey.deleteMany({
      where: { id: BigInt(req.params.id), userId: req.userId! },
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'API key not found' });
    return res.json({ message: 'API key revoked successfully' });
  } catch (err) {
    logger.error('Revoke API key error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
