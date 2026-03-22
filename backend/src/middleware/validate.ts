/**
 * src/middleware/validate.ts
 * 
 * Zod validation middleware.
 * Validates request body against Zod schema.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '../utils/logger';

/**
 * Validation middleware factory
 * Usage: router.post('/endpoint', validate(schema), handler)
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation failed', { errors, body: req.body });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      // Replace req.body with validated data (type-safe)
      req.body = result.data;
      next();
    } catch (err) {
      logger.error('Validation middleware error', { error: (err as Error).message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
