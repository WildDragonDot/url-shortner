/**
 * src/db/prisma.ts
 *
 * Prisma Client singleton.
 *
 * Kyun singleton?
 *   Development mein hot-reload pe baar baar naye connections bante hain.
 *   Singleton pattern ensure karta hai ki ek hi PrismaClient instance ho.
 *   Production mein bhi connection pool efficiently manage hota hai.
 *
 * Usage (kisi bhi file mein):
 *   import prisma from '../db/prisma';
 *   const url = await prisma.url.findUnique({ where: { shortUrl: 'abc1234' } });
 */

import { PrismaClient } from '@prisma/client';

// Global type extend karo — TypeScript ko batao ki global mein prisma ho sakta hai
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * PrismaClient instance.
 *
 * Development: global variable mein store karo (hot-reload pe reuse hoga)
 * Production: fresh instance (global variable nahi chahiye)
 *
 * Logging:
 *   - 'query'  → Har SQL query log hogi (dev mein useful, prod mein off)
 *   - 'error'  → DB errors hamesha log honge
 *   - 'warn'   → Warnings log honge
 */
const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Development mein global mein store karo
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
