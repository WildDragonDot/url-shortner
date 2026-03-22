/**
 * src/server.ts
 *
 * Server entry point — production-grade startup.
 *
 * Features:
 *   - DB connection verify karo pehle
 *   - Graceful shutdown (SIGTERM/SIGINT) — in-flight requests complete hone do
 *   - Uncaught exception handling — crash se pehle log karo
 *
 * Run:
 *   Development: npm run dev
 *   Production:  npm run build && npm start
 */

import app from './app';
import prisma from './db/prisma';
import logger from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');

async function startServer() {
  try {
    // ── DB connection verify ─────────────────────────────────
    await prisma.$connect();
    logger.info('✅ Database connected via Prisma');

    // ── HTTP server start ────────────────────────────────────
    const server = app.listen(PORT, () => {
      logger.info(`🚀 URL Shortener running`, {
        port:     PORT,
        env:      process.env.NODE_ENV || 'development',
        base_url: process.env.BASE_URL || `http://localhost:${PORT}`,
        docs:     `http://localhost:${PORT}/api-docs`,
      });
    });

    // ── Graceful shutdown ────────────────────────────────────
    // SIGTERM: Docker/Kubernetes container stop karta hai
    // SIGINT:  Ctrl+C se stop karte hain
    // Graceful shutdown: naye requests accept karna band karo,
    // existing requests complete hone do, phir DB disconnect karo.
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — graceful shutdown starting`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      });

      // 10 seconds ke baad force exit (stuck requests ke liye)
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // ── Uncaught exception handling ──────────────────────────
    // Crash se pehle log karo — debugging ke liye
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', { reason });
    });

  } catch (err) {
    logger.error('❌ Failed to start server', { error: (err as Error).message });
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
 
