/**
 * src/db/postgres.ts
 *
 * PostgreSQL connection pool setup.
 *
 * Hum "pg" library ka Pool use karte hain — iska matlab ek baar mein
 * multiple DB connections open rehte hain (default: 10).
 * Har request ke liye naya connection nahi banana padta — fast hota hai.
 *
 * Usage (kisi bhi file mein):
 *   import pool from '../db/postgres';
 *   const result = await pool.query('SELECT * FROM urls WHERE short_url = $1', [code]);
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

// .env file se environment variables load karo
dotenv.config();

/**
 * PostgreSQL connection pool.
 * .env se config read karta hai — credentials code mein hardcode mat karo.
 */
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'url_shortener',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Connection pool size — ek saath max 10 queries parallel chalenge
  max: 10,
  // Idle connection kitni der baad close ho (30 seconds)
  idleTimeoutMillis: 30000,
  // Connection timeout (2 seconds)
  connectionTimeoutMillis: 2000,
});

/**
 * DB connection test karo server start hone pe.
 * Agar DB connect nahi hua toh early fail karo — baad mein confusing errors se bachao.
 */
pool.on('connect', () => {
  logger.info('PostgreSQL connected');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { error: err.message });
});

export default pool;
