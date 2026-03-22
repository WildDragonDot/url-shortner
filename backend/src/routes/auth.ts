/**
 * src/routes/auth.ts
 * Authentication — register aur login.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { authLimiter } from '../middleware/rateLimit';
import { authMiddleware, requireAuth } from '../middleware/auth';
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

/**
 * POST /auth/logout
 * Client-side token clear karo (stateless JWT — server pe invalidate nahi hota)
 */
router.post('/logout', (req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});

/**
 * POST /auth/forgot-password
 * Password reset token generate karo
 */
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Security: same response whether user exists or not
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetTokenHash, resetTokenExpiresAt: expiresAt },
    });

    // In production: send email with reset link
    // For now: return token in response (dev only)
    const isDev = process.env.NODE_ENV !== 'production';
    logger.info('Password reset requested', { email });

    return res.json({
      message: 'If that email exists, a reset link has been sent.',
      ...(isDev && { reset_token: resetToken, note: 'Dev only — remove in production' }),
    });
  } catch (err) {
    logger.error('Forgot password error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/reset-password
 * Token verify karke password update karo
 */
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    logger.info('Password reset successful', { userId: user.id.toString() });
    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    logger.error('Reset password error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /auth/account
 * Account aur saara data delete karo
 */
router.delete('/account', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.userId! } });
    logger.info('Account deleted', { userId: req.userId!.toString() });
    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    logger.error('Account delete error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
