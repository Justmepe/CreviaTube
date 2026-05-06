import { Router } from 'express';
import { customReportsService } from './custom-reports';
import { dataVisualizationService } from './data-visualization';
import { cacheService } from '../cache';
import { rateLimiters } from '../middleware/rate-limiter';

const router = Router();

// Apply rate limiting to visualization routes
router.use(rateLimiters.api.middleware());

// ===== CUSTOM REPORTS ROUTES =====

// Get all report templates
router.get('/reports/templates', async (req, res) => {
  try {
    const type = req.query.type as string;
    const templates = customReportsService.getReportTemplates(type);
    
    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report templates',
      error: error.message,
    });
  }
});

// Get custom reports
router.get('/reports', async (req, res) => {
  try {
    const createdBy = req.query.createdBy as string;
    const reports = customReportsService.getCustomReports(createdBy);
    
    res.json({
      success: true,
      data: reports,
      count: reports.length,
    });
  } catch (error: any) {
    console.error('Error fetching custom reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom reports',
      error: error.message,
    });
  }
});

// Create custom report
router.post('/reports', async (req, res) => {
  try {
    const {
      name,
      description,
      templateId,
      filters,
      columns,
      schedule,
    } = req.body;

    if (!name || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Name and templateId are required',
      });
    }

    const report = customReportsService.createCustomReport(
      name,
      description || '',
      templateId,
      filters || [],
      columns || [],
      req.user?.id || 'anonymous',
      schedule
    );

    res.status(201).json({
      success: true,
      data: report,
      message: 'Custom report created successfully',
    });
  } catch (error: any) {
    console.error('Error creating custom report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom report',
      error: error.message,
    });
  }
});

// Execute report
router.post('/reports/:reportId/execute', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { parameters, format } = req.body;

    const execution = await customReportsService.executeReport(
      reportId,
      parameters || {},
      format || 'json'
    );

    res.json({
      success: true,
      data: execution,
      message: 'Report execution started',
    });
  } catch (error: any) {
    console.error('Error executing report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute report',
      error: error.message,
    });
  }
});

// Get report executions
router.get('/reports/:reportId/executions', async (req, res) => {
  try {
    const { reportId } = req.params;
    const executions = customReportsService.getReportExecutions(reportId);
    
    res.json({
      success: true,
      data: executions,
      count: executions.length,
    });
  } catch (error: any) {
    console.error('Error fetching report executions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report executions',
      error: error.message,
    });
  }
});

// Update report
router.patch('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const updates = req.body;

    const report = customReportsService.updateReport(reportId, updates);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: report,
      message: 'Report updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message,
    });
  }
});

// Delete report
router.delete('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const deleted = customReportsService.deleteReport(reportId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error.message,
    });
  }
});

// ===== DATA VISUALIZATION ROUTES =====

// Get all charts
router.get('/charts', async (req, res) => {
  try {
    const createdBy = req.query.createdBy as string;
    const charts = dataVisualizationService.getCharts(createdBy);
    
    res.json({
      success: true,
      data: charts,
      count: charts.length,
    });
  } catch (error: any) {
    console.error('Error fetching charts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch charts',
      error: error.message,
    });
  }
});

// Create chart
router.post('/charts', async (req, res) => {
  try {
    const chartConfig = req.body;
    
    if (!chartConfig.title || !chartConfig.type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required',
      });
    }

    chartConfig.createdBy = req.user?.id || 'anonymous';
    chartConfig.createdAt = new Date();
    chartConfig.lastUpdated = new Date();
    chartConfig.isActive = true;

    const chart = dataVisualizationService.createChart(chartConfig);

    res.status(201).json({
      success: true,
      data: chart,
      message: 'Chart created successfully',
    });
  } catch (error: any) {
    console.error('Error creating chart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chart',
      error: error.message,
    });
  }
});

// Generate chart data
router.get('/charts/:chartId/data', async (req, res) => {
  try {
    const { chartId } = req.params;
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : [];

    const chartData = await dataVisualizationService.generateChartData(chartId, filters);

    res.json({
      success: true,
      data: chartData,
    });
  } catch (error: any) {
    console.error('Error generating chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate chart data',
      error: error.message,
    });
  }
});

// Update chart
router.patch('/charts/:chartId', async (req, res) => {
  try {
    const { chartId } = req.params;
    const updates = req.body;

    const chart = dataVisualizationService.updateChart(chartId, updates);
    
    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Chart not found',
      });
    }

    res.json({
      success: true,
      data: chart,
      message: 'Chart updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating chart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chart',
      error: error.message,
    });
  }
});

// Delete chart
router.delete('/charts/:chartId', async (req, res) => {
  try {
    const { chartId } = req.params;
    const deleted = dataVisualizationService.deleteChart(chartId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Chart not found',
      });
    }

    res.json({
      success: true,
      message: 'Chart deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting chart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chart',
      error: error.message,
    });
  }
});

// ===== DASHBOARD ROUTES =====

// Get all dashboards
router.get('/dashboards', async (req, res) => {
  try {
    const createdBy = req.query.createdBy as string;
    const dashboards = dataVisualizationService.getDashboards(createdBy);
    
    res.json({
      success: true,
      data: dashboards,
      count: dashboards.length,
    });
  } catch (error: any) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboards',
      error: error.message,
    });
  }
});

// Create dashboard
router.post('/dashboards', async (req, res) => {
  try {
    const { name, description, layout, charts } = req.body;
    
    if (!name || !layout || !charts) {
      return res.status(400).json({
        success: false,
        message: 'Name, layout, and charts are required',
      });
    }

    const dashboard = dataVisualizationService.createDashboard(
      name,
      description || '',
      layout,
      charts,
      req.user?.id || 'anonymous'
    );

    res.status(201).json({
      success: true,
      data: dashboard,
      message: 'Dashboard created successfully',
    });
  } catch (error: any) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard',
      error: error.message,
    });
  }
});

// Get dashboard data
router.get('/dashboards/:dashboardId/data', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const dashboardData = await dataVisualizationService.getDashboardData(dashboardId);

    res.json({
      success: true,
      data: dashboardData,
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

// ===== TREND ANALYSIS ROUTES =====

// Perform trend analysis
router.post('/trend-analysis', async (req, res) => {
  try {
    const { metric, timeRange, dataPoints } = req.body;
    
    if (!metric || !timeRange) {
      return res.status(400).json({
        success: false,
        message: 'Metric and timeRange are required',
      });
    }

    const analysis = await dataVisualizationService.performTrendAnalysis(
      metric,
      timeRange,
      dataPoints || 30
    );

    res.json({
      success: true,
      data: analysis,
      message: 'Trend analysis completed',
    });
  } catch (error: any) {
    console.error('Error performing trend analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform trend analysis',
      error: error.message,
    });
  }
});

// ===== STATISTICS ROUTES =====

// Get visualization statistics
router.get('/stats', async (req, res) => {
  try {
    const reportsStats = customReportsService.getStats();
    const visualizationStats = dataVisualizationService.getStats();

    const stats = {
      reports: reportsStats,
      visualization: visualizationStats,
      timestamp: new Date(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching visualization stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visualization stats',
      error: error.message,
    });
  }
});

// ===== CACHE MANAGEMENT =====

// Clear visualization cache
router.post('/cache/clear', async (req, res) => {
  try {
    const keys = await cacheService.keys('chart:*');
    const dashboardKeys = await cacheService.keys('dashboard:*');
    const reportKeys = await cacheService.keys('report:*');
    const executionKeys = await cacheService.keys('execution:*');

    const allKeys = [...keys, ...dashboardKeys, ...reportKeys, ...executionKeys];
    
    if (allKeys.length > 0) {
      await cacheService.del(...allKeys);
    }

    res.json({
      success: true,
      message: `Cleared ${allKeys.length} cached items`,
      clearedKeys: allKeys.length,
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message,
    });
  }
});

// Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const info = await cacheService.info();
    const dbsize = await cacheService.dbsize();
    
    const chartKeys = await cacheService.keys('chart:*');
    const dashboardKeys = await cacheService.keys('dashboard:*');
    const reportKeys = await cacheService.keys('report:*');
    const executionKeys = await cacheService.keys('execution:*');

    const stats = {
      totalKeys: dbsize,
      chartKeys: chartKeys.length,
      dashboardKeys: dashboardKeys.length,
      reportKeys: reportKeys.length,
      executionKeys: executionKeys.length,
      info,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cache stats',
      error: error.message,
    });
  }
});

export default router;
