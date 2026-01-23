import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ResponseUtil } from '../utils/response.util';

/**
 * Validation middleware factory using Zod schemas
 * @param schema Zod schema to validate against
 * @param source Where to validate: 'body', 'query', 'params'
 */
export const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        ResponseUtil.badRequest(res, 'Validation failed', errors);
        return;
      }
      
      ResponseUtil.badRequest(res, 'Invalid input');
    }
  };
};
