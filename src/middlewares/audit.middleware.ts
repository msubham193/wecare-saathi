import { NextFunction, Response } from 'express';
import { AuthRequest, AuditLogData } from '../types';
import prisma from '../config/database';
import { logger } from '../config/logger';

/**
 * Audit logging middleware
 * Logs critical actions to the database
 */
export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Store original end function
      const originalEnd = res.end;
      
      // Override end to log after response
      res.end = function(this: Response, ...args: any[]): any {
        // Only log successful responses
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const auditData: AuditLogData = {
            userId: req.user.id,
            action,
            resource,
            resourceId: req.params.id || req.body?.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              method: req.method,
              path: req.path,
              params: req.params,
              query: req.query,
              statusCode: res.statusCode,
            },
          };
          
          // Log asynchronously without blocking
          prisma.auditLog
            .create({ data: auditData })
            .catch(error => logger.error('Audit log failed:', error));
        }
        
        // Call original end
        return originalEnd.apply(this, args);
      };
      
      next();
    } catch (error) {
      // Don't fail request if audit logging fails
      logger.error('Audit middleware error:', error);
      next();
    }
  };
};
