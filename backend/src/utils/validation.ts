/**
 * src/utils/validation.ts
 * 
 * Zod validation schemas for request validation.
 * Type-safe validation with automatic error messages.
 */

import { z } from 'zod';

// ─── AUTH SCHEMAS ────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email is too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
});

// ─── URL CREATION SCHEMAS ────────────────────────────────────────
export const createUrlSchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .url('Invalid URL format')
    .max(2048, 'URL is too long (max 2048 characters)'),
  alias: z.string()
    .min(3, 'Alias must be at least 3 characters')
    .max(16, 'Alias must be at most 16 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Alias can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  password: z.string()
    .min(4, 'Password must be at least 4 characters')
    .max(100, 'Password is too long')
    .optional(),
  expires_at: z.string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format')
    .refine((date) => new Date(date) > new Date(), 'Expiry date must be in the future')
    .optional(),
  utm: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional(),
  }).optional(),
});

export const bulkCreateSchema = z.object({
  urls: z.array(
    z.object({
      url: z.string().url('Invalid URL format'),
      alias: z.string()
        .min(3)
        .max(16)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
    })
  ).min(1, 'At least one URL is required')
    .max(100, 'Maximum 100 URLs allowed'),
});

// ─── URL UPDATE SCHEMA ───────────────────────────────────────────
export const updateUrlSchema = z.object({
  long_url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL is too long')
    .optional(),
  expires_at: z.string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format')
    .nullable()
    .optional(),
});

// ─── WEBHOOK SCHEMAS ─────────────────────────────────────────────
export const createWebhookSchema = z.object({
  endpoint: z.string()
    .url('Invalid webhook URL')
    .startsWith('https://', 'Webhook URL must use HTTPS'),
  short_url: z.string()
    .min(1)
    .max(16)
    .optional(),
  events: z.array(z.string()).optional(),
});

export const updateWebhookSchema = z.object({
  endpoint: z.string()
    .url('Invalid webhook URL')
    .startsWith('https://', 'Webhook URL must use HTTPS')
    .optional(),
  events: z.array(z.string()).optional(),
});

// ─── COLLECTION SCHEMAS ──────────────────────────────────────────
export const createCollectionSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Slug can only contain letters, numbers, hyphens, and underscores'),
  title: z.string()
    .max(100, 'Title is too long')
    .optional(),
  description: z.string()
    .max(500, 'Description is too long')
    .optional(),
  theme: z.string()
    .max(20)
    .optional(),
});

export const updateCollectionSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  theme: z.string().max(20).optional(),
});

export const addCollectionLinkSchema = z.object({
  short_url: z.string().min(1, 'Short URL is required'),
  label: z.string().max(100).optional(),
  position: z.number().int().min(0).optional(),
});

// ─── A/B TEST SCHEMA ─────────────────────────────────────────────
export const createAbTestSchema = z.object({
  variants: z.array(
    z.object({
      url: z.string().url('Invalid variant URL'),
      weight: z.number().int().min(1).max(100),
      label: z.string().max(50).optional(),
    })
  ).min(2, 'At least 2 variants required')
    .refine(
      (variants) => variants.reduce((sum, v) => sum + v.weight, 0) === 100,
      'Variant weights must sum to 100'
    ),
});

// ─── ROUTING RULE SCHEMA ─────────────────────────────────────────
export const createRoutingRuleSchema = z.object({
  rule_type: z.enum(['geo', 'device', 'os'], {
    message: 'Invalid rule type. Must be geo, device, or os',
  }),
  condition: z.string()
    .min(1, 'Condition is required')
    .max(50, 'Condition is too long'),
  target_url: z.string()
    .url('Invalid target URL'),
  priority: z.number().int().min(0).optional(),
});

// ─── API KEY SCHEMA ──────────────────────────────────────────────
export const createApiKeySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .optional(),
  expires_at: z.string()
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format')
    .refine((date) => new Date(date) > new Date(), 'Expiry date must be in the future')
    .optional(),
});

// ─── URL REPORT SCHEMA ───────────────────────────────────────────
export const reportUrlSchema = z.object({
  reason: z.enum(['phishing', 'spam', 'malware', 'adult_content', 'copyright', 'other'], {
    message: 'Invalid reason',
  }),
});

// ─── HELPER: Validate request body ──────────────────────────────
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
  return { success: false, errors };
}
