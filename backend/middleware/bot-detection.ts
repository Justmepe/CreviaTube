import { Request, Response, NextFunction } from "express";
import { antiBotService } from "../core/services/anti-bot-service";

interface DeviceFingerprint {
  userAgent: string;
  ip: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}

export interface BotDetectionRequest extends Request {
  deviceFingerprint?: DeviceFingerprint;
  botDetection?: {
    isBot: boolean;
    confidence: number;
    action: 'allow' | 'flag' | 'block';
  };
}

/**
 * Middleware to collect device fingerprint and detect bots
 */
export const collectDeviceFingerprint = (req: BotDetectionRequest, res: Response, next: NextFunction) => {
  // Extract device fingerprint from headers and query params
  const fingerprint: DeviceFingerprint = {
    userAgent: req.get('User-Agent') || '',
    ip: req.ip || req.connection.remoteAddress || '',
    screenResolution: req.get('X-Screen-Resolution'),
    timezone: req.get('X-Timezone'),
    language: req.get('Accept-Language'),
    platform: req.get('X-Platform'),
  };

  req.deviceFingerprint = fingerprint;
  next();
};

/**
 * Middleware to perform bot detection for tracking events
 */
export const detectBot = async (req: BotDetectionRequest, res: Response, next: NextFunction) => {
  try {
    const { clipperId, campaignId, eventType } = req.body;
    
    if (!req.deviceFingerprint) {
      console.warn('⚠️ Device fingerprint not collected, skipping bot detection');
      return next();
    }

    if (!clipperId || !campaignId || !eventType) {
      console.warn('⚠️ Missing required fields for bot detection');
      return next();
    }

    // Perform bot detection
    const result = await antiBotService.detectBot(
      clipperId,
      campaignId,
      eventType,
      req.deviceFingerprint,
      req.body.metadata
    );

    // Log the detection result
    await antiBotService.logBotDetection(
      clipperId,
      campaignId,
      result,
      req.deviceFingerprint
    );

    // Store result in request for later use
    req.botDetection = {
      isBot: result.isBot,
      confidence: result.confidence,
      action: result.action,
    };

    // Block suspicious requests
    if (result.action === 'block') {
      console.log(`🚫 Blocking bot request from ${req.deviceFingerprint.ip}`);
      return res.status(429).json({
        error: 'Request blocked due to suspicious activity',
        message: 'Your request has been flagged as potentially automated. Please try again later.',
      });
    }

    // Flag suspicious requests but allow them through
    if (result.action === 'flag') {
      console.log(`⚠️ Flagging suspicious request from ${req.deviceFingerprint.ip}`);
    }

    next();
  } catch (error) {
    console.error('Bot detection error:', error);
    // Don't block on detection errors, just log and continue
    next();
  }
};

/**
 * Rate limiting middleware for high-frequency endpoints
 */
export const rateLimit = (windowMs: number = 60000, maxRequests: number = 60) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: BotDetectionRequest, res: Response, next: NextFunction) => {
    const ip = req.deviceFingerprint?.ip || req.ip || '';
    const now = Date.now();
    
    // Clean up expired entries
    Array.from(requests.entries()).forEach(([key, value]) => {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    });

    // Check current IP
    const current = requests.get(ip);
    if (!current) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > current.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      console.log(`🚫 Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      });
    }

    current.count++;
    next();
  };
};

/**
 * CAPTCHA verification middleware (placeholder for future implementation)
 */
export const verifyCaptcha = async (req: BotDetectionRequest, res: Response, next: NextFunction) => {
  const captchaToken = req.body.captchaToken || req.get('X-Captcha-Token');
  
  // If bot detection flagged this request and no captcha provided
  if (req.botDetection?.action === 'flag' && !captchaToken) {
    return res.status(400).json({
      error: 'Captcha verification required',
      message: 'Please complete the security verification to continue.',
      requiresCaptcha: true,
    });
  }

  // TODO: Implement actual CAPTCHA verification
  // For now, just check if token exists
  if (captchaToken) {
    console.log(`✅ CAPTCHA token provided: ${captchaToken.substring(0, 10)}...`);
  }

  next();
};