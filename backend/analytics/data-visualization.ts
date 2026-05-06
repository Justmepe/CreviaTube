import { cacheService } from '../cache';
// import { getWebSocketServer } from '../security/websocket-server';

// Data visualization interfaces
interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'funnel';
  title: string;
  description: string;
  dataSource: string;
  refreshInterval: number; // seconds
  isRealTime: boolean;
  options: ChartOptions;
  filters: ChartFilter[];
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  isActive: boolean;
}

interface ChartOptions {
  width: number;
  height: number;
  colors: string[];
  animation: boolean;
  legend: boolean;
  tooltips: boolean;
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales?: ChartScales;
  plugins?: ChartPlugins;
}

interface ChartScales {
  x?: ScaleConfig;
  y?: ScaleConfig;
}

interface ScaleConfig {
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  beginAtZero?: boolean;
  min?: number;
  max?: number;
  stepSize?: number;
  timeUnit?: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

interface ChartPlugins {
  title?: {
    display: boolean;
    text: string;
    font: {
      size: number;
      weight: string;
    };
  };
  legend?: {
    display: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip?: {
    enabled: boolean;
    mode: 'index' | 'point' | 'nearest' | 'x' | 'y';
  };
}

interface ChartFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label: string;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  metadata: ChartMetadata;
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

interface ChartMetadata {
  generatedAt: Date;
  dataPoints: number;
  timeRange: string;
  filters: ChartFilter[];
  refreshInterval: number;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  charts: string[]; // Chart IDs
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  isActive: boolean;
}

interface DashboardLayout {
  columns: number;
  rows: number;
  chartPositions: ChartPosition[];
}

interface ChartPosition {
  chartId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  data: number[][];
  metadata: HeatmapMetadata;
}

interface HeatmapMetadata {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  colorScale: string;
  minValue: number;
  maxValue: number;
  generatedAt: Date;
}

interface TrendAnalysis {
  id: string;
  metric: string;
  timeRange: string;
  data: TrendDataPoint[];
  analysis: TrendAnalysisResult;
  generatedAt: Date;
}

interface TrendDataPoint {
  timestamp: Date;
  value: number;
  change: number;
  changePercent: number;
}

interface TrendAnalysisResult {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  rSquared: number;
  confidence: number;
  seasonality: boolean;
  seasonalityPeriod?: number;
  forecast: TrendForecast;
}

interface TrendForecast {
  nextValue: number;
  confidenceInterval: [number, number];
  predictionDate: Date;
}

// Data Visualization Service
export class DataVisualizationService {
  private charts: Map<string, ChartConfig> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private realTimeData: Map<string, any[]> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultCharts();
    this.startRealTimeUpdates();
  }

  // Initialize default charts
  private initializeDefaultCharts(): void {
    // Revenue trend chart
    this.createChart({
      id: 'revenue_trend',
      type: 'line',
      title: 'Revenue Trend',
      description: 'Daily revenue trend over time',
      dataSource: 'analytics.revenue',
      refreshInterval: 300, // 5 minutes
      isRealTime: true,
      options: {
        width: 800,
        height: 400,
        colors: ['#4CAF50', '#2196F3', '#FF9800'],
        animation: true,
        legend: true,
        tooltips: true,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'time', timeUnit: 'day' },
          y: { type: 'linear', beginAtZero: true },
        },
      },
      filters: [],
      createdBy: 'system',
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    });

    // User activity heatmap
    this.createChart({
      id: 'user_activity_heatmap',
      type: 'heatmap',
      title: 'User Activity Heatmap',
      description: 'User activity by hour and day of week',
      dataSource: 'analytics.user_activity',
      refreshInterval: 600, // 10 minutes
      isRealTime: true,
      options: {
        width: 600,
        height: 400,
        colors: ['#E3F2FD', '#2196F3', '#0D47A1'],
        animation: true,
        legend: true,
        tooltips: true,
        responsive: true,
        maintainAspectRatio: false,
      },
      filters: [],
      createdBy: 'system',
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    });

    // Campaign performance bar chart
    this.createChart({
      id: 'campaign_performance',
      type: 'bar',
      title: 'Campaign Performance',
      description: 'Top performing campaigns by conversion rate',
      dataSource: 'analytics.campaigns',
      refreshInterval: 900, // 15 minutes
      isRealTime: false,
      options: {
        width: 800,
        height: 500,
        colors: ['#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39'],
        animation: true,
        legend: true,
        tooltips: true,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'category' },
          y: { type: 'linear', beginAtZero: true },
        },
      },
      filters: [
        { field: 'status', operator: 'equals', value: 'active', label: 'Active Campaigns Only' },
      ],
      createdBy: 'system',
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    });

    // User distribution pie chart
    this.createChart({
      id: 'user_distribution',
      type: 'pie',
      title: 'User Distribution',
      description: 'Distribution of users by type',
      dataSource: 'analytics.users',
      refreshInterval: 1800, // 30 minutes
      isRealTime: false,
      options: {
        width: 400,
        height: 400,
        colors: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'],
        animation: true,
        legend: true,
        tooltips: true,
        responsive: true,
        maintainAspectRatio: false,
      },
      filters: [],
      createdBy: 'system',
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    });

    console.log(`📊 Initialized ${this.charts.size} default charts`);
  }

  // Create chart
  createChart(config: ChartConfig): ChartConfig {
    this.charts.set(config.id, config);

    // Set up real-time updates if enabled
    if (config.isRealTime) {
      this.setupRealTimeUpdates(config);
    }

    // Cache chart
    this.cacheChart(config);

    console.log(`📊 Created chart: ${config.title} (${config.id})`);
    return config;
  }

  // Generate chart data
  async generateChartData(chartId: string, filters: ChartFilter[] = []): Promise<ChartData> {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart ${chartId} not found`);
    }

    const startTime = Date.now();

    // Generate data based on chart type and data source
    let chartData: ChartData;

    switch (chart.type) {
      case 'line':
        chartData = await this.generateLineChartData(chart, filters);
        break;
      case 'bar':
        chartData = await this.generateBarChartData(chart, filters);
        break;
      case 'pie':
        chartData = await this.generatePieChartData(chart, filters);
        break;
      case 'heatmap':
        chartData = await this.generateHeatmapData(chart, filters);
        break;
      case 'area':
        chartData = await this.generateAreaChartData(chart, filters);
        break;
      case 'scatter':
        chartData = await this.generateScatterChartData(chart, filters);
        break;
      default:
        throw new Error(`Unsupported chart type: ${chart.type}`);
    }

    // Update chart last updated time
    chart.lastUpdated = new Date();
    this.cacheChart(chart);

    // Broadcast real-time update if enabled
    if (chart.isRealTime) {
      this.broadcastChartUpdate(chartId, chartData);
    }

    console.log(`📊 Generated chart data for ${chart.title} in ${Date.now() - startTime}ms`);
    return chartData;
  }

  // Generate line chart data
  private async generateLineChartData(chart: ChartConfig, filters: ChartFilter[]): Promise<ChartData> {
    const days = 30;
    const labels = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return date.toISOString().split('T')[0];
    });

    const datasets = [
      {
        label: 'Revenue',
        data: Array.from({ length: days }, () => Math.floor(Math.random() * 10000) + 1000),
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Users',
        data: Array.from({ length: days }, () => Math.floor(Math.random() * 500) + 100),
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderColor: 'rgba(33, 150, 243, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ];

    return {
      labels,
      datasets,
      metadata: {
        generatedAt: new Date(),
        dataPoints: days,
        timeRange: `${days} days`,
        filters,
        refreshInterval: chart.refreshInterval,
      },
    };
  }

  // Generate bar chart data
  private async generateBarChartData(chart: ChartConfig, filters: ChartFilter[]): Promise<ChartData> {
    const labels = ['Campaign A', 'Campaign B', 'Campaign C', 'Campaign D', 'Campaign E'];
    
    const datasets = [
      {
        label: 'Conversions',
        data: Array.from({ length: labels.length }, () => Math.floor(Math.random() * 100) + 10),
        backgroundColor: 'rgba(255, 87, 34, 0.8)',
        borderColor: 'rgba(255, 87, 34, 1)',
        borderWidth: 1,
      },
      {
        label: 'Revenue',
        data: Array.from({ length: labels.length }, () => Math.floor(Math.random() * 5000) + 500),
        backgroundColor: 'rgba(255, 152, 0, 0.8)',
        borderColor: 'rgba(255, 152, 0, 1)',
        borderWidth: 1,
      },
    ];

    return {
      labels,
      datasets,
      metadata: {
        generatedAt: new Date(),
        dataPoints: labels.length,
        timeRange: 'Current period',
        filters,
        refreshInterval: chart.refreshInterval,
      },
    };
  }

  // Generate pie chart data
  private async generatePieChartData(chart: ChartConfig, filters: ChartFilter[]): Promise<ChartData> {
    const labels = ['Creators', 'Clippers', 'Admins', 'Guests'];
    
    const datasets = [
      {
        label: 'User Distribution',
        data: [45, 35, 15, 5],
        backgroundColor: [
          'rgba(76, 175, 80, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(255, 152, 0, 0.8)',
          'rgba(156, 39, 176, 0.8)',
        ],
        borderColor: [
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(156, 39, 176, 1)',
        ],
        borderWidth: 2,
      },
    ];

    return {
      labels,
      datasets,
      metadata: {
        generatedAt: new Date(),
        dataPoints: labels.length,
        timeRange: 'Current',
        filters,
        refreshInterval: chart.refreshInterval,
      },
    };
  }

  // Generate heatmap data
  private async generateHeatmapData(chart: ChartConfig, filters: ChartFilter[]): Promise<ChartData> {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString());
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const data = days.map(() => 
      Array.from({ length: 24 }, () => Math.floor(Math.random() * 100))
    );

    const datasets = [
      {
        label: 'User Activity',
        data: data.flat(),
        backgroundColor: data.flat().map(value => {
          const intensity = value / 100;
          return `rgba(33, 150, 243, ${intensity})`;
        }),
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    ];

    return {
      labels: hours,
      datasets,
      metadata: {
        generatedAt: new Date(),
        dataPoints: 168, // 24 * 7
        timeRange: 'Weekly',
        filters,
        refreshInterval: chart.refreshInterval,
      },
    };
  }

  // Generate area chart data
  private async generateAreaChartData(chart: ChartConfig, filters: ChartFilter[]): Promise<ChartData> {
    const days = 14;
    const labels = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return date.toISOString().split('T')[0];
    });

    const datasets = [
      {
        label: 'Active Users',
        data: Array.from({ length: days }, () => Math.floor(Math.random() * 1000) + 200),
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ];

    return {
      labels,
      datasets,
      metadata: {
        generatedAt: new Date(),
        dataPoints: days,
        timeRange: `${days} days`,
        filters,
        refreshInterval: chart.refreshInterval,
      },
    };
  }

  // Generate scatter chart data
  private async generateScatterChartData(chart: ChartConfig, filters: ChartFilter[]): Promise<ChartData> {
    const dataPoints = 50;
    const data = Array.from({ length: dataPoints }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));

    const datasets = [
      {
        label: 'Performance vs Engagement',
        data: data.map(point => point.y),
        backgroundColor: 'rgba(255, 152, 0, 0.6)',
        borderColor: 'rgba(255, 152, 0, 1)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ];

    return {
      labels: data.map(point => point.x.toString()),
      datasets,
      metadata: {
        generatedAt: new Date(),
        dataPoints,
        timeRange: 'Current',
        filters,
        refreshInterval: chart.refreshInterval,
      },
    };
  }

  // Create dashboard
  createDashboard(
    name: string,
    description: string,
    layout: DashboardLayout,
    charts: string[],
    createdBy: string
  ): Dashboard {
    const dashboard: Dashboard = {
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      layout,
      charts,
      createdBy,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.cacheDashboard(dashboard);

    console.log(`📊 Created dashboard: ${name} (${dashboard.id})`);
    return dashboard;
  }

  // Get dashboard data
  async getDashboardData(dashboardId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const chartData: Record<string, ChartData> = {};

    // Generate data for all charts in the dashboard
    for (const chartId of dashboard.charts) {
      try {
        chartData[chartId] = await this.generateChartData(chartId);
      } catch (error) {
        console.error(`Error generating data for chart ${chartId}:`, error);
      }
    }

    return {
      dashboard,
      chartData,
      generatedAt: new Date(),
    };
  }

  // Perform trend analysis
  async performTrendAnalysis(
    metric: string,
    timeRange: string,
    dataPoints: number = 30
  ): Promise<TrendAnalysis> {
    const data: TrendDataPoint[] = [];
    let previousValue = Math.random() * 1000 + 100;

    for (let i = 0; i < dataPoints; i++) {
      const change = (Math.random() - 0.5) * 100;
      const value = previousValue + change;
      const changePercent = (change / previousValue) * 100;

      data.push({
        timestamp: new Date(Date.now() - (dataPoints - 1 - i) * 24 * 60 * 60 * 1000),
        value,
        change,
        changePercent,
      });

      previousValue = value;
    }

    // Calculate trend analysis
    const analysis = this.calculateTrendAnalysis(data);

    const trendAnalysis: TrendAnalysis = {
      id: `trend_${metric}_${Date.now()}`,
      metric,
      timeRange,
      data,
      analysis,
      generatedAt: new Date(),
    };

    console.log(`📈 Performed trend analysis for ${metric}`);
    return trendAnalysis;
  }

  // Calculate trend analysis
  private calculateTrendAnalysis(data: TrendDataPoint[]): TrendAnalysisResult {
    const values = data.map(point => point.value);
    const n = values.length;

    // Calculate linear regression
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Determine direction
    const direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';

    // Calculate confidence (simplified)
    const confidence = Math.min(95, Math.max(50, rSquared * 100));

    // Detect seasonality (simplified)
    const seasonality = this.detectSeasonality(values);

    // Generate forecast
    const nextValue = slope * n + intercept;
    const confidenceInterval: [number, number] = [
      nextValue * 0.9,
      nextValue * 1.1,
    ];

    return {
      direction,
      slope,
      rSquared,
      confidence,
      seasonality,
      seasonalityPeriod: seasonality ? 7 : undefined, // Weekly seasonality
      forecast: {
        nextValue,
        confidenceInterval,
        predictionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
      },
    };
  }

  // Detect seasonality
  private detectSeasonality(values: number[]): boolean {
    // Simple seasonality detection (in production, use more sophisticated methods)
    if (values.length < 14) return false;

    const weeklyPatterns = [];
    for (let i = 7; i < values.length; i++) {
      const correlation = this.calculateCorrelation(
        values.slice(i - 7, i),
        values.slice(i, i + 7)
      );
      weeklyPatterns.push(correlation);
    }

    const averageCorrelation = weeklyPatterns.reduce((sum, val) => sum + val, 0) / weeklyPatterns.length;
    return averageCorrelation > 0.7;
  }

  // Calculate correlation
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    const numerator = x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0);
    const denominatorX = Math.sqrt(x.reduce((sum, val) => sum + Math.pow(val - meanX, 2), 0));
    const denominatorY = Math.sqrt(y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0));

    return numerator / (denominatorX * denominatorY);
  }

  // Set up real-time updates
  private setupRealTimeUpdates(chart: ChartConfig): void {
    const interval = setInterval(() => {
      this.updateRealTimeData(chart.id);
    }, chart.refreshInterval * 1000);

    this.updateIntervals.set(chart.id, interval);
  }

  // Update real-time data
  private async updateRealTimeData(chartId: string): Promise<void> {
    try {
      const chartData = await this.generateChartData(chartId);
      this.realTimeData.set(chartId, chartData.datasets[0].data);
      this.broadcastChartUpdate(chartId, chartData);
    } catch (error) {
      console.error(`Error updating real-time data for chart ${chartId}:`, error);
    }
  }

  // Broadcast chart update
  private broadcastChartUpdate(chartId: string, data: ChartData): void {
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastToRoom(`chart_${chartId}`, {
        type: 'chart_update',
        data: {
          chartId,
          data,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      });
    }
  }

  // Get charts
  getCharts(createdBy?: string): ChartConfig[] {
    let charts = Array.from(this.charts.values());
    if (createdBy) {
      charts = charts.filter(c => c.createdBy === createdBy);
    }
    return charts;
  }

  // Get dashboards
  getDashboards(createdBy?: string): Dashboard[] {
    let dashboards = Array.from(this.dashboards.values());
    if (createdBy) {
      dashboards = dashboards.filter(d => d.createdBy === createdBy);
    }
    return dashboards;
  }

  // Update chart
  updateChart(chartId: string, updates: Partial<ChartConfig>): ChartConfig | null {
    const chart = this.charts.get(chartId);
    if (!chart) return null;

    Object.assign(chart, updates);
    chart.lastUpdated = new Date();

    // Update real-time settings if changed
    if (updates.isRealTime !== undefined || updates.refreshInterval !== undefined) {
      this.updateRealTimeSettings(chart);
    }

    this.cacheChart(chart);
    return chart;
  }

  // Update real-time settings
  private updateRealTimeSettings(chart: ChartConfig): void {
    // Clear existing interval
    const existingInterval = this.updateIntervals.get(chart.id);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.updateIntervals.delete(chart.id);
    }

    // Set up new interval if real-time is enabled
    if (chart.isRealTime) {
      this.setupRealTimeUpdates(chart);
    }
  }

  // Delete chart
  deleteChart(chartId: string): boolean {
    const chart = this.charts.get(chartId);
    if (!chart) return false;

    // Clear real-time interval
    const interval = this.updateIntervals.get(chartId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(chartId);
    }

    this.charts.delete(chartId);
    this.realTimeData.delete(chartId);
    cacheService.delete(`chart:${chartId}`);

    console.log(`🗑️ Deleted chart: ${chart.title} (${chartId})`);
    return true;
  }

  // Cache methods
  private async cacheChart(chart: ChartConfig): Promise<void> {
    try {
      await cacheService.set(`chart:${chart.id}`, chart, 3600);
    } catch (error) {
      console.error('Error caching chart:', error);
    }
  }

  private async cacheDashboard(dashboard: Dashboard): Promise<void> {
    try {
      await cacheService.set(`dashboard:${dashboard.id}`, dashboard, 3600);
    } catch (error) {
      console.error('Error caching dashboard:', error);
    }
  }

  // Start real-time updates
  private startRealTimeUpdates(): void {
    this.charts.forEach(chart => {
      if (chart.isRealTime) {
        this.setupRealTimeUpdates(chart);
      }
    });
  }

  // Get service statistics
  getStats(): any {
    return {
      totalCharts: this.charts.size,
      totalDashboards: this.dashboards.size,
      realTimeCharts: Array.from(this.charts.values()).filter(c => c.isRealTime).length,
      activeIntervals: this.updateIntervals.size,
      realTimeDataPoints: Array.from(this.realTimeData.values()).reduce((sum, data) => sum + data.length, 0),
    };
  }

  // Cleanup
  cleanup(): void {
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    console.log('🧹 Cleaned up data visualization service');
  }
}

// Export singleton instance
export const dataVisualizationService = new DataVisualizationService();
