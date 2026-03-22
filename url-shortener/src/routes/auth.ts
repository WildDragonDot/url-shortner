/**
 * src/routes/auth.ts
 * Authentication — register aur login.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Naya account banao
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: user@example.com }
 *               password: { type: string, example: securepassword123 }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:  { $ref: '#/components/schemas/User' }
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 */
router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });

    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info('User registered', { userId: user.id.toString() });
    return res.status(201).json({ message: 'Account created', token, user: { id: user.id.toString(), email: user.email } });
  } catch (err) {
    logger.error('Register error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login karke JWT token lo
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: user@example.com }
 *               password: { type: string, example: securepassword123 }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:  { $ref: '#/components/schemas/User' }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: { id: user.id.toString(), email: user.email } });
  } catch (err) {
    logger.error('Login error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
