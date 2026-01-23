import { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { redisHelpers } from '../config/redis';
import { ResponseUtil } from '../utils/response.util';
import { ERROR_MESSAGES, RATE_LIMIT_KEYS } from '../utils/constants';
import { AuthRequest } from '../types';

/**
 * Global rate limiter (100 requests per 15 minutes)
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.globalPer15Min,
  message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Login rate limiter (5 requests per minute per IP)
 */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.loginPerMinute,
  message: 'Too many login attempts. Please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * SOS creation rate limiter (3 per hour per user)
 * Uses Redis for distributed rate limiting
 */
export const sosRateLimiter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      ResponseUtil.unauthorized(res);
      return;
    }
    
    const key = RATE_LIMIT_KEYS.SOS_CREATION(req.user.id);
    const count = await redisHelpers.incrWithExpiry(key, 3600); // 1 hour
    
    if (count > config.rateLimit.sosPerHour) {
      ResponseUtil.tooManyRequests(
        res,
        ERROR_MESSAGES.SOS_SPAM_DETECTED
      );
      return;
    }
    
    next();
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    next();
  }
};

/**
 * Generic Redis-based rate limiter factory
 * @param keyPrefix Prefix for Redis key
 * @param maxRequests Maximum number of requests
 * @param windowSeconds Time window in seconds
 */
export const createRateLimiter = (
  keyPrefix: string,
  maxRequests: number,
  windowSeconds: number
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const identifier = req.user?.id || req.ip;
      const key = `${keyPrefix}:${identifier}`;
      
      const count = await redisHelpers.incrWithExpiry(key, windowSeconds);
      
      if (count > maxRequests) {
        ResponseUtil.tooManyRequests(res, ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
        return;
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + windowSeconds * 1000).toString());
      
      next();
    } catch (error) {
      // Fail open if Redis is down
      next();
    }
  };
};
