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
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const redisKey = `ratelimit:${key}`;

      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local max_requests = tonumber(ARGV[3])
        local ttl = tonumber(ARGV[4])
        
        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
        
        local count = redis.call('ZCARD', key)
        
        local allowed = 0
        local oldest_timestamp = now
        if count < max_requests then
          redis.call('ZADD', key, now, now .. '-' .. math.random())
          redis.call('EXPIRE', key, ttl)
          allowed = 1
          count = count + 1
        end
        
        local range = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        if #range > 0 then
          oldest_timestamp = tonumber(range[2])
        end
        
        return {allowed, count, oldest_timestamp}
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        redisKey,
        now.toString(),
        windowStart.toString(),
        config.maxRequests.toString(),
        Math.ceil(config.windowMs / 1000).toString()
      ) as [number, number, number];

      const [allowedFlag, count, oldestTimestamp] = result;
      const allowed = allowedFlag === 1;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = oldestTimestamp + config.windowMs;

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
