import { getRedisClient } from './redis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class RedisRateLimiter {
  private redis = getRedisClient();

  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      await this.redis.connect();
      
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const redisKey = `ratelimit:${key}`;

      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zcard(redisKey);
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const count = (results[1][1] as number) || 0;
      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count - 1);
      const resetTime = now + config.windowMs;

      return {
        allowed,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      };
    }
  }

  async clearRateLimit(key: string): Promise<void> {
    try {
      await this.redis.connect();
      await this.redis.del(`ratelimit:${key}`);
    } catch (error) {
      console.error('Clear rate limit error:', error);
    }
  }
}

export const rateLimiter = new RedisRateLimiter();

export const rateLimitConfigs = {
  otpSend: {
    windowMs: 60 * 1000,
    maxRequests: 3,
  },
  otpVerify: {
    windowMs: 5 * 60 * 1000,
    maxRequests: 5,
  },
  registration: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
};
