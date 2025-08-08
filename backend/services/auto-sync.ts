// Automatic Metrics Synchronization Service with Environment Detection
import { metricsSyncService } from "./metrics-sync";

// Environment detection for automatic sync setup
const isProduction = process.env.NODE_ENV === 'production';
const isReplit = process.env.REPLIT_ENV === 'true' || process.env.REPL_ID !== undefined;

export class AutoSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly defaultIntervalMinutes = 60; // 1 hour default

  // Initialize automatic sync based on environment
  async initialize() {
    console.log('🔄 Initializing CreoCash Auto-Sync Service...');
    console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`Platform: ${isReplit ? 'Replit' : 'External Hosting'}`);

    // Check if required API keys are present for sync services
    const hasRequiredKeys = process.env.INSTAGRAM_ACCESS_TOKEN || 
                           process.env.YOUTUBE_API_KEY || 
                           process.env.TWITTER_API_KEY ||
                           process.env.MT4_API_URL;

    if (!hasRequiredKeys && isProduction && !isReplit) {
      console.log('⚠️  Auto-sync disabled: Missing required API keys for external services.');
      console.log('   To enable auto-sync, configure social media and trading API credentials.');
      return;
    }

    // Different sync strategies based on environment
    if (isProduction && !isReplit) {
      // External production - full auto sync
      await this.startFullAutoSync();
    } else if (isReplit) {
      // Replit environment - lighter sync
      await this.startLightAutoSync();
    } else {
      // Development - manual sync only
      console.log('🔧 Development mode: Auto-sync disabled. Use manual sync endpoints.');
    }
  }

  // Full auto-sync for production external hosting
  private async startFullAutoSync() {
    console.log('🚀 Starting full production auto-sync...');
    
    try {
      // Initial sync on startup
      setTimeout(async () => {
        console.log('🎯 Running initial metrics sync...');
        try {
          const result = await metricsSyncService.syncAllUsersMetrics();
          console.log(`✅ Initial sync completed: ${result.successful} successful, ${result.failed} failed`);
        } catch (error) {
          console.error('❌ Initial sync failed:', error);
        }
      }, 10000); // 10 second delay to allow server to fully start

      // Set up recurring sync
      this.syncInterval = setInterval(async () => {
        console.log('🔄 Running scheduled full metrics sync...');
        try {
          const result = await metricsSyncService.syncAllUsersMetrics();
          console.log(`✅ Scheduled sync completed: ${result.successful} successful, ${result.failed} failed`);
        } catch (error) {
          console.error('❌ Scheduled sync failed:', error);
        }
      }, this.defaultIntervalMinutes * 60 * 1000);

      console.log(`✅ Full auto-sync initialized with ${this.defaultIntervalMinutes} minute intervals`);
    } catch (error) {
      console.error('❌ Failed to initialize full auto-sync:', error);
    }
  }

  // Light auto-sync for Replit (less frequent to avoid resource limits)
  private async startLightAutoSync() {
    console.log('⚡ Starting light auto-sync for Replit...');
    
    try {
      // Delayed initial sync
      setTimeout(async () => {
        console.log('🎯 Running initial light sync...');
        try {
          // Sync only active creators to reduce load
          const traderResult = await metricsSyncService.syncByCreatorType('trader_creator');
          const influencerResult = await metricsSyncService.syncByCreatorType('influencer');
          
          const successful = traderResult.filter(r => r.success).length + influencerResult.filter(r => r.success).length;
          const failed = traderResult.filter(r => !r.success).length + influencerResult.filter(r => !r.success).length;
          
          console.log(`✅ Light sync completed: ${successful} successful, ${failed} failed`);
        } catch (error) {
          console.error('❌ Light sync failed:', error);
        }
      }, 15000); // 15 second delay for Replit

      // Set up less frequent sync for Replit
      const lightIntervalMinutes = 120; // 2 hours for Replit
      this.syncInterval = setInterval(async () => {
        console.log('🔄 Running scheduled light sync...');
        try {
          // Stagger syncs to avoid hitting API limits
          const traderResult = await metricsSyncService.syncByCreatorType('trader_creator');
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
          
          const influencerResult = await metricsSyncService.syncByCreatorType('influencer');
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
          
          const entrepreneurResult = await metricsSyncService.syncByCreatorType('entrepreneur');
          
          const successful = traderResult.filter(r => r.success).length + 
                           influencerResult.filter(r => r.success).length +
                           entrepreneurResult.filter(r => r.success).length;
          const failed = traderResult.filter(r => !r.success).length + 
                        influencerResult.filter(r => !r.success).length +
                        entrepreneurResult.filter(r => !r.success).length;
          
          console.log(`✅ Light scheduled sync completed: ${successful} successful, ${failed} failed`);
        } catch (error) {
          console.error('❌ Light scheduled sync failed:', error);
        }
      }, lightIntervalMinutes * 60 * 1000);

      console.log(`✅ Light auto-sync initialized with ${lightIntervalMinutes} minute intervals`);
    } catch (error) {
      console.error('❌ Failed to initialize light auto-sync:', error);
    }
  }

  // Manual trigger for immediate sync (available in all environments)
  async triggerManualSync(userId?: string) {
    console.log(`🎯 Manual sync triggered${userId ? ` for user: ${userId}` : ' for all users'}`);
    
    try {
      if (userId) {
        const result = await metricsSyncService.syncUserMetrics(userId);
        console.log(`✅ Manual user sync completed for ${userId}`);
        return result;
      } else {
        const result = await metricsSyncService.syncAllUsersMetrics();
        console.log(`✅ Manual full sync completed: ${result.successful} successful, ${result.failed} failed`);
        return result;
      }
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      throw error;
    }
  }

  // Stop auto-sync service
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync service stopped');
    }
  }

  // Get sync status
  getStatus() {
    return {
      environment: isProduction ? 'production' : 'development',
      platform: isReplit ? 'replit' : 'external',
      autoSyncActive: this.syncInterval !== null,
      intervalMinutes: isReplit ? 120 : this.defaultIntervalMinutes
    };
  }
}

// Singleton instance
export const autoSyncService = new AutoSyncService();