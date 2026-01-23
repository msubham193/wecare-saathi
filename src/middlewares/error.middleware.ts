import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { logger } from '../config/logger';

/**
 * Global error handler middleware
 * Must be registered as the last middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  // Handle Prisma errors
  if (error.code?.startsWith('P')) {
    handlePrismaError(error, res);
    return;
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    ResponseUtil.badRequest(res, error.message);
    return;
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    ResponseUtil.unauthorized(res, 'Invalid token');
    return;
  }
  
  if (error.name === 'TokenExpiredError') {
    ResponseUtil.unauthorized(res, 'Token expired');
    return;
  }
  
  // Default error response
  const statusCode = error.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error';
  
  ResponseUtil.error(res, message, statusCode);
};

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: any, res: Response): void {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      ResponseUtil.conflict(res, 'Record already exists');
      break;
    
    case 'P2025': // Record not found
      ResponseUtil.notFound(res, 'Record not found');
      break;
    
    case 'P2003': // Foreign key constraint failed
      ResponseUtil.badRequest(res, 'Related record not found');
      break;
    
    case 'P2014': // Invalid ID
      ResponseUtil.badRequest(res, 'Invalid ID provided');
      break;
    
    default:
      logger.error('Prisma error:', error);
      ResponseUtil.error(res, 'Database error occurred');
  }
}

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  ResponseUtil.notFound(res, `Route ${req.method} ${req.path} not found`);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
