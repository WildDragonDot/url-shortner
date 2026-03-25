/**
 * src/middleware/rateLimit.ts
 *
 * Rate limiting middleware — express-rate-limit use karta hai.
 *
 * Kyun zaroori hai?
 *   Bina rate limit ke koi bot 1 second mein lakhs URLs create kar sakta hai.
 *   DDoS attacks se bachao.
 *   Spam se bachao.
 *
 * Different limits:
 *   - URL create (anonymous): 5/day — strict daily limit
 *   - URL create (logged-in): 100/minute — relaxed
 *   - Redirect: 60/minute per IP — DDoS protection
 *   - Auth endpoints: 5/minute — brute force protection
 */

import rateLimit from 'express-rate-limit';

/**
 * Anonymous users ke liye URL creation limit.
 * 5 URLs per day per IP.
 */
export const anonymousCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours window
  max:      5,                    // max 5 requests per day
  message:  { error: 'Daily limit reached! Sign up for unlimited URLs. You can create 5 URLs per day as a guest.' },
  // Response headers mein limit info bhejo
  standardHeaders: true,  // X-RateLimit-* headers
  legacyHeaders:   false,
  skipSuccessfulRequests: false, // Count all requests, even successful ones
});

/**
 * Authenticated users ke liye URL creation limit.
 * 100 URLs per minute per user.
 */
export const authCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { error: 'Rate limit exceeded. Max 100 URLs per minute.' },
  standardHeaders: true,
  legacyHeaders:   false,
  // User ID se limit karo (IP se nahi — multiple users same IP share kar sakte hain)
  keyGenerator: (req) => String((req as any).userId || req.ip),
});

/**
 * Redirect endpoint ke liye limit.
 * 120 redirects per minute per IP — DDoS protection.
 * trust proxy enabled hone pe real IP use hoga.
 */
export const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      120,
  message:  { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => {
    // X-Forwarded-For se real IP lo (Render/Vercel proxy ke liye)
    const forwarded = req.headers['x-forwarded-for'] as string;
    return forwarded ? forwarded.split(',')[0].trim() : (req.ip || 'unknown');
  },
});

/**
 * Auth endpoints ke liye strict limit.
 * 5 attempts per minute — brute force password attacks se bachao.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      5,
  message:  { error: 'Too many login attempts. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

/**
 * Password unlock ke liye strict limit.
 * 5 attempts per 15 minutes per IP — brute force se bachao.
 */
export const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  { error: 'Too many unlock attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

/**
 * URL report ke liye limit.
 * 10 reports per hour per IP — spam reports se bachao.
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      10,
  message:  { error: 'Too many reports. Please wait an hour.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
