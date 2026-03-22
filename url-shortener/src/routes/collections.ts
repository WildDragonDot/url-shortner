/**
 * src/routes/collections.ts
 *
 * Link-in-Bio / Collections — Linktree jaisa feature.
 * short.ly/@username pe ek page pe multiple links.
 *
 * Endpoints:
 *   POST   /collections                    → Collection banao
 *   GET    /collections                    → Apni collections dekho
 *   PATCH  /collections/:slug              → Collection update karo
 *   DELETE /collections/:slug              → Collection delete karo
 *   POST   /collections/:slug/links        → Link add karo
 *   DELETE /collections/:slug/links/:id    → Link remove karo
 *   PATCH  /collections/:slug/links/reorder → Links reorder karo
 *   GET    /@:username                     → Public page (HTML)
 */

import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCollectionSchema, updateCollectionSchema, addCollectionLinkSchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

// ─── PUBLIC: Collection page ─────────────────────────────────────
/**
 * @swagger
 * /@{username}:
 *   get:
 *     tags: [URLs]
 *     summary: Link-in-Bio public page
 *     security: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: HTML page with all links }
 *       404: { description: Collection not found }
 */
router.get('/@:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const collection = await prisma.collection.findUnique({
      where: { slug: username },
      include: {
        links: {
          where:   { url: { status: 'active' } },
          include: { url: { select: { shortUrl: true, longUrl: true, ogTitle: true, ogImage: true } } },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    // JSON response — frontend HTML render karega
    // Ya simple HTML serve karo agar frontend nahi hai
    return res.json({
      slug:        collection.slug,
      title:       collection.title,
      description: collection.description,
      theme:       collection.theme,
      links: collection.links.map((l) => ({
        id:        l.id.toString(),
        label:     l.label,
        short_url: `${process.env.BASE_URL}/${l.url.shortUrl}`,
        og_title:  l.url.ogTitle,
        og_image:  l.url.ogImage,
        position:  l.position,
      })),
    });
  } catch (err) {
    logger.error('Get collection error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── AUTH REQUIRED from here ─────────────────────────────────────
router.use(authMiddleware);
router.use(requireAuth);

/**
 * @swagger
 * /collections:
 *   post:
 *     tags: [URLs]
 *     summary: Naya Link-in-Bio collection banao
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug]
 *             properties:
 *               slug:        { type: string, example: 'johndoe', description: '@username' }
 *               title:       { type: string, example: 'John Doe Links' }
 *               description: { type: string }
 *               theme:       { type: string, example: 'dark' }
 *     responses:
 *       201: { description: Collection created }
 *       409: { description: Slug already taken }
 */
router.post('/', validate(createCollectionSchema), async (req: Request, res: Response) => {
  const { slug, title, description, theme } = req.body;

  try {
    const existing = await prisma.collection.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'This username is already taken' });

    const collection = await prisma.collection.create({
      data: { userId: req.userId!, slug, title, description, theme: theme || 'default' },
    });

    return res.status(201).json({
      ...collection,
      id:       collection.id.toString(),
      page_url: `${process.env.BASE_URL}/@${slug}`,
    });
  } catch (err) {
    logger.error('Create collection error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /collections:
 *   get:
 *     tags: [URLs]
 *     summary: Apni saari collections dekho
 *     responses:
 *       200: { description: List of collections }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const collections = await prisma.collection.findMany({
      where:   { userId: req.userId! },
      include: { _count: { select: { links: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(collections.map((c) => ({
      id:         c.id.toString(),
      slug:       c.slug,
      title:      c.title,
      theme:      c.theme,
      link_count: c._count.links,
      page_url:   `${process.env.BASE_URL}/@${c.slug}`,
      created_at: c.createdAt,
    })));
  } catch (err) {
    logger.error('List collections error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /collections/{slug}:
 *   patch:
 *     tags: [URLs]
 *     summary: Collection update karo
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
router.patch('/:slug', validate(updateCollectionSchema), async (req: Request, res: Response) => {
  const { title, description, theme } = req.body;

  try {
    const existing = await prisma.collection.findUnique({ where: { slug: req.params.slug } });
    if (!existing) return res.status(404).json({ error: 'Collection not found' });
    if (existing.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    await prisma.collection.update({
      where: { slug: req.params.slug },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(theme       !== undefined && { theme }),
      },
    });

    return res.json({ message: 'Collection updated' });
  } catch (err) {
    logger.error('Update collection error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /collections/{slug}:
 *   delete:
 *     tags: [URLs]
 *     summary: Collection delete karo
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.collection.findUnique({ where: { slug: req.params.slug } });
    if (!existing) return res.status(404).json({ error: 'Collection not found' });
    if (existing.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    await prisma.collection.delete({ where: { slug: req.params.slug } });
    return res.json({ message: 'Collection deleted' });
  } catch (err) {
    logger.error('Delete collection error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /collections/{slug}/links:
 *   post:
 *     tags: [URLs]
 *     summary: Collection mein link add karo
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [short_url]
 *             properties:
 *               short_url: { type: string, example: 'abc1234' }
 *               label:     { type: string, example: 'My YouTube Channel' }
 *               position:  { type: integer, example: 0 }
 *     responses:
 *       201: { description: Link added }
 */
router.post('/:slug/links', validate(addCollectionLinkSchema), async (req: Request, res: Response) => {
  const { short_url, label, position } = req.body;

  try {
    const collection = await prisma.collection.findUnique({ where: { slug: req.params.slug } });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    // URL exist karta hai?
    const url = await prisma.url.findUnique({ where: { shortUrl: short_url } });
    if (!url) return res.status(404).json({ error: 'Short URL not found' });

    // Max position calculate karo agar nahi diya
    let pos = position;
    if (pos === undefined) {
      const maxPos = await prisma.collectionLink.aggregate({
        where: { collectionId: collection.id },
        _max:  { position: true },
      });
      pos = (maxPos._max.position ?? -1) + 1;
    }

    const link = await prisma.collectionLink.create({
      data: { collectionId: collection.id, shortUrl: short_url, label, position: pos },
    });

    return res.status(201).json({ ...link, id: link.id.toString() });
  } catch (err) {
    logger.error('Add collection link error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /collections/{slug}/links/{id}:
 *   delete:
 *     tags: [URLs]
 *     summary: Collection se link remove karo
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Removed }
 */
router.delete('/:slug/links/:id', async (req: Request, res: Response) => {
  try {
    const collection = await prisma.collection.findUnique({ where: { slug: req.params.slug } });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    const deleted = await prisma.collectionLink.deleteMany({
      where: { id: BigInt(req.params.id), collectionId: collection.id },
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'Link not found' });
    return res.json({ message: 'Link removed from collection' });
  } catch (err) {
    logger.error('Remove collection link error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /collections/{slug}/links/reorder:
 *   patch:
 *     tags: [URLs]
 *     summary: Collection links reorder karo
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order]
 *             properties:
 *               order:
 *                 type: array
 *                 description: Link IDs in new order
 *                 items: { type: string }
 *                 example: ['3', '1', '2']
 *     responses:
 *       200: { description: Reordered }
 */
router.patch('/:slug/links/reorder', async (req: Request, res: Response) => {
  const { order } = req.body; // Array of link IDs in new order

  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array is required' });

  try {
    const collection = await prisma.collection.findUnique({ where: { slug: req.params.slug } });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.userId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    // Har link ki position update karo
    await Promise.all(
      order.map((id: string, index: number) =>
        prisma.collectionLink.updateMany({
          where: { id: BigInt(id), collectionId: collection.id },
          data:  { position: index },
        })
      )
    );

    return res.json({ message: 'Links reordered' });
  } catch (err) {
    logger.error('Reorder collection links error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
