import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { config } from '../config';
import { ResponseUtil } from '../utils/response.util';
import { ERROR_MESSAGES, CACHE_KEYS } from '../utils/constants';
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
    
    // Check if token is blacklisted (graceful - don't block auth if Redis is down)
    try {
      const isBlacklisted = await redis.exists(CACHE_KEYS.BLACKLISTED_TOKEN(token));
      if (isBlacklisted) {
        ResponseUtil.unauthorized(res, 'Token has been revoked');
        return;
      }
    } catch (redisError) {
      logger.warn('Redis unavailable for token blacklist check, skipping:', redisError);
    }
    
    // Verify JWT
    console.log('\n--- [AUTH DEBUG START] ---');
    console.log(`1. Token received (len: ${token.length}):`, token.substring(0, 15) + '...');
    const secret = config.jwt.secret as string;
    console.log(`2. Secret configured (len: ${secret?.length}):`, secret ? `${secret.substring(0, 3)}...` : 'MISSING');

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, secret) as JWTPayload;
      console.log('3. Token verified successfully. Payload:', JSON.stringify(decoded));
    } catch (verError: any) {
      console.error('!!! AUTH FAIL: Token verification failed:', verError.message);
      if (verError.name === 'JsonWebTokenError') {
        console.error('JsonWebTokenError details:', verError);
      }
      throw verError; // Re-throw to be caught by outer catch
    }
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        citizenProfile: true,
        officerProfile: true,
        adminProfile: true,
      },
    });
    
    console.log(`4. DB User lookup for ID ${decoded.userId}:`, user ? `Found (Role: ${user.role})` : 'NOT FOUND');

    if (user) {
        console.log(`5. User Active Status: ${user.isActive}`);
    }
    
    if (!user || !user.isActive) {
      console.log('!!! AUTH FAIL: User check failed - Not found or Inactive');
      ResponseUtil.unauthorized(res, 'User not found or inactive');
      return;
    }
    
    console.log('--- [AUTH DEBUG SUCCESS] ---\n');

    // Attach user to request
    req.user = user as any;
    
    next();
  } catch (error: any) {
    console.error('--- [AUTH DEBUG ERROR] ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);

    if (error.name === 'TokenExpiredError') {
      console.log('!!! AUTH FAIL: TokenExpiredError');
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
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret as string) as JWTPayload;
    
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
  // Ensure payload has clean values (no nulls)
  const cleanPayload = JSON.parse(JSON.stringify(payload));
  
  const accessToken = jwt.sign(cleanPayload, config.jwt.secret as string, {
    expiresIn: config.jwt.accessExpiry as any,
  });
  
  const refreshToken = jwt.sign(
    { userId: payload.userId },
    config.jwt.secret as string,
    { expiresIn: config.jwt.refreshExpiry as any }
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
