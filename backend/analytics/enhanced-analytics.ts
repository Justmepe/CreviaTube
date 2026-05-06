import { cacheService } from '../cache';

// Realtime WebSocket push was removed in the Phase 1 strip; this stub keeps
// the existing `if (wsServer) { ... }` guards working as no-ops so the
// analytics service still records data without the realtime broadcast.
const getWebSocketServer = (): null => null;

// Enhanced analytics interfaces
interface ConversionFunnel {
  id: string;
  name: string;
  stages: FunnelStage[];
  totalConversions: number;
  conversionRate: number;
  averageTimeToConvert: number;
  dropoffPoints: DropoffPoint[];
  timestamp: Date;
}

interface FunnelStage {
  name: string;
  order: number;
  visitors: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeInStage: number;
}

interface DropoffPoint {
  stage: string;
  dropoffCount: number;
  dropoffRate: number;
  reasons: string[];
}

interface CohortAnalysis {
  id: string;
  cohortType: 'registration' | 'first_purchase' | 'campaign_creation';
  cohortDate: Date;
  cohortSize: number;
  retentionData: RetentionData[];
  revenueData: RevenueData[];
  engagementData: EngagementData[];
}

interface RetentionData {
  period: number; // days/weeks/months
  retainedUsers: number;
  retentionRate: number;
  churnRate: number;
}

interface RevenueData {
  period: number;
  totalRevenue: number;
  averageRevenue: number;
  revenuePerUser: number;
}

interface EngagementData {
  period: number;
  activeUsers: number;
  engagementRate: number;
  averageSessionDuration: number;
}

interface GeographicPerformance {
  country: string;
  region?: string;
  city?: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  trends: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

interface PredictiveAnalytics {
  id: string;
  type: 'revenue_forecast' | 'user_churn' | 'campaign_performance' | 'conversion_prediction';
  prediction: number;
  confidence: number;
  factors: PredictionFactor[];
  timeframe: '7d' | '30d' | '90d' | '1y';
  timestamp: Date;
}

interface PredictionFactor {
  name: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface UserBehavior {
  userId: string;
  sessionId: string;
  pageViews: PageView[];
  clicks: Click[];
  conversions: Conversion[];
  timeOnSite: number;
  bounceRate: number;
  sessionDuration: number;
  timestamp: Date;
}

interface PageView {
  url: string;
  title: string;
  timestamp: Date;
  timeOnPage: number;
  referrer?: string;
}

interface Click {
  element: string;
  page: string;
  timestamp: Date;
  coordinates?: { x: number; y: number };
}

interface Conversion {
  type: 'purchase' | 'signup' | 'campaign_creation' | 'link_click';
  value: number;
  timestamp: Date;
  campaignId?: string;
}

// Enhanced Analytics Service
export class EnhancedAnalytics {
  private conversionFunnels: Map<string, ConversionFunnel> = new Map();
  private cohortAnalyses: Map<string, CohortAnalysis> = new Map();
  private geographicData: Map<string, GeographicPerformance> = new Map();
  private predictions: Map<string, PredictiveAnalytics> = new Map();
  private userBehaviors: Map<string, UserBehavior[]> = new Map();

  constructor() {
    this.initializeDefaultFunnels();
    this.startAnalyticsCollection();
  }

  // Initialize default conversion funnels
  private initializeDefaultFunnels(): void {
    // Campaign creation funnel
    this.createConversionFunnel('campaign_creation', 'Campaign Creation Funnel', [
      { name: 'Landing Page Visit', order: 1 },
      { name: 'Campaign Form Start', order: 2 },
      { name: 'Campaign Details Filled', order: 3 },
      { name: 'Budget Set', order: 4 },
      { name: 'Campaign Created', order: 5 },
    ]);

    // User registration funnel
    this.createConversionFunnel('user_registration', 'User Registration Funnel', [
      { name: 'Landing Page Visit', order: 1 },
      { name: 'Sign Up Click', order: 2 },
      { name: 'Form Filled', order: 3 },
      { name: 'Email Verification', order: 4 },
      { name: 'Account Activated', order: 5 },
    ]);

    // Purchase funnel
    this.createConversionFunnel('purchase', 'Purchase Funnel', [
      { name: 'Product Page Visit', order: 1 },
      { name: 'Add to Cart', order: 2 },
      { name: 'Checkout Start', order: 3 },
      { name: 'Payment Method Selected', order: 4 },
      { name: 'Purchase Completed', order: 5 },
    ]);
  }

  // Create conversion funnel
  createConversionFunnel(id: string, name: string, stages: Partial<FunnelStage>[]): ConversionFunnel {
    const funnel: ConversionFunnel = {
      id,
      name,
      stages: stages.map((stage, index) => ({
        name: stage.name || `Stage ${index + 1}`,
        order: stage.order || index + 1,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        dropoffRate: 0,
        averageTimeInStage: 0,
      })),
      totalConversions: 0,
      conversionRate: 0,
      averageTimeToConvert: 0,
      dropoffPoints: [],
      timestamp: new Date(),
    };

    this.conversionFunnels.set(id, funnel);
    console.log(`📊 Created conversion funnel: ${name} (${id})`);
    return funnel;
  }

  // Track funnel event
  trackFunnelEvent(funnelId: string, stageName: string, userId: string, eventType: 'enter' | 'exit' | 'convert'): void {
    const funnel = this.conversionFunnels.get(funnelId);
    if (!funnel) return;

    const stage = funnel.stages.find(s => s.name === stageName);
    if (!stage) return;

    switch (eventType) {
      case 'enter':
        stage.visitors++;
        break;
      case 'exit':
        stage.dropoffRate = (stage.visitors - stage.conversions) / stage.visitors;
        break;
      case 'convert':
        stage.conversions++;
        stage.conversionRate = stage.conversions / stage.visitors;
        funnel.totalConversions++;
        break;
    }

    // Update overall funnel metrics
    this.updateFunnelMetrics(funnel);
    
    // Cache updated funnel
    this.cacheFunnel(funnel);
    
    // Broadcast real-time update
    this.broadcastFunnelUpdate(funnel);
  }

  // Update funnel metrics
  private updateFunnelMetrics(funnel: ConversionFunnel): void {
    if (funnel.stages.length === 0) return;

    const firstStage = funnel.stages[0];
    const lastStage = funnel.stages[funnel.stages.length - 1];

    funnel.conversionRate = lastStage.conversions / firstStage.visitors;
    
    // Calculate dropoff points
    funnel.dropoffPoints = funnel.stages
      .filter(stage => stage.dropoffRate > 0)
      .map(stage => ({
        stage: stage.name,
        dropoffCount: stage.visitors - stage.conversions,
        dropoffRate: stage.dropoffRate,
        reasons: this.analyzeDropoffReasons(stage),
      }))
      .sort((a, b) => b.dropoffRate - a.dropoffRate);
  }

  // Analyze dropoff reasons
  private analyzeDropoffReasons(stage: FunnelStage): string[] {
    const reasons: string[] = [];
    
    if (stage.dropoffRate > 0.5) {
      reasons.push('High complexity');
    }
    if (stage.averageTimeInStage > 300) { // 5 minutes
      reasons.push('Long completion time');
    }
    if (stage.conversionRate < 0.1) {
      reasons.push('Poor user experience');
    }
    
    return reasons;
  }

  // Create cohort analysis
  createCohortAnalysis(
    cohortType: 'registration' | 'first_purchase' | 'campaign_creation',
    cohortDate: Date,
    cohortSize: number
  ): CohortAnalysis {
    const cohort: CohortAnalysis = {
      id: `cohort_${cohortType}_${cohortDate.toISOString().split('T')[0]}`,
      cohortType,
      cohortDate,
      cohortSize,
      retentionData: [],
      revenueData: [],
      engagementData: [],
    };

    this.cohortAnalyses.set(cohort.id, cohort);
    console.log(`📊 Created cohort analysis: ${cohortType} (${cohort.id})`);
    return cohort;
  }

  // Update cohort data
  updateCohortData(
    cohortId: string,
    period: number,
    retainedUsers: number,
    revenue: number,
    activeUsers: number,
    sessionDuration: number
  ): void {
    const cohort = this.cohortAnalyses.get(cohortId);
    if (!cohort) return;

    // Update retention data
    const retentionRate = retainedUsers / cohort.cohortSize;
    cohort.retentionData.push({
      period,
      retainedUsers,
      retentionRate,
      churnRate: 1 - retentionRate,
    });

    // Update revenue data
    cohort.revenueData.push({
      period,
      totalRevenue: revenue,
      averageRevenue: revenue / retainedUsers,
      revenuePerUser: revenue / cohort.cohortSize,
    });

    // Update engagement data
    cohort.engagementData.push({
      period,
      activeUsers,
      engagementRate: activeUsers / retainedUsers,
      averageSessionDuration: sessionDuration,
    });

    // Cache updated cohort
    this.cacheCohort(cohort);
    
    // Broadcast real-time update
    this.broadcastCohortUpdate(cohort);
  }

  // Track geographic performance
  trackGeographicPerformance(
    country: string,
    region: string,
    city: string,
    metrics: Partial<GeographicPerformance['metrics']>
  ): void {
    const key = `${country}_${region}_${city}`;
    const existing = this.geographicData.get(key);

    if (existing) {
      // Update existing data
      existing.metrics = { ...existing.metrics, ...metrics };
      
      // Calculate trends (simplified - in production would use historical data)
      existing.trends = {
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        conversions: metrics.conversions || 0,
        revenue: metrics.revenue || 0,
      };
    } else {
      // Create new geographic data
      const geoData: GeographicPerformance = {
        country,
        region,
        city,
        metrics: {
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          conversions: metrics.conversions || 0,
          revenue: metrics.revenue || 0,
          ctr: metrics.ctr || 0,
          conversionRate: metrics.conversionRate || 0,
          averageOrderValue: metrics.averageOrderValue || 0,
        },
        trends: {
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          conversions: metrics.conversions || 0,
          revenue: metrics.revenue || 0,
        },
      };

      this.geographicData.set(key, geoData);
    }

    // Cache geographic data
    this.cacheGeographicData(key);
    
    // Broadcast real-time update
    this.broadcastGeographicUpdate(key);
  }

  // Generate predictive analytics
  async generatePrediction(
    type: 'revenue_forecast' | 'user_churn' | 'campaign_performance' | 'conversion_prediction',
    timeframe: '7d' | '30d' | '90d' | '1y',
    factors: PredictionFactor[]
  ): Promise<PredictiveAnalytics> {
    const prediction: PredictiveAnalytics = {
      id: `prediction_${type}_${Date.now()}`,
      type,
      prediction: this.calculatePrediction(type, factors),
      confidence: this.calculateConfidence(factors),
      factors,
      timeframe,
      timestamp: new Date(),
    };

    this.predictions.set(prediction.id, prediction);
    
    // Cache prediction
    await this.cachePrediction(prediction);
    
    // Broadcast real-time update
    this.broadcastPredictionUpdate(prediction);
    
    console.log(`🔮 Generated ${type} prediction: ${prediction.prediction} (${prediction.confidence}% confidence)`);
    return prediction;
  }

  // Calculate prediction value
  private calculatePrediction(type: string, factors: PredictionFactor[]): number {
    let baseValue = 0;
    
    switch (type) {
      case 'revenue_forecast':
        baseValue = 10000; // Base revenue
        break;
      case 'user_churn':
        baseValue = 0.15; // Base churn rate
        break;
      case 'campaign_performance':
        baseValue = 0.05; // Base conversion rate
        break;
      case 'conversion_prediction':
        baseValue = 0.03; // Base conversion rate
        break;
    }

    // Apply factor weights
    const weightedSum = factors.reduce((sum, factor) => {
      const impact = factor.impact === 'positive' ? 1 : factor.impact === 'negative' ? -1 : 0;
      return sum + (factor.weight * impact);
    }, 0);

    return baseValue * (1 + weightedSum);
  }

  // Calculate prediction confidence
  private calculateConfidence(factors: PredictionFactor[]): number {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const averageWeight = totalWeight / factors.length;
    
    // Higher average weight = higher confidence
    return Math.min(95, Math.max(50, averageWeight * 100));
  }

  // Track user behavior
  trackUserBehavior(
    userId: string,
    sessionId: string,
    behavior: Partial<UserBehavior>
  ): void {
    const userBehaviors = this.userBehaviors.get(userId) || [];
    
    const userBehavior: UserBehavior = {
      userId,
      sessionId,
      pageViews: behavior.pageViews || [],
      clicks: behavior.clicks || [],
      conversions: behavior.conversions || [],
      timeOnSite: behavior.timeOnSite || 0,
      bounceRate: behavior.bounceRate || 0,
      sessionDuration: behavior.sessionDuration || 0,
      timestamp: new Date(),
    };

    userBehaviors.push(userBehavior);
    
    // Keep only last 10 sessions per user
    if (userBehaviors.length > 10) {
      userBehaviors.splice(0, userBehaviors.length - 10);
    }

    this.userBehaviors.set(userId, userBehaviors);
    
    // Cache user behavior
    this.cacheUserBehavior(userId, userBehaviors);
    
    // Analyze behavior patterns
    this.analyzeUserBehavior(userId, userBehavior);
  }

  // Analyze user behavior patterns
  private analyzeUserBehavior(userId: string, behavior: UserBehavior): void {
    // Detect high-value users
    const totalValue = behavior.conversions.reduce((sum, conv) => sum + conv.value, 0);
    if (totalValue > 1000) {
      this.flagHighValueUser(userId, totalValue);
    }

    // Detect potential churn
    if (behavior.bounceRate > 0.8 && behavior.timeOnSite < 30) {
      this.flagPotentialChurn(userId, behavior);
    }

    // Detect engagement patterns
    if (behavior.pageViews.length > 10 && behavior.sessionDuration > 600) {
      this.flagEngagedUser(userId, behavior);
    }
  }

  // Flag high-value user
  private flagHighValueUser(userId: string, totalValue: number): void {
    console.log(`💰 High-value user detected: ${userId} ($${totalValue})`);
    
    // In production, this would trigger notifications or special treatment
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendNotificationToUser(userId, {
        id: 'high_value_user',
        type: 'success',
        title: 'VIP Status',
        message: 'You\'ve been identified as a high-value user!',
        priority: 'high',
      });
    }
  }

  // Flag potential churn
  private flagPotentialChurn(userId: string, behavior: UserBehavior): void {
    console.log(`⚠️ Potential churn detected: ${userId}`);
    
    // In production, this would trigger retention campaigns
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendNotificationToUser(userId, {
        id: 'churn_risk',
        type: 'warning',
        title: 'We Miss You!',
        message: 'Come back and check out our latest campaigns!',
        priority: 'high',
      });
    }
  }

  // Flag engaged user
  private flagEngagedUser(userId: string, behavior: UserBehavior): void {
    console.log(`🎯 Engaged user detected: ${userId}`);
    
    // In production, this would trigger engagement campaigns
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendNotificationToUser(userId, {
        id: 'engaged_user',
        type: 'info',
        title: 'You\'re Awesome!',
        message: 'Thanks for being so engaged with our platform!',
        priority: 'normal',
      });
    }
  }

  // Get conversion funnel
  getConversionFunnel(funnelId: string): ConversionFunnel | undefined {
    return this.conversionFunnels.get(funnelId);
  }

  // Get all conversion funnels
  getAllConversionFunnels(): ConversionFunnel[] {
    return Array.from(this.conversionFunnels.values());
  }

  // Get cohort analysis
  getCohortAnalysis(cohortId: string): CohortAnalysis | undefined {
    return this.cohortAnalyses.get(cohortId);
  }

  // Get all cohort analyses
  getAllCohortAnalyses(): CohortAnalysis[] {
    return Array.from(this.cohortAnalyses.values());
  }

  // Get geographic performance
  getGeographicPerformance(country: string, region?: string, city?: string): GeographicPerformance | undefined {
    const key = city ? `${country}_${region}_${city}` : region ? `${country}_${region}` : country;
    return this.geographicData.get(key);
  }

  // Get all geographic data
  getAllGeographicData(): GeographicPerformance[] {
    return Array.from(this.geographicData.values());
  }

  // Get prediction
  getPrediction(predictionId: string): PredictiveAnalytics | undefined {
    return this.predictions.get(predictionId);
  }

  // Get all predictions
  getAllPredictions(): PredictiveAnalytics[] {
    return Array.from(this.predictions.values());
  }

  // Get user behavior
  getUserBehavior(userId: string): UserBehavior[] {
    return this.userBehaviors.get(userId) || [];
  }

  // Start analytics collection
  private startAnalyticsCollection(): void {
    // Generate predictions every hour
    setInterval(() => {
      this.generatePeriodicPredictions();
    }, 3600000);

    // Clean up old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 86400000);
  }

  // Generate periodic predictions
  private async generatePeriodicPredictions(): Promise<void> {
    try {
      // Revenue forecast
      await this.generatePrediction('revenue_forecast', '30d', [
        { name: 'Seasonal trends', weight: 0.3, impact: 'positive', description: 'Holiday season approaching' },
        { name: 'User growth', weight: 0.4, impact: 'positive', description: 'Steady user acquisition' },
        { name: 'Market conditions', weight: 0.2, impact: 'neutral', description: 'Stable market' },
        { name: 'Competition', weight: 0.1, impact: 'negative', description: 'Increased competition' },
      ]);

      // User churn prediction
      await this.generatePrediction('user_churn', '30d', [
        { name: 'Engagement rate', weight: 0.4, impact: 'negative', description: 'Declining engagement' },
        { name: 'Support tickets', weight: 0.2, impact: 'negative', description: 'High support volume' },
        { name: 'Feature usage', weight: 0.3, impact: 'positive', description: 'Good feature adoption' },
        { name: 'User satisfaction', weight: 0.1, impact: 'positive', description: 'High satisfaction scores' },
      ]);

      console.log('🔮 Generated periodic predictions');
    } catch (error) {
      console.error('Error generating periodic predictions:', error);
    }
  }

  // Cleanup old data
  private cleanupOldData(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Clean up old predictions
    this.predictions.forEach((prediction, id) => {
      if (prediction.timestamp < thirtyDaysAgo) {
        this.predictions.delete(id);
      }
    });

    // Clean up old user behaviors (keep only last 30 days)
    this.userBehaviors.forEach((behaviors, userId) => {
      const recentBehaviors = behaviors.filter(b => b.timestamp > thirtyDaysAgo);
      if (recentBehaviors.length === 0) {
        this.userBehaviors.delete(userId);
      } else {
        this.userBehaviors.set(userId, recentBehaviors);
      }
    });

    console.log('🧹 Cleaned up old analytics data');
  }

  // Cache methods
  private async cacheFunnel(funnel: ConversionFunnel): Promise<void> {
    try {
      await cacheService.set(`funnel:${funnel.id}`, funnel, 3600);
    } catch (error) {
      console.error('Error caching funnel:', error);
    }
  }

  private async cacheCohort(cohort: CohortAnalysis): Promise<void> {
    try {
      await cacheService.set(`cohort:${cohort.id}`, cohort, 3600);
    } catch (error) {
      console.error('Error caching cohort:', error);
    }
  }

  private async cacheGeographicData(key: string): Promise<void> {
    try {
      const data = this.geographicData.get(key);
      if (data) {
        await cacheService.set(`geographic:${key}`, data, 3600);
      }
    } catch (error) {
      console.error('Error caching geographic data:', error);
    }
  }

  private async cachePrediction(prediction: PredictiveAnalytics): Promise<void> {
    try {
      await cacheService.set(`prediction:${prediction.id}`, prediction, 3600);
    } catch (error) {
      console.error('Error caching prediction:', error);
    }
  }

  private async cacheUserBehavior(userId: string, behaviors: UserBehavior[]): Promise<void> {
    try {
      await cacheService.set(`user_behavior:${userId}`, behaviors, 3600);
    } catch (error) {
      console.error('Error caching user behavior:', error);
    }
  }

  // Broadcast methods
  private broadcastFunnelUpdate(funnel: ConversionFunnel): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastToRoom('analytics_funnels', {
        type: 'analytics',
        data: {
          type: 'funnel_update',
          funnel,
        },
        timestamp: new Date(),
      });
    }
  }

  private broadcastCohortUpdate(cohort: CohortAnalysis): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastToRoom('analytics_cohorts', {
        type: 'analytics',
        data: {
          type: 'cohort_update',
          cohort,
        },
        timestamp: new Date(),
      });
    }
  }

  private broadcastGeographicUpdate(key: string): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      const data = this.geographicData.get(key);
      if (data) {
        wsServer.broadcastToRoom('analytics_geographic', {
          type: 'analytics',
          data: {
            type: 'geographic_update',
            geographicData: data,
          },
          timestamp: new Date(),
        });
      }
    }
  }

  private broadcastPredictionUpdate(prediction: PredictiveAnalytics): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastToRoom('analytics_predictions', {
        type: 'analytics',
        data: {
          type: 'prediction_update',
          prediction,
        },
        timestamp: new Date(),
      });
    }
  }

  // Get analytics statistics
  getStats(): any {
    return {
      conversionFunnels: this.conversionFunnels.size,
      cohortAnalyses: this.cohortAnalyses.size,
      geographicDataPoints: this.geographicData.size,
      predictions: this.predictions.size,
      trackedUsers: this.userBehaviors.size,
      totalUserSessions: Array.from(this.userBehaviors.values()).reduce((sum, behaviors) => sum + behaviors.length, 0),
    };
  }

  // Export analytics data
  exportAnalyticsData(format: 'json' | 'csv' = 'json'): any {
    return {
      conversionFunnels: Array.from(this.conversionFunnels.values()),
      cohortAnalyses: Array.from(this.cohortAnalyses.values()),
      geographicData: Array.from(this.geographicData.values()),
      predictions: Array.from(this.predictions.values()),
      userBehaviors: Object.fromEntries(this.userBehaviors),
      exportDate: new Date(),
      format,
    };
  }
}

// Export singleton instance
export const enhancedAnalytics = new EnhancedAnalytics();
