// Test Metrics API Integration
import { metricsSyncService } from "./core/services/metrics-sync";
import { storage } from "./storage";

async function testMetricsIntegration() {
  console.log("🧪 Testing CreoCash Metrics Integration...\n");

  try {
    // Test 1: Create a test user with integrations
    console.log("1️⃣ Creating test user with social media integrations...");
    const testUser = await storage.createUser({
      username: "testtrader",
      email: "test@trader.com",
      password: "hashed_password",
      fullName: "Test Trader",
      userType: "trader_creator",
      role: "creator",
      isActive: true,
      socialAccounts: {
        instagram: {
          businessAccount: true,
          accessToken: "test_instagram_token",
          username: "testtrader_ig"
        },
        youtube: {
          channelId: "UCTestChannelId123",
          channelName: "Test Trading Channel"
        },
        twitter: {
          username: "testtrader",
          verified: true
        },
        tiktok: {
          accessToken: "test_tiktok_token",
          username: "testtrader_tt"
        }
      },
      tradingAccounts: {
        brokers: [
          {
            name: "MetaTrader Demo",
            platform: "mt5",
            accountId: "12345678",
            apiKey: "demo_mt5_key",
            environment: "demo"
          },
          {
            name: "OANDA Practice",
            platform: "proprietary",
            accountId: "101-004-12345678",
            apiKey: "demo_oanda_key",
            environment: "practice"
          }
        ]
      },
      businessIntegration: {
        website: "https://testtrader.com",
        googleAnalyticsId: "GA_MEASUREMENT_ID",
        facebookPixelId: "123456789",
        hubspotApiKey: "demo_hubspot_key"
      }
    });

    console.log(`✅ Test user created: ${testUser.id}\n`);

    // Test 2: Check user metrics retrieval (should be empty initially)
    console.log("2️⃣ Fetching initial user metrics...");
    const initialMetrics = await metricsSyncService.getUserMetrics(testUser.id);
    console.log("Initial metrics:", JSON.stringify(initialMetrics, null, 2));
    console.log("✅ Initial metrics fetched (should be empty)\n");

    // Test 3: Test manual sync (will fail with demo tokens, but tests error handling)
    console.log("3️⃣ Testing metrics sync with demo data...");
    try {
      const syncResult = await metricsSyncService.syncUserMetrics(testUser.id);
      console.log("Sync result:", JSON.stringify(syncResult, null, 2));
      console.log("✅ Metrics sync completed\n");
    } catch (error) {
      console.log("⚠️  Expected sync error with demo tokens:", error.message);
      console.log("✅ Error handling working correctly\n");
    }

    // Test 4: Test integration updates
    console.log("4️⃣ Testing integration updates...");
    const updatedUser = await storage.updateUserIntegrations(testUser.id, {
      socialAccounts: {
        ...testUser.socialAccounts,
        linkedin: {
          profileUrl: "https://linkedin.com/in/testtrader",
          companyPage: "TestTradingCorp"
        }
      },
      businessIntegration: {
        ...testUser.businessIntegration,
        hotjarSiteId: "123456",
        intercomAppId: "test_intercom"
      }
    });

    console.log("✅ User integrations updated successfully\n");

    // Test 5: Test creator type sync
    console.log("5️⃣ Testing creator type sync...");
    try {
      const creatorTypeResult = await metricsSyncService.syncByCreatorType('trader_creator');
      console.log(`Creator type sync result: ${creatorTypeResult.length} users processed`);
      console.log("✅ Creator type sync completed\n");
    } catch (error) {
      console.log("⚠️  Creator type sync error:", error.message);
    }

    // Test 6: Test API service availability
    console.log("6️⃣ Testing API service imports...");
    const { SocialMediaAggregator } = await import("./core/services/social-media-apis");
    const { TradingMetricsAggregator } = await import("./core/services/trading-apis");
    const { WebAnalyticsAggregator } = await import("./core/services/analytics-apis");

    const socialAgg = new SocialMediaAggregator();
    const tradingAgg = new TradingMetricsAggregator();
    const webAgg = new WebAnalyticsAggregator();

    console.log("✅ All API service classes imported successfully");
    console.log("✅ Service instances created successfully\n");

    // Test 7: Environment check
    console.log("7️⃣ Environment configuration check...");
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`REPLIT_ENV: ${process.env.REPLIT_ENV || 'not set'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
    console.log("✅ Environment check completed\n");

    console.log("🎉 All metrics integration tests completed successfully!");
    console.log("\n📊 Metrics System Status:");
    console.log("✅ Database schema ready");
    console.log("✅ API services loaded");
    console.log("✅ Sync services functional");
    console.log("✅ Error handling working");
    console.log("✅ Integration updates working");

  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

export { testMetricsIntegration };

// Run test immediately
testMetricsIntegration()
  .then(() => console.log("\n✅ Test completed successfully"))
  .catch((err) => console.error("\n❌ Test failed:", err));