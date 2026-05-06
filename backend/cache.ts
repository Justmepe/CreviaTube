import Redis from 'ioredis';

// Redis client configuration - only create if REDIS_HOST is provided
let redis: Redis | null = null;
let redisDisabled = false;

if (process.env.REDIS_HOST) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1, // Reduced retries to fail faster
      connectTimeout: 2000, // 2 second timeout
      retryStrategy: () => null, // Disable automatic reconnection
      showFriendlyErrorStack: false,
    });

    redis.on('error', (err) => {
      // Silently handle connection errors - only log once
      if (!redisDisabled && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        redisDisabled = true;
        console.warn('⚠️  Redis unavailable - running without cache');
        // Don't disconnect, just mark as disabled - the cache methods will handle null checks
      }
    });

    redis.on('connect', () => {
      // Reset disabled flag if connection succeeds
      if (redisDisabled) {
        redisDisabled = false;
        console.log('✅ Redis reconnected');
      }
    });
  } catch (error) {
    console.warn('⚠️  Redis initialization failed - running without cache');
    redis = null;
    redisDisabled = true;
  }
}

// Cache configuration
const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  CAMPAIGN_DATA: 600, // 10 minutes
  ANALYTICS: 1800, // 30 minutes
  CLIPPER_STATS: 900, // 15 minutes
  BROKER_LINKS: 1200, // 20 minutes
};

export class CacheService {
  private redis: Redis | null;

  constructor() {
    this.redis = redisDisabled ? null : redis;
  }

  // Check if Redis is available and connected
  private isRedisAvailable(): boolean {
    if (!this.redis || redisDisabled) return false;
    try {
      return this.redis.status === 'ready';
    } catch {
      return false;
    }
  }

  // Generate cache keys
  private generateKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  // Set cache with TTL
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!this.isRedisAvailable()) return;
    try {
      await this.redis!.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      // Silently fail - Redis might have disconnected
      // Don't log every error to avoid spam
    }
  }

  // Get cache value
  async get(key: string): Promise<any | null> {
    if (!this.isRedisAvailable()) return null;
    try {
      const value = await this.redis!.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      // Silently fail - Redis might have disconnected
      return null;
    }
  }

  // Delete cache key
  async delete(key: string): Promise<void> {
    if (!this.isRedisAvailable()) return;
    try {
      await this.redis!.del(key);
    } catch (error) {
      // Silently fail - Redis might have disconnected
    }
  }

  // Delete multiple cache keys by pattern
  async deletePattern(pattern: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  // User profile caching
  async getUserProfile(userId: string): Promise<any | null> {
    const key = this.generateKey('user:profile', userId);
    return await this.get(key);
  }

  async setUserProfile(userId: string, profile: any): Promise<void> {
    const key = this.generateKey('user:profile', userId);
    await this.set(key, profile, CACHE_TTL.USER_PROFILE);
  }

  async invalidateUserProfile(userId: string): Promise<void> {
    const key = this.generateKey('user:profile', userId);
    await this.delete(key);
  }

  // Campaign data caching
  async getCampaign(campaignId: string): Promise<any | null> {
    const key = this.generateKey('campaign', campaignId);
    return await this.get(key);
  }

  async setCampaign(campaignId: string, campaign: any): Promise<void> {
    const key = this.generateKey('campaign', campaignId);
    await this.set(key, campaign, CACHE_TTL.CAMPAIGN_DATA);
  }

  async getCampaignsByCreator(creatorId: string): Promise<any | null> {
    const key = this.generateKey('campaigns:creator', creatorId);
    return await this.get(key);
  }

  async setCampaignsByCreator(creatorId: string, campaigns: any): Promise<void> {
    const key = this.generateKey('campaigns:creator', creatorId);
    await this.set(key, campaigns, CACHE_TTL.CAMPAIGN_DATA);
  }

  async invalidateCampaigns(creatorId?: string): Promise<void> {
    if (creatorId) {
      const key = this.generateKey('campaigns:creator', creatorId);
      await this.delete(key);
    } else {
      await this.deletePattern('campaigns:*');
    }
  }

  // Analytics caching
  async getAnalytics(userId: string, type: string): Promise<any | null> {
    const key = this.generateKey(`analytics:${type}`, userId);
    return await this.get(key);
  }

  async setAnalytics(userId: string, type: string, data: any): Promise<void> {
    const key = this.generateKey(`analytics:${type}`, userId);
    await this.set(key, data, CACHE_TTL.ANALYTICS);
  }

  // Clipper stats caching
  async getClipperStats(clipperId: string): Promise<any | null> {
    const key = this.generateKey('clipper:stats', clipperId);
    return await this.get(key);
  }

  async setClipperStats(clipperId: string, stats: any): Promise<void> {
    const key = this.generateKey('clipper:stats', clipperId);
    await this.set(key, stats, CACHE_TTL.CLIPPER_STATS);
  }

  async getTopClippers(): Promise<any | null> {
    const key = 'clippers:top';
    return await this.get(key);
  }

  async setTopClippers(clippers: any): Promise<void> {
    const key = 'clippers:top';
    await this.set(key, clippers, CACHE_TTL.CLIPPER_STATS);
  }

  // Broker links caching
  async getBrokerLinks(userId: string): Promise<any | null> {
    const key = this.generateKey('broker:links', userId);
    return await this.get(key);
  }

  async setBrokerLinks(userId: string, links: any): Promise<void> {
    const key = this.generateKey('broker:links', userId);
    await this.set(key, links, CACHE_TTL.BROKER_LINKS);
  }

  async invalidateBrokerLinks(userId: string): Promise<void> {
    const key = this.generateKey('broker:links', userId);
    await this.delete(key);
  }

  // Admin data caching
  async getAdminWithdrawals(): Promise<any | null> {
    const key = 'admin:withdrawals';
    return await this.get(key);
  }

  async setAdminWithdrawals(withdrawals: any): Promise<void> {
    const key = 'admin:withdrawals';
    await this.set(key, withdrawals, CACHE_TTL.ANALYTICS);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    if (!this.isRedisAvailable()) return false;
    try {
      await this.redis!.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Clear all cache
  async clearAll(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    if (!this.isRedisAvailable()) return { error: 'Redis not available' };
    try {
      const info = await this.redis!.info();
      const keys = await this.redis!.dbsize();
      return { info, keys };
    } catch (error) {
      return { error: 'Redis not available' };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache middleware for Express
export function cacheMiddleware(ttl: number = 300) {
  return async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `api:${req.originalUrl}`;
    
    try {
      const cached = await cacheService.get(key);
      if (cached) {
        return res.json(cached);
      }
    } catch (error) {
      console.error('Cache middleware error:', error);
    }

    // Store original send method
    const originalSend = res.json;
    
    // Override send method to cache response
    res.json = function(data: any) {
      cacheService.set(key, data, ttl).catch(console.error);
      return originalSend.call(this, data);
    };

    next();
  };
}
