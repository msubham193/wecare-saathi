import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ResponseUtil } from '../utils/response.util';
import { ERROR_MESSAGES } from '../utils/constants';
import { UserRole } from '@prisma/client';

/**
 * Role-based access control middleware factory
 * @param roles Allowed roles for this endpoint
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      ResponseUtil.forbidden(res, ERROR_MESSAGES.FORBIDDEN);
      return;
    }
    
    next();
  };
};

/**
 * Require CITIZEN role
 */
export const requireCitizen = requireRole(UserRole.CITIZEN);

/**
 * Require OFFICER role
 */
export const requireOfficer = requireRole(UserRole.OFFICER);

/**
 * Require ADMIN role
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Require OFFICER or ADMIN role
 */
export const requireOfficerOrAdmin = requireRole(UserRole.OFFICER, UserRole.ADMIN);

/**
 * Check if user owns a resource
 * @param getOwnerId Function that extracts owner ID from request
 */
export const requireOwnership = (getOwnerId: (req: AuthRequest) => string | Promise<string>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
        return;
      }
      
      // Admins can access everything
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }
      
      const ownerId = await getOwnerId(req);
      
      if (req.user.id !== ownerId) {
        ResponseUtil.forbidden(res, 'You do not have access to this resource');
        return;
      }
      
      next();
    } catch (error) {
      ResponseUtil.forbidden(res, ERROR_MESSAGES.FORBIDDEN);
    }
  };
};
