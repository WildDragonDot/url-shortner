/**
 * src/middleware/auth.ts
 *
 * JWT + API Key authentication middleware — Prisma version.
 *
 * authMiddleware  → Optional auth (anonymous allowed)
 * requireAuth     → Mandatory auth (401 agar token nahi)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db/prisma';
import logger from '../utils/logger';

// Express Request type extend karo
declare global {
  namespace Express {
    interface Request {
      userId?: bigint;
    }
  }
}

/**
 * Optional auth middleware.
 * Valid token → req.userId set karo.
 * No/invalid token → silently continue (anonymous).
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];

  // ── API Key (sk_ prefix) ─────────────────────────────────
  if (token.startsWith('sk_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey  = await prisma.apiKey.findUnique({
        where: { keyHash },
        select: { userId: true, expiresAt: true },
      });

      if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
        req.userId = apiKey.userId;
        // last_used async update — no await
        prisma.apiKey.update({
          where: { keyHash },
          data:  { lastUsed: new Date() },
        }).catch(() => {});
      }
    } catch (err) {
      logger.error('API key verification error', { error: (err as Error).message });
    }
    return next();
  }

  // ── JWT Token ────────────────────────────────────────────
  try {
    const secret  = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as { userId: string | number };
    // userId can be string or number, convert to BigInt
    req.userId    = typeof payload.userId === 'string' 
      ? BigInt(payload.userId) 
      : BigInt(payload.userId);
  } catch (err) {
    // Invalid/expired — anonymous treat karo
    logger.debug('JWT verification failed', { error: (err as Error).message });
  }

  next();
}

/**
 * Required auth middleware.
 * 401 return karta hai agar user authenticated nahi hai.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
