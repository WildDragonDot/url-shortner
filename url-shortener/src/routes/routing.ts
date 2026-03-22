/**
 * src/routes/routing.ts
 *
 * Routing Rules management — Geo/Device based smart redirect.
 * Redirect logic already redirect.ts mein hai — yeh CRUD API hai.
 *
 * Endpoints:
 *   POST   /urls/:code/routing-rules        → Rule add karo
 *   GET    /urls/:code/routing-rules        → Saare rules dekho
 *   DELETE /urls/:code/routing-rules/:id    → Rule delete karo
 *
 * Rule types:
 *   geo    → condition = country code (e.g. 'IN', 'US')
 *   device → condition = 'mobile' | 'desktop' | 'tablet'
 *   os     → condition = 'iOS' | 'Android' | 'Windows'
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRoutingRuleSchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();
router.use(authMiddleware);
router.use(requireAuth);

/**
 * @swagger
 * /urls/{code}/routing-rules:
 *   post:
 *     tags: [URLs]
 *     summary: Smart routing rule add karo (geo/device/os based redirect)
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
 *             required: [rule_type, condition, target_url]
 *             properties:
 *               rule_type:  { type: string, enum: [geo, device, os], example: 'geo' }
 *               condition:  { type: string, example: 'IN', description: 'Country code / mobile / iOS etc.' }
 *               target_url: { type: string, example: 'https://hindi-page.com' }
 *               priority:   { type: integer, default: 0, description: 'Higher = checked first' }
 *     responses:
 *       201: { description: Rule created }
 *       400: { description: Validation error }
 *       403: { description: Not your URL }
 */
router.post('/:code/routing-rules', validate(createRoutingRuleSchema), async (req: Request, res: Response) => {
  const { code }                              = req.params;
  const { rule_type, condition, target_url, priority } = req.body;

  try {
    const url = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!url || url.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (url.userId !== req.userId)
      return res.status(403).json({ error: 'You can only manage your own URLs' });

    const rule = await prisma.routingRule.create({
      data: {
        shortUrl:  code,
        ruleType:  rule_type,
        condition: condition.toUpperCase(), // Geo codes uppercase mein store karo
        targetUrl: target_url,
        priority:  priority ?? 0,
      },
    });

    return res.status(201).json({
      id:         rule.id.toString(),
      rule_type:  rule.ruleType,
      condition:  rule.condition,
      target_url: rule.targetUrl,
      priority:   rule.priority,
      created_at: rule.createdAt,
    });
  } catch (err) {
    logger.error('Create routing rule error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/routing-rules:
 *   get:
 *     tags: [URLs]
 *     summary: URL ke saare routing rules dekho
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of routing rules }
 */
router.get('/:code/routing-rules', async (req: Request, res: Response) => {
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

    const rules = await prisma.routingRule.findMany({
      where:   { shortUrl: code },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return res.json(rules.map((r) => ({
      id:         r.id.toString(),
      rule_type:  r.ruleType,
      condition:  r.condition,
      target_url: r.targetUrl,
      priority:   r.priority,
      created_at: r.createdAt,
    })));
  } catch (err) {
    logger.error('Get routing rules error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /urls/{code}/routing-rules/{id}:
 *   delete:
 *     tags: [URLs]
 *     summary: Routing rule delete karo
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:code/routing-rules/:id', async (req: Request, res: Response) => {
  const { code, id } = req.params;

  try {
    const url = await prisma.url.findUnique({
      where:  { shortUrl: code },
      select: { userId: true, status: true },
    });

    if (!url || url.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (url.userId !== req.userId)
      return res.status(403).json({ error: 'Access denied' });

    const deleted = await prisma.routingRule.deleteMany({
      where: { id: BigInt(id), shortUrl: code },
    });

    if (deleted.count === 0)
      return res.status(404).json({ error: 'Routing rule not found' });

    return res.json({ message: 'Routing rule deleted' });
  } catch (err) {
    logger.error('Delete routing rule error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
