import { Router } from 'express';
import { enhancedAnalytics } from './enhanced-analytics';
import { cacheService } from '../cache';
import { rateLimiters } from '../middleware/rate-limiter';

const router = Router();

// Apply rate limiting to analytics routes
router.use(rateLimiters.api.middleware());

// Conversion Funnel APIs
router.get('/funnels', async (req, res) => {
  try {
    const funnels = enhancedAnalytics.getAllConversionFunnels();
    res.json({
      success: true,
      data: funnels,
      count: funnels.length,
    });
  } catch (error: any) {
    console.error('Error fetching conversion funnels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion funnels',
      error: error.message,
    });
  }
});

router.get('/funnels/:funnelId', async (req, res) => {
  try {
    const { funnelId } = req.params;
    const funnel = enhancedAnalytics.getConversionFunnel(funnelId);
    
    if (!funnel) {
      return res.status(404).json({
        success: false,
        message: 'Conversion funnel not found',
      });
    }

    res.json({
      success: true,
      data: funnel,
    });
  } catch (error: any) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion funnel',
      error: error.message,
    });
  }
});

router.post('/funnels', async (req, res) => {
  try {
    const { id, name, stages } = req.body;
    
    if (!id || !name || !stages) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, name, stages',
      });
    }

    const funnel = enhancedAnalytics.createConversionFunnel(id, name, stages);
    
    res.status(201).json({
      success: true,
      data: funnel,
      message: 'Conversion funnel created successfully',
    });
  } catch (error: any) {
    console.error('Error creating conversion funnel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversion funnel',
      error: error.message,
    });
  }
});

router.post('/funnels/:funnelId/track', async (req, res) => {
  try {
    const { funnelId } = req.params;
    const { stageName, userId, eventType } = req.body;
    
    if (!stageName || !userId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: stageName, userId, eventType',
      });
    }

    if (!['enter', 'exit', 'convert'].includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eventType. Must be: enter, exit, or convert',
      });
    }

    enhancedAnalytics.trackFunnelEvent(funnelId, stageName, userId, eventType);
    
    res.json({
      success: true,
      message: 'Funnel event tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking funnel event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track funnel event',
      error: error.message,
    });
  }
});

// Cohort Analysis APIs
router.get('/cohorts', async (req, res) => {
  try {
    const cohorts = enhancedAnalytics.getAllCohortAnalyses();
    res.json({
      success: true,
      data: cohorts,
      count: cohorts.length,
    });
  } catch (error: any) {
    console.error('Error fetching cohort analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cohort analyses',
      error: error.message,
    });
  }
});

router.get('/cohorts/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const cohort = enhancedAnalytics.getCohortAnalysis(cohortId);
    
    if (!cohort) {
      return res.status(404).json({
        success: false,
        message: 'Cohort analysis not found',
      });
    }

    res.json({
      success: true,
      data: cohort,
    });
  } catch (error: any) {
    console.error('Error fetching cohort analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cohort analysis',
      error: error.message,
    });
  }
});

router.post('/cohorts', async (req, res) => {
  try {
    const { cohortType, cohortDate, cohortSize } = req.body;
    
    if (!cohortType || !cohortDate || !cohortSize) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cohortType, cohortDate, cohortSize',
      });
    }

    if (!['registration', 'first_purchase', 'campaign_creation'].includes(cohortType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cohortType. Must be: registration, first_purchase, or campaign_creation',
      });
    }

    const cohort = enhancedAnalytics.createCohortAnalysis(
      cohortType,
      new Date(cohortDate),
      cohortSize
    );
    
    res.status(201).json({
      success: true,
      data: cohort,
      message: 'Cohort analysis created successfully',
    });
  } catch (error: any) {
    console.error('Error creating cohort analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cohort analysis',
      error: error.message,
    });
  }
});

router.post('/cohorts/:cohortId/update', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { period, retainedUsers, revenue, activeUsers, sessionDuration } = req.body;
    
    if (!period || retainedUsers === undefined || revenue === undefined || 
        activeUsers === undefined || sessionDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: period, retainedUsers, revenue, activeUsers, sessionDuration',
      });
    }

    enhancedAnalytics.updateCohortData(
      cohortId,
      period,
      retainedUsers,
      revenue,
      activeUsers,
      sessionDuration
    );
    
    res.json({
      success: true,
      message: 'Cohort data updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating cohort data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cohort data',
      error: error.message,
    });
  }
});

// Geographic Performance APIs
router.get('/geographic', async (req, res) => {
  try {
    const { country, region, city } = req.query;
    
    if (country && region && city) {
      const geoData = enhancedAnalytics.getGeographicPerformance(
        country as string,
        region as string,
        city as string
      );
      
      if (!geoData) {
        return res.status(404).json({
          success: false,
          message: 'Geographic data not found',
        });
      }

      return res.json({
        success: true,
        data: geoData,
      });
    }

    // Return all geographic data
    const allGeoData = enhancedAnalytics.getAllGeographicData();
    res.json({
      success: true,
      data: allGeoData,
      count: allGeoData.length,
    });
  } catch (error: any) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geographic data',
      error: error.message,
    });
  }
});

router.post('/geographic/track', async (req, res) => {
  try {
    const { country, region, city, metrics } = req.body;
    
    if (!country || !region || !city || !metrics) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: country, region, city, metrics',
      });
    }

    enhancedAnalytics.trackGeographicPerformance(country, region, city, metrics);
    
    res.json({
      success: true,
      message: 'Geographic performance tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking geographic performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track geographic performance',
      error: error.message,
    });
  }
});

// Predictive Analytics APIs
router.get('/predictions', async (req, res) => {
  try {
    const { type, timeframe } = req.query;
    let predictions = enhancedAnalytics.getAllPredictions();
    
    if (type) {
      predictions = predictions.filter(p => p.type === type);
    }
    
    if (timeframe) {
      predictions = predictions.filter(p => p.timeframe === timeframe);
    }

    res.json({
      success: true,
      data: predictions,
      count: predictions.length,
    });
  } catch (error: any) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions',
      error: error.message,
    });
  }
});

router.get('/predictions/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const prediction = enhancedAnalytics.getPrediction(predictionId);
    
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found',
      });
    }

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    console.error('Error fetching prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction',
      error: error.message,
    });
  }
});

router.post('/predictions/generate', async (req, res) => {
  try {
    const { type, timeframe, factors } = req.body;
    
    if (!type || !timeframe || !factors) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, timeframe, factors',
      });
    }

    if (!['revenue_forecast', 'user_churn', 'campaign_performance', 'conversion_prediction'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prediction type',
      });
    }

    if (!['7d', '30d', '90d', '1y'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe',
      });
    }

    const prediction = await enhancedAnalytics.generatePrediction(type, timeframe, factors);
    
    res.status(201).json({
      success: true,
      data: prediction,
      message: 'Prediction generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prediction',
      error: error.message,
    });
  }
});

// User Behavior APIs
router.get('/user-behavior/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const behaviors = enhancedAnalytics.getUserBehavior(userId);
    
    res.json({
      success: true,
      data: behaviors,
      count: behaviors.length,
    });
  } catch (error: any) {
    console.error('Error fetching user behavior:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user behavior',
      error: error.message,
    });
  }
});

router.post('/user-behavior/track', async (req, res) => {
  try {
    const { userId, sessionId, behavior } = req.body;
    
    if (!userId || !sessionId || !behavior) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, sessionId, behavior',
      });
    }

    enhancedAnalytics.trackUserBehavior(userId, sessionId, behavior);
    
    res.json({
      success: true,
      message: 'User behavior tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking user behavior:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track user behavior',
      error: error.message,
    });
  }
});

// Analytics Statistics API
router.get('/stats', async (req, res) => {
  try {
    const stats = enhancedAnalytics.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics stats',
      error: error.message,
    });
  }
});

// Export Analytics Data API
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    if (!['json', 'csv'].includes(format as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be: json or csv',
      });
    }

    const exportData = enhancedAnalytics.exportAnalyticsData(format as 'json' | 'csv');
    
    res.json({
      success: true,
      data: exportData,
      message: 'Analytics data exported successfully',
    });
  } catch (error: any) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: error.message,
    });
  }
});

// Analytics Dashboard API
router.get('/dashboard', async (req, res) => {
  try {
    const { type = 'overview' } = req.query;
    
    let dashboardData: any = {};
    
    switch (type) {
      case 'overview':
        dashboardData = {
          funnels: enhancedAnalytics.getAllConversionFunnels().slice(0, 5),
          cohorts: enhancedAnalytics.getAllCohortAnalyses().slice(0, 5),
          predictions: enhancedAnalytics.getAllPredictions().slice(0, 5),
          stats: enhancedAnalytics.getStats(),
        };
        break;
        
      case 'funnels':
        dashboardData = {
          funnels: enhancedAnalytics.getAllConversionFunnels(),
          totalFunnels: enhancedAnalytics.getAllConversionFunnels().length,
        };
        break;
        
      case 'cohorts':
        dashboardData = {
          cohorts: enhancedAnalytics.getAllCohortAnalyses(),
          totalCohorts: enhancedAnalytics.getAllCohortAnalyses().length,
        };
        break;
        
      case 'geographic':
        dashboardData = {
          geographicData: enhancedAnalytics.getAllGeographicData(),
          totalLocations: enhancedAnalytics.getAllGeographicData().length,
        };
        break;
        
      case 'predictions':
        dashboardData = {
          predictions: enhancedAnalytics.getAllPredictions(),
          totalPredictions: enhancedAnalytics.getAllPredictions().length,
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid dashboard type',
        });
    }
    
    res.json({
      success: true,
      data: dashboardData,
      type,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
    });
  }
});

export default router;
