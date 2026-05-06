import { cacheService } from '../cache';
import { getWebSocketServer } from '../security/websocket-server';

// Custom reports interfaces
interface CustomReport {
  id: string;
  name: string;
  description: string;
  type: 'analytics' | 'financial' | 'user' | 'campaign' | 'performance';
  template: ReportTemplate;
  schedule?: ReportSchedule;
  filters: ReportFilter[];
  columns: ReportColumn[];
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  isActive: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'analytics' | 'financial' | 'user' | 'campaign' | 'performance';
  defaultFilters: ReportFilter[];
  defaultColumns: ReportColumn[];
  query: string;
  parameters: ReportParameter[];
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label: string;
}

interface ReportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  sortable: boolean;
  filterable: boolean;
  aggregatable: boolean;
  format?: string;
}

interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: any[];
  label: string;
}

interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  isActive: boolean;
}

interface ReportExecution {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  data?: any;
  error?: string;
  fileUrl?: string;
  fileSize?: number;
}

interface ReportData {
  columns: ReportColumn[];
  rows: any[];
  summary: ReportSummary;
  metadata: ReportMetadata;
}

interface ReportSummary {
  totalRows: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  aggregations: Record<string, any>;
}

interface ReportMetadata {
  generatedAt: Date;
  filters: ReportFilter[];
  parameters: Record<string, any>;
  executionTime: number;
}

// Custom Reports Service
export class CustomReportsService {
  private reports: Map<string, CustomReport> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private executions: Map<string, ReportExecution> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeTemplates();
    this.loadScheduledReports();
  }

  // Initialize default report templates
  private initializeTemplates(): void {
    // Analytics templates
    this.templates.set('user_analytics', {
      id: 'user_analytics',
      name: 'User Analytics Report',
      description: 'Comprehensive user behavior and engagement analytics',
      type: 'analytics',
      defaultFilters: [
        { field: 'registrationDate', operator: 'between', value: null, label: 'Registration Date Range' },
        { field: 'accountType', operator: 'in', value: [], label: 'User Types' },
      ],
      defaultColumns: [
        { field: 'userId', label: 'User ID', type: 'string', sortable: true, filterable: true, aggregatable: false },
        { field: 'username', label: 'Username', type: 'string', sortable: true, filterable: true, aggregatable: false },
        { field: 'registrationDate', label: 'Registration Date', type: 'date', sortable: true, filterable: true, aggregatable: false },
        { field: 'totalCampaigns', label: 'Total Campaigns', type: 'number', sortable: true, filterable: true, aggregatable: true },
        { field: 'totalRevenue', label: 'Total Revenue', type: 'currency', sortable: true, filterable: true, aggregatable: true },
        { field: 'engagementScore', label: 'Engagement Score', type: 'percentage', sortable: true, filterable: true, aggregatable: true },
      ],
      query: 'SELECT * FROM users WHERE registrationDate BETWEEN ? AND ?',
      parameters: [
        { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
        { name: 'endDate', type: 'date', required: true, label: 'End Date' },
      ],
    });

    this.templates.set('campaign_performance', {
      id: 'campaign_performance',
      name: 'Campaign Performance Report',
      description: 'Detailed campaign performance metrics and analysis',
      type: 'campaign',
      defaultFilters: [
        { field: 'campaignStatus', operator: 'in', value: ['active', 'completed'], label: 'Campaign Status' },
        { field: 'budget', operator: 'greater_than', value: 0, label: 'Minimum Budget' },
      ],
      defaultColumns: [
        { field: 'campaignId', label: 'Campaign ID', type: 'string', sortable: true, filterable: true, aggregatable: false },
        { field: 'campaignName', label: 'Campaign Name', type: 'string', sortable: true, filterable: true, aggregatable: false },
        { field: 'creatorName', label: 'Creator', type: 'string', sortable: true, filterable: true, aggregatable: false },
        { field: 'budget', label: 'Budget', type: 'currency', sortable: true, filterable: true, aggregatable: true },
        { field: 'impressions', label: 'Impressions', type: 'number', sortable: true, filterable: true, aggregatable: true },
        { field: 'clicks', label: 'Clicks', type: 'number', sortable: true, filterable: true, aggregatable: true },
        { field: 'conversions', label: 'Conversions', type: 'number', sortable: true, filterable: true, aggregatable: true },
        { field: 'ctr', label: 'CTR', type: 'percentage', sortable: true, filterable: true, aggregatable: true },
        { field: 'conversionRate', label: 'Conversion Rate', type: 'percentage', sortable: true, filterable: true, aggregatable: true },
        { field: 'roi', label: 'ROI', type: 'percentage', sortable: true, filterable: true, aggregatable: true },
      ],
      query: 'SELECT * FROM campaigns WHERE status IN (?) AND budget > ?',
      parameters: [
        { name: 'statuses', type: 'select', required: true, options: ['active', 'completed', 'paused'], label: 'Campaign Statuses' },
        { name: 'minBudget', type: 'number', required: false, defaultValue: 0, label: 'Minimum Budget' },
      ],
    });

    this.templates.set('financial_summary', {
      id: 'financial_summary',
      name: 'Financial Summary Report',
      description: 'Comprehensive financial performance and revenue analysis',
      type: 'financial',
      defaultFilters: [
        { field: 'dateRange', operator: 'between', value: null, label: 'Date Range' },
        { field: 'transactionType', operator: 'in', value: [], label: 'Transaction Types' },
      ],
      defaultColumns: [
        { field: 'date', label: 'Date', type: 'date', sortable: true, filterable: true, aggregatable: false },
        { field: 'transactionType', label: 'Transaction Type', type: 'string', sortable: true, filterable: true, aggregatable: false },
        { field: 'amount', label: 'Amount', type: 'currency', sortable: true, filterable: true, aggregatable: true },
        { field: 'fee', label: 'Fee', type: 'currency', sortable: true, filterable: true, aggregatable: true },
        { field: 'netAmount', label: 'Net Amount', type: 'currency', sortable: true, filterable: true, aggregatable: true },
        { field: 'status', label: 'Status', type: 'string', sortable: true, filterable: true, aggregatable: false },
      ],
      query: 'SELECT * FROM transactions WHERE date BETWEEN ? AND ? AND type IN (?)',
      parameters: [
        { name: 'startDate', type: 'date', required: true, label: 'Start Date' },
        { name: 'endDate', type: 'date', required: true, label: 'End Date' },
        { name: 'transactionTypes', type: 'select', required: true, options: ['payout', 'commission', 'fee'], label: 'Transaction Types' },
      ],
    });

    console.log(`📊 Initialized ${this.templates.size} report templates`);
  }

  // Create custom report
  createCustomReport(
    name: string,
    description: string,
    templateId: string,
    filters: ReportFilter[],
    columns: ReportColumn[],
    createdBy: string,
    schedule?: ReportSchedule
  ): CustomReport {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const report: CustomReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type: template.type,
      template,
      schedule,
      filters: filters.length > 0 ? filters : template.defaultFilters,
      columns: columns.length > 0 ? columns : template.defaultColumns,
      createdBy,
      createdAt: new Date(),
      isActive: true,
    };

    this.reports.set(report.id, report);

    // Set up scheduled execution if schedule is provided
    if (schedule && schedule.isActive) {
      this.setupScheduledReport(report);
    }

    // Cache report
    this.cacheReport(report);

    console.log(`📊 Created custom report: ${name} (${report.id})`);
    return report;
  }

  // Execute report
  async executeReport(
    reportId: string,
    parameters: Record<string, any> = {},
    format: 'json' | 'csv' | 'excel' | 'pdf' = 'json'
  ): Promise<ReportExecution> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const execution: ReportExecution = {
      id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      status: 'pending',
      startedAt: new Date(),
    };

    this.executions.set(execution.id, execution);

    try {
      execution.status = 'running';
      
      // Simulate report execution
      const data = await this.generateReportData(report, parameters);
      const fileUrl = await this.exportReportData(data, format, execution.id);

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.data = data;
      execution.fileUrl = fileUrl;
      execution.fileSize = JSON.stringify(data).length;

      // Update report last run
      report.lastRun = new Date();
      this.cacheReport(report);

      console.log(`📊 Report executed successfully: ${report.name} (${execution.id})`);
    } catch (error: any) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error.message;
      console.error(`❌ Report execution failed: ${report.name}`, error);
    }

    // Cache execution
    this.cacheExecution(execution);

    return execution;
  }

  // Generate report data
  private async generateReportData(report: CustomReport, parameters: Record<string, any>): Promise<ReportData> {
    const startTime = Date.now();

    // Simulate data generation based on report type
    let rows: any[] = [];
    let aggregations: Record<string, any> = {};

    switch (report.type) {
      case 'analytics':
        rows = await this.generateAnalyticsData(report, parameters);
        aggregations = this.calculateAnalyticsAggregations(rows);
        break;
      case 'campaign':
        rows = await this.generateCampaignData(report, parameters);
        aggregations = this.calculateCampaignAggregations(rows);
        break;
      case 'financial':
        rows = await this.generateFinancialData(report, parameters);
        aggregations = this.calculateFinancialAggregations(rows);
        break;
      case 'user':
        rows = await this.generateUserData(report, parameters);
        aggregations = this.calculateUserAggregations(rows);
        break;
      case 'performance':
        rows = await this.generatePerformanceData(report, parameters);
        aggregations = this.calculatePerformanceAggregations(rows);
        break;
    }

    const executionTime = Date.now() - startTime;

    const reportData: ReportData = {
      columns: report.columns,
      rows,
      summary: {
        totalRows: rows.length,
        totalPages: Math.ceil(rows.length / 100),
        currentPage: 1,
        pageSize: 100,
        aggregations,
      },
      metadata: {
        generatedAt: new Date(),
        filters: report.filters,
        parameters,
        executionTime,
      },
    };

    return reportData;
  }

  // Generate analytics data
  private async generateAnalyticsData(report: CustomReport, parameters: Record<string, any>): Promise<any[]> {
    // Simulate analytics data
    return Array.from({ length: 50 }, (_, i) => ({
      userId: `user_${i + 1}`,
      username: `user${i + 1}`,
      registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      totalCampaigns: Math.floor(Math.random() * 20) + 1,
      totalRevenue: Math.floor(Math.random() * 10000) + 100,
      engagementScore: Math.random() * 100,
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    }));
  }

  // Generate campaign data
  private async generateCampaignData(report: CustomReport, parameters: Record<string, any>): Promise<any[]> {
    // Simulate campaign data
    return Array.from({ length: 30 }, (_, i) => ({
      campaignId: `campaign_${i + 1}`,
      campaignName: `Campaign ${i + 1}`,
      creatorName: `Creator ${i + 1}`,
      budget: Math.floor(Math.random() * 5000) + 500,
      impressions: Math.floor(Math.random() * 100000) + 1000,
      clicks: Math.floor(Math.random() * 5000) + 100,
      conversions: Math.floor(Math.random() * 500) + 10,
      ctr: Math.random() * 10,
      conversionRate: Math.random() * 5,
      roi: Math.random() * 200 - 50,
      status: ['active', 'completed', 'paused'][Math.floor(Math.random() * 3)],
    }));
  }

  // Generate financial data
  private async generateFinancialData(report: CustomReport, parameters: Record<string, any>): Promise<any[]> {
    // Simulate financial data
    return Array.from({ length: 100 }, (_, i) => ({
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      transactionType: ['payout', 'commission', 'fee'][Math.floor(Math.random() * 3)],
      amount: Math.floor(Math.random() * 1000) + 10,
      fee: Math.floor(Math.random() * 50) + 1,
      netAmount: Math.floor(Math.random() * 950) + 9,
      status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)],
    }));
  }

  // Generate user data
  private async generateUserData(report: CustomReport, parameters: Record<string, any>): Promise<any[]> {
    // Simulate user data
    return Array.from({ length: 200 }, (_, i) => ({
      userId: `user_${i + 1}`,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      accountType: ['creator', 'clipper', 'admin'][Math.floor(Math.random() * 3)],
      isVerified: Math.random() > 0.3,
      totalEarnings: Math.floor(Math.random() * 5000) + 0,
    }));
  }

  // Generate performance data
  private async generatePerformanceData(report: CustomReport, parameters: Record<string, any>): Promise<any[]> {
    // Simulate performance data
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      requests: Math.floor(Math.random() * 1000) + 100,
      responseTime: Math.random() * 500 + 50,
      errorRate: Math.random() * 5,
      activeUsers: Math.floor(Math.random() * 500) + 50,
      cpuUsage: Math.random() * 80 + 20,
      memoryUsage: Math.random() * 60 + 40,
    }));
  }

  // Calculate aggregations for different report types
  private calculateAnalyticsAggregations(rows: any[]): Record<string, any> {
    return {
      totalUsers: rows.length,
      averageRevenue: rows.reduce((sum, row) => sum + row.totalRevenue, 0) / rows.length,
      totalCampaigns: rows.reduce((sum, row) => sum + row.totalCampaigns, 0),
      averageEngagement: rows.reduce((sum, row) => sum + row.engagementScore, 0) / rows.length,
    };
  }

  private calculateCampaignAggregations(rows: any[]): Record<string, any> {
    return {
      totalCampaigns: rows.length,
      totalBudget: rows.reduce((sum, row) => sum + row.budget, 0),
      totalImpressions: rows.reduce((sum, row) => sum + row.impressions, 0),
      totalClicks: rows.reduce((sum, row) => sum + row.clicks, 0),
      totalConversions: rows.reduce((sum, row) => sum + row.conversions, 0),
      averageCTR: rows.reduce((sum, row) => sum + row.ctr, 0) / rows.length,
      averageROI: rows.reduce((sum, row) => sum + row.roi, 0) / rows.length,
    };
  }

  private calculateFinancialAggregations(rows: any[]): Record<string, any> {
    return {
      totalTransactions: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
      totalFees: rows.reduce((sum, row) => sum + row.fee, 0),
      totalNetAmount: rows.reduce((sum, row) => sum + row.netAmount, 0),
      averageTransaction: rows.reduce((sum, row) => sum + row.amount, 0) / rows.length,
    };
  }

  private calculateUserAggregations(rows: any[]): Record<string, any> {
    return {
      totalUsers: rows.length,
      verifiedUsers: rows.filter(row => row.isVerified).length,
      creators: rows.filter(row => row.accountType === 'creator').length,
      clippers: rows.filter(row => row.accountType === 'clipper').length,
      totalEarnings: rows.reduce((sum, row) => sum + row.totalEarnings, 0),
    };
  }

  private calculatePerformanceAggregations(rows: any[]): Record<string, any> {
    return {
      totalRequests: rows.reduce((sum, row) => sum + row.requests, 0),
      averageResponseTime: rows.reduce((sum, row) => sum + row.responseTime, 0) / rows.length,
      averageErrorRate: rows.reduce((sum, row) => sum + row.errorRate, 0) / rows.length,
      peakActiveUsers: Math.max(...rows.map(row => row.activeUsers)),
      averageCPUUsage: rows.reduce((sum, row) => sum + row.cpuUsage, 0) / rows.length,
    };
  }

  // Export report data
  private async exportReportData(data: ReportData, format: string, executionId: string): Promise<string> {
    // Simulate file export
    const fileName = `report_${executionId}.${format}`;
    const fileUrl = `/exports/${fileName}`;
    
    // In production, this would save to file system or cloud storage
    console.log(`📄 Exported report to: ${fileUrl}`);
    
    return fileUrl;
  }

  // Set up scheduled report
  private setupScheduledReport(report: CustomReport): void {
    if (!report.schedule || !report.schedule.isActive) return;

    const interval = this.calculateScheduleInterval(report.schedule);
    if (interval) {
      const job = setInterval(() => {
        this.executeScheduledReport(report);
      }, interval);

      this.scheduledJobs.set(report.id, job);
      console.log(`⏰ Scheduled report: ${report.name} (${report.schedule?.frequency})`);
    }
  }

  // Calculate schedule interval
  private calculateScheduleInterval(schedule: ReportSchedule): number | null {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    switch (schedule.frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      case 'quarterly':
        return 90 * 24 * 60 * 60 * 1000; // 90 days
      case 'yearly':
        return 365 * 24 * 60 * 60 * 1000; // 365 days
      default:
        return null;
    }
  }

  // Execute scheduled report
  private async executeScheduledReport(report: CustomReport): Promise<void> {
    try {
      const execution = await this.executeReport(report.id, {}, report.schedule?.format || 'pdf');
      
      // Send to recipients
      if (report.schedule?.recipients) {
        await this.sendScheduledReport(report, execution);
      }
    } catch (error) {
      console.error(`❌ Scheduled report execution failed: ${report.name}`, error);
    }
  }

  // Send scheduled report
  private async sendScheduledReport(report: CustomReport, execution: ReportExecution): Promise<void> {
    // In production, this would send emails with report attachments
    console.log(`📧 Sending scheduled report ${report.name} to ${report.schedule?.recipients.length} recipients`);
  }

  // Load scheduled reports
  private loadScheduledReports(): void {
    this.reports.forEach(report => {
      if (report.schedule && report.schedule.isActive) {
        this.setupScheduledReport(report);
      }
    });
  }

  // Get report templates
  getReportTemplates(type?: string): ReportTemplate[] {
    let templates = Array.from(this.templates.values());
    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    return templates;
  }

  // Get custom reports
  getCustomReports(createdBy?: string): CustomReport[] {
    let reports = Array.from(this.reports.values());
    if (createdBy) {
      reports = reports.filter(r => r.createdBy === createdBy);
    }
    return reports;
  }

  // Get report executions
  getReportExecutions(reportId?: string): ReportExecution[] {
    let executions = Array.from(this.executions.values());
    if (reportId) {
      executions = executions.filter(e => e.reportId === reportId);
    }
    return executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  // Update report
  updateReport(reportId: string, updates: Partial<CustomReport>): CustomReport | null {
    const report = this.reports.get(reportId);
    if (!report) return null;

    Object.assign(report, updates);
    report.lastRun = new Date();

    // Update schedule if changed
    if (updates.schedule) {
      this.updateScheduledReport(report);
    }

    this.cacheReport(report);
    return report;
  }

  // Update scheduled report
  private updateScheduledReport(report: CustomReport): void {
    // Clear existing schedule
    const existingJob = this.scheduledJobs.get(report.id);
    if (existingJob) {
      clearInterval(existingJob);
      this.scheduledJobs.delete(report.id);
    }

    // Set up new schedule
    if (report.schedule && report.schedule.isActive) {
      this.setupScheduledReport(report);
    }
  }

  // Delete report
  deleteReport(reportId: string): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    // Clear scheduled job
    const job = this.scheduledJobs.get(reportId);
    if (job) {
      clearInterval(job);
      this.scheduledJobs.delete(reportId);
    }

    this.reports.delete(reportId);
    this.cacheService.delete(`report:${reportId}`);

    console.log(`🗑️ Deleted report: ${report.name} (${reportId})`);
    return true;
  }

  // Cache methods
  private async cacheReport(report: CustomReport): Promise<void> {
    try {
      await cacheService.set(`report:${report.id}`, report, 3600);
    } catch (error) {
      console.error('Error caching report:', error);
    }
  }

  private async cacheExecution(execution: ReportExecution): Promise<void> {
    try {
      await cacheService.set(`execution:${execution.id}`, execution, 3600);
    } catch (error) {
      console.error('Error caching execution:', error);
    }
  }

  // Get service statistics
  getStats(): any {
    return {
      totalReports: this.reports.size,
      totalTemplates: this.templates.size,
      totalExecutions: this.executions.size,
      scheduledReports: Array.from(this.reports.values()).filter(r => r.schedule?.isActive).length,
      activeJobs: this.scheduledJobs.size,
    };
  }

  // Cleanup old executions
  cleanupOldExecutions(daysToKeep: number = 30): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    this.executions.forEach((execution, id) => {
      if (execution.completedAt && execution.completedAt < cutoffDate) {
        this.executions.delete(id);
        cacheService.delete(`execution:${id}`);
      }
    });

    console.log(`🧹 Cleaned up old report executions (older than ${daysToKeep} days)`);
  }
}

// Export singleton instance
export const customReportsService = new CustomReportsService();
