import { db } from "../../db";
import { trackingEvents, users } from "../../../shared/schema.js";
import { eq, and, gte, count, desc } from "drizzle-orm";

interface BotDetectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
  action: 'allow' | 'flag' | 'block';
}

interface DeviceFingerprint {
  userAgent: string;
  ip: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}

export class AntiBotService {
  private readonly MAX_CLICKS_PER_MINUTE = 10;
  private readonly MAX_CLICKS_PER_HOUR = 100;
  private readonly MAX_CLICKS_PER_DAY = 500;
  private readonly SUSPICIOUS_PATTERNS_THRESHOLD = 3;
  private readonly BOT_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Main bot detection method - analyzes multiple signals
   */
  async detectBot(
    clipperId: string,
    campaignId: string,
    eventType: string,
    fingerprint: DeviceFingerprint,
    metadata?: any
  ): Promise<BotDetectionResult> {
    const checks = await Promise.all([
      this.checkRateLimit(clipperId, campaignId, eventType),
      this.checkDeviceFingerprint(fingerprint),
      this.checkBehaviorPatterns(clipperId, campaignId),
      this.checkIPReputation(fingerprint.ip),
      this.checkUserAgentPatterns(fingerprint.userAgent),
      this.checkTimingPatterns(clipperId, campaignId),
      this.checkGeolocationConsistency(clipperId, fingerprint.ip),
    ]);

    const suspiciousChecks = checks.filter(check => check.suspicious);
    const confidence = this.calculateConfidence(suspiciousChecks, checks.length);
    const reasons = suspiciousChecks.map(check => check.reason);

    let action: 'allow' | 'flag' | 'block' = 'allow';
    if (confidence >= this.BOT_CONFIDENCE_THRESHOLD) {
      action = 'block';
    } else if (confidence >= 0.4) {
      action = 'flag';
    }

    return {
      isBot: confidence >= this.BOT_CONFIDENCE_THRESHOLD,
      confidence,
      reasons,
      action
    };
  }

  /**
   * Check if clipper is exceeding rate limits
   */
  private async checkRateLimit(clipperId: string, campaignId: string, eventType: string) {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      db
        .select({ count: count() })
        .from(trackingEvents)
        .where(
          and(
            eq(trackingEvents.clipperId, clipperId),
            eq(trackingEvents.campaignId, campaignId),
            gte(trackingEvents.createdAt, oneMinuteAgo)
          )
        ),
      db
        .select({ count: count() })
        .from(trackingEvents)
        .where(
          and(
            eq(trackingEvents.clipperId, clipperId),
            eq(trackingEvents.campaignId, campaignId),
            gte(trackingEvents.createdAt, oneHourAgo)
          )
        ),
      db
        .select({ count: count() })
        .from(trackingEvents)
        .where(
          and(
            eq(trackingEvents.clipperId, clipperId),
            eq(trackingEvents.campaignId, campaignId),
            gte(trackingEvents.createdAt, oneDayAgo)
          )
        ),
    ]);

    const minute = minuteCount[0]?.count || 0;
    const hour = hourCount[0]?.count || 0;
    const day = dayCount[0]?.count || 0;

    const suspicious = 
      minute > this.MAX_CLICKS_PER_MINUTE ||
      hour > this.MAX_CLICKS_PER_HOUR ||
      day > this.MAX_CLICKS_PER_DAY;

    return {
      suspicious,
      reason: suspicious 
        ? `Rate limit exceeded: ${minute}/min, ${hour}/hour, ${day}/day`
        : '',
      severity: suspicious ? 'high' : 'low'
    };
  }

  /**
   * Analyze device fingerprint for bot characteristics
   */
  private async checkDeviceFingerprint(fingerprint: DeviceFingerprint) {
    const suspiciousIndicators: string[] = [];

    // Check for headless browser indicators
    if (this.isHeadlessBrowser(fingerprint.userAgent)) {
      suspiciousIndicators.push('Headless browser detected');
    }

    // Check for automated tools
    if (this.isAutomatedTool(fingerprint.userAgent)) {
      suspiciousIndicators.push('Automated tool detected');
    }

    // Check for missing or unusual properties
    if (!fingerprint.screenResolution) {
      suspiciousIndicators.push('Missing screen resolution');
    }

    if (!fingerprint.timezone) {
      suspiciousIndicators.push('Missing timezone information');
    }

    // Check for common bot patterns
    if (fingerprint.userAgent.includes('bot') || 
        fingerprint.userAgent.includes('crawler') ||
        fingerprint.userAgent.includes('spider')) {
      suspiciousIndicators.push('Bot-like user agent');
    }

    return {
      suspicious: suspiciousIndicators.length > 0,
      reason: suspiciousIndicators.join(', '),
      severity: suspiciousIndicators.length > 2 ? 'high' : 'medium'
    };
  }

  /**
   * Check for suspicious behavior patterns
   */
  private async checkBehaviorPatterns(clipperId: string, campaignId: string) {
    const recentEvents = await db
      .select()
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.clipperId, clipperId),
          eq(trackingEvents.campaignId, campaignId),
          gte(trackingEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(trackingEvents.createdAt))
      .limit(100);

    const suspiciousPatterns: string[] = [];

    // Check for perfectly regular intervals (inhuman)
    const intervals = this.calculateIntervals(recentEvents.map(e => e.createdAt));
    if (this.hasRegularIntervals(intervals)) {
      suspiciousPatterns.push('Perfectly regular click intervals');
    }

    // Check for identical metadata patterns
    const metadataGroups = this.groupByMetadata(recentEvents);
    if (this.hasIdenticalMetadata(metadataGroups)) {
      suspiciousPatterns.push('Identical metadata patterns');
    }

    // Check for burst patterns followed by complete silence
    if (this.hasBurstPatterns(recentEvents)) {
      suspiciousPatterns.push('Burst activity patterns');
    }

    return {
      suspicious: suspiciousPatterns.length >= this.SUSPICIOUS_PATTERNS_THRESHOLD,
      reason: suspiciousPatterns.join(', '),
      severity: suspiciousPatterns.length > 3 ? 'high' : 'medium'
    };
  }

  /**
   * Check IP reputation against known bot networks
   */
  private async checkIPReputation(ip: string) {
    // Check for common bot IP patterns
    const suspiciousIPs = [
      /^10\./, // Internal networks being used externally
      /^172\./, // Private IP ranges
      /^192\.168\./, // Local networks
      /^127\./, // Localhost
    ];

    const isPrivateIP = suspiciousIPs.some(pattern => pattern.test(ip));
    
    // Check for data center IPs (simplified check)
    const isDataCenter = this.isDataCenterIP(ip);

    // Check for VPN/Proxy indicators
    const isVPN = await this.checkVPNProxy(ip);

    const suspicious = isPrivateIP || isDataCenter || isVPN;

    return {
      suspicious,
      reason: suspicious 
        ? `Suspicious IP: ${isPrivateIP ? 'Private' : ''} ${isDataCenter ? 'DataCenter' : ''} ${isVPN ? 'VPN/Proxy' : ''}`
        : '',
      severity: suspicious ? 'medium' : 'low'
    };
  }

  /**
   * Analyze user agent for bot patterns
   */
  private async checkUserAgentPatterns(userAgent: string) {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /automated/i,
      /selenium/i,
      /phantomjs/i,
      /headless/i,
      /puppeteer/i,
      /playwright/i,
    ];

    const isBotUA = botPatterns.some(pattern => pattern.test(userAgent));
    
    // Check for missing or unusual user agent
    const isEmptyUA = !userAgent || userAgent.trim().length === 0;
    const isUnusualUA = userAgent.length < 10 || userAgent.length > 500;

    const suspicious = isBotUA || isEmptyUA || isUnusualUA;

    return {
      suspicious,
      reason: suspicious 
        ? `Suspicious user agent: ${isBotUA ? 'Bot-like' : ''} ${isEmptyUA ? 'Empty' : ''} ${isUnusualUA ? 'Unusual length' : ''}`
        : '',
      severity: isBotUA ? 'high' : 'medium'
    };
  }

  /**
   * Check for inhuman timing patterns
   */
  private async checkTimingPatterns(clipperId: string, campaignId: string) {
    const recentEvents = await db
      .select()
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.clipperId, clipperId),
          eq(trackingEvents.campaignId, campaignId),
          gte(trackingEvents.createdAt, new Date(Date.now() - 60 * 60 * 1000))
        )
      )
      .orderBy(desc(trackingEvents.createdAt))
      .limit(50);

    if (recentEvents.length < 5) {
      return { suspicious: false, reason: '', severity: 'low' as const };
    }

    const intervals = this.calculateIntervals(recentEvents.map(e => e.createdAt));
    
    // Check for too-fast clicks (< 100ms)
    const tooFast = intervals.some(interval => interval < 100);
    
    // Check for perfectly regular intervals
    const tooRegular = this.hasRegularIntervals(intervals);
    
    // Check for non-human patterns (e.g., no variation in timing)
    const variance = this.calculateVariance(intervals);
    const lowVariance = variance < 10; // Very low variance suggests automation

    const suspicious = tooFast || tooRegular || lowVariance;

    return {
      suspicious,
      reason: suspicious 
        ? `Inhuman timing: ${tooFast ? 'Too fast' : ''} ${tooRegular ? 'Too regular' : ''} ${lowVariance ? 'Low variance' : ''}`
        : '',
      severity: tooFast ? 'high' : 'medium'
    };
  }

  /**
   * Check for geolocation consistency
   */
  private async checkGeolocationConsistency(clipperId: string, currentIP: string) {
    // Get recent IPs for this clipper
    const recentEvents = await db
      .select()
      .from(trackingEvents)
      .where(
        and(
          eq(trackingEvents.clipperId, clipperId),
          gte(trackingEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .limit(20);

    const uniqueIPs = Array.from(new Set(recentEvents.map(e => {
      try {
        const metadata = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
        return metadata?.ip;
      } catch {
        return null;
      }
    }).filter(Boolean)));
    
    // Check for too many different IPs in short time
    const tooManyIPs = uniqueIPs.length > 5;
    
    // Check for rapid location changes (simplified)
    const rapidLocationChange = this.hasRapidLocationChanges(uniqueIPs);

    const suspicious = tooManyIPs || rapidLocationChange;

    return {
      suspicious,
      reason: suspicious 
        ? `Geolocation inconsistency: ${tooManyIPs ? 'Too many IPs' : ''} ${rapidLocationChange ? 'Rapid location changes' : ''}`
        : '',
      severity: suspicious ? 'medium' : 'low'
    };
  }

  /**
   * Helper methods
   */
  private isHeadlessBrowser(userAgent: string): boolean {
    const headlessPatterns = [
      /headless/i,
      /phantomjs/i,
      /puppeteer/i,
      /playwright/i,
      /selenium/i,
    ];
    return headlessPatterns.some(pattern => pattern.test(userAgent));
  }

  private isAutomatedTool(userAgent: string): boolean {
    const automationPatterns = [
      /curl/i,
      /wget/i,
      /python-requests/i,
      /node-fetch/i,
      /axios/i,
    ];
    return automationPatterns.some(pattern => pattern.test(userAgent));
  }

  private calculateIntervals(timestamps: Date[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i-1].getTime() - timestamps[i].getTime());
    }
    return intervals;
  }

  private hasRegularIntervals(intervals: number[]): boolean {
    if (intervals.length < 3) return false;
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const tolerance = avgInterval * 0.1; // 10% tolerance
    
    return intervals.every(interval => 
      Math.abs(interval - avgInterval) < tolerance
    );
  }

  private groupByMetadata(events: any[]): { [key: string]: number } {
    const groups: { [key: string]: number } = {};
    events.forEach(event => {
      const key = JSON.stringify(event.metadata || {});
      groups[key] = (groups[key] || 0) + 1;
    });
    return groups;
  }

  private hasIdenticalMetadata(groups: { [key: string]: number }): boolean {
    const counts = Object.values(groups);
    return counts.some(count => count > 10); // More than 10 identical metadata
  }

  private hasBurstPatterns(events: any[]): boolean {
    // Detect bursts of activity followed by silence
    const intervals = this.calculateIntervals(events.map(e => e.createdAt));
    let burstCount = 0;
    let silenceCount = 0;
    
    for (const interval of intervals) {
      if (interval < 1000) { // Less than 1 second
        burstCount++;
        silenceCount = 0;
      } else if (interval > 60000) { // More than 1 minute
        silenceCount++;
        if (burstCount > 5 && silenceCount > 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isDataCenterIP(ip: string): boolean {
    // Simplified data center detection
    const dataCenterPatterns = [
      /^23\./, // DigitalOcean
      /^104\./, // AWS
      /^34\./, // Google Cloud
      /^40\./, // Azure
    ];
    return dataCenterPatterns.some(pattern => pattern.test(ip));
  }

  private async checkVPNProxy(ip: string): Promise<boolean> {
    // In production, you would use a VPN detection service
    // For now, simplified check
    return false;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private hasRapidLocationChanges(ips: string[]): boolean {
    // Simplified - in production you'd use geolocation service
    return ips.length > 3;
  }

  private calculateConfidence(suspiciousChecks: any[], totalChecks: number): number {
    if (totalChecks === 0) return 0;
    
    const weights = {
      high: 0.3,
      medium: 0.2,
      low: 0.1
    };

    const totalWeight = suspiciousChecks.reduce((sum, check) => {
      return sum + (weights[check.severity as keyof typeof weights] || 0.1);
    }, 0);

    return Math.min(totalWeight, 1.0);
  }

  /**
   * Log bot detection result
   */
  async logBotDetection(
    clipperId: string,
    campaignId: string,
    result: BotDetectionResult,
    fingerprint: DeviceFingerprint
  ): Promise<void> {
    console.log(`🤖 Bot Detection Result:`, {
      clipperId,
      campaignId,
      isBot: result.isBot,
      confidence: result.confidence,
      action: result.action,
      reasons: result.reasons,
      userAgent: fingerprint.userAgent.substring(0, 100),
      ip: fingerprint.ip,
    });

    // In production, you might want to store this in a dedicated table
    // for analysis and improving the detection algorithm
  }
}

export const antiBotService = new AntiBotService();