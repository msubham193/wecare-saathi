import Redis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

const redis = new Redis(config.redis.url, {
  password: config.redis.password || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Helper functions for common operations
export const redisHelpers = {
  // Set with expiry
  setex: async (key: string, value: string, expirySeconds: number) => {
    return redis.setex(key, expirySeconds, value);
  },
  
  // Get value
  get: async (key: string) => {
    return redis.get(key);
  },
  
  // Delete key
  del: async (key: string) => {
    return redis.del(key);
  },
  
  // Check if key exists
  exists: async (key: string) => {
    return redis.exists(key);
  },
  
  // Increment counter with expiry
  incrWithExpiry: async (key: string, expirySeconds: number) => {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, expirySeconds);
    const results = await multi.exec();
    return results ? results[0][1] as number : 0;
  },
  
  // Get time to live (TTL) in seconds
  ttl: async (key: string) => {
    return redis.ttl(key);
  },
};

export default redis;
