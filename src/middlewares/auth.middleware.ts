import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { config } from '../config';
import { ResponseUtil } from '../utils/response.util';
import { ERROR_MESSAGES, CACHE_KEYS } from '../utils/constants';
import { verifyFirebaseToken } from '../config/firebase';
import prisma from '../config/database';
import redis from '../config/redis';
import { logger } from '../config/logger';
import { UserRole } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  firebaseUid?: string;
  role: UserRole;
  email?: string;
}

/**
 * Verify JWT token middleware
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }
    
    const token = authHeader.substring(7);
    
    // Check if token is blacklisted
    const isBlacklisted = await redis.exists(CACHE_KEYS.BLACKLISTED_TOKEN(token));
    if (isBlacklisted) {
      ResponseUtil.unauthorized(res, 'Token has been revoked');
      return;
    }
    
    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
        adminProfile: true,
      },
    });
    
    if (!user || !user.isActive) {
      ResponseUtil.unauthorized(res, 'User not found or inactive');
      return;
    }
    
    // Attach user to request
    req.user = user as any;
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      ResponseUtil.unauthorized(res, 'Token expired');
      return;
    }
    
    logger.error('Authentication error:', error);
    ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
        adminProfile: true,
      },
    });
    
    if (user && user.isActive) {
      req.user = user as any;
    }
    
    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
};

/**
 * Generate JWT tokens
 */
export const generateTokens = (payload: JWTPayload) => {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry,
  });
  
  const refreshToken = jwt.sign(
    { userId: payload.userId },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiry }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Blacklist token (for logout)
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(CACHE_KEYS.BLACKLISTED_TOKEN(token), ttl, '1');
      }
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
  }
};
