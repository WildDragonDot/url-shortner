/**
 * src/utils/logger.ts
 *
 * Winston logger — production-grade logging.
 *
 * Kyun Winston?
 *   - console.log production mein kaafi nahi — structured logs chahiye
 *   - Log levels: error > warn > info > debug
 *   - Production: JSON format (log aggregators ke liye — Datadog, CloudWatch)
 *   - Development: Colorized readable format
 *   - File logging: errors.log aur combined.log
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('DB error', { error: err.message });
 */

import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Development ke liye readable format
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Winston ke default levels mein 'http' nahi hota — add karo
const customLevels = {
  levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4 },
  colors: { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'white' },
};
winston.addColors(customLevels.colors);

const logger = winston.createLogger({
  levels: customLevels.levels,
  // Minimum log level — 'debug' se upar sab log honge
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Error stack traces capture karo
  format: combine(errors({ stack: true }), timestamp()),

  transports: [
    // Console output
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(timestamp(), json()) // Production: JSON (parseable by log tools)
          : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat), // Dev: readable
    }),

    // Error log file — sirf errors
    new winston.transports.File({
      filename: 'logs/errors.log',
      level:    'error',
      format:   combine(timestamp(), json()),
      maxsize:  10 * 1024 * 1024, // 10MB — rotate karo
      maxFiles: 5,
    }),

    // Combined log file — sab levels
    new winston.transports.File({
      filename: 'logs/combined.log',
      format:   combine(timestamp(), json()),
      maxsize:  50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    }),
  ],
});

export default logger;
