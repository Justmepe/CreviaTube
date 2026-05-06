import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../cache';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      keyGenerator: (req: Request) => req.ip || 'unknown',
      ...config,
    };
  }

  private generateKey(identifier: string): string {
    const now = Math.floor(Date.now() / this.config.windowMs);
    return `rate_limit:${identifier}:${now}`;
  }

  private async getCurrentCount(key: string): Promise<number> {
    const count = await cacheService.get(key);
    return count || 0;
  }

  private async incrementCount(key: string): Promise<number> {
    const count = await this.getCurrentCount(key);
    const newCount = count + 1;
    await cacheService.set(key, newCount, Math.ceil(this.config.windowMs / 1000));
    return newCount;
  }

  private getResetTime(): number {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    return windowStart + this.config.windowMs;
  }

  private setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
    res.set({
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': info.reset.toString(),
      'Retry-After': info.retryAfter.toString(),
    });
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = this.config.keyGenerator!(req);
        const key = this.generateKey(identifier);
        
        const currentCount = await this.incrementCount(key);
        const resetTime = this.getResetTime();
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        const info: RateLimitInfo = {
          limit: this.config.max,
          remaining: Math.max(0, this.config.max - currentCount),
          reset: resetTime,
          retryAfter: Math.max(0, retryAfter),
        };

        this.setRateLimitHeaders(res, info);

        if (currentCount > this.config.max) {
          return res.status(this.config.statusCode!).json({
            error: this.config.message,
            retryAfter: info.retryAfter,
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // If rate limiting fails, allow the request to proceed
        next();
      }
    };
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  }),

  // Standard rate limiting for API endpoints
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
  }),

  // Strict rate limiting for sensitive operations
  sensitive: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: 'Too many sensitive operations, please try again later.',
  }),

  // Rate limiting for tracking events
  tracking: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 tracking events per minute
    message: 'Too many tracking events, please slow down.',
  }),

  // Rate limiting for admin operations
  admin: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 admin requests per 15 minutes
    message: 'Too many admin operations, please try again later.',
  }),
};

// Rate limiting middleware factory
export function createRateLimiter(config: RateLimitConfig) {
  return new RateLimiter(config).middleware();
}

// Apply rate limiting based on route patterns
export function applyRateLimiting(app: any) {
  // Authentication routes
  app.use('/api/login', rateLimiters.auth.middleware());
  app.use('/api/register', rateLimiters.auth.middleware());
  app.use('/api/forgot-password', rateLimiters.auth.middleware());
  app.use('/api/reset-password', rateLimiters.auth.middleware());

  // Sensitive operations
  app.use('/api/user/password', rateLimiters.sensitive.middleware());
  app.use('/api/campaigns/:id/fund', rateLimiters.sensitive.middleware());
  app.use('/api/payouts', rateLimiters.sensitive.middleware());

  // Tracking events
  app.use('/api/tracking-events', rateLimiters.tracking.middleware());
  app.use('/api/tracking/record', rateLimiters.tracking.middleware());
  app.use('/api/tracking/view', rateLimiters.tracking.middleware());

  // Admin routes
  app.use('/api/admin', rateLimiters.admin.middleware());

  // General API routes
  app.use('/api', rateLimiters.api.middleware());
}
