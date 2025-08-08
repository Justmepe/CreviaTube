// Website Analytics API Integration Services
import { z } from "zod";

// Google Analytics 4 API Integration
export class GoogleAnalyticsAPI {
  private credentials: any;
  private propertyId: string;
  
  constructor(credentials: any, propertyId: string) {
    this.credentials = credentials;
    this.propertyId = propertyId;
  }
  
  async getRealtimeData() {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'conversions' }
          ],
          dimensions: [
            { name: 'country' },
            { name: 'deviceCategory' }
          ]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Analytics API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getTrafficData(startDate: string, endDate: string) {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' },
            { name: 'totalRevenue' }
          ],
          dimensions: [
            { name: 'date' },
            { name: 'sourceMedium' }
          ]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Analytics Report API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getConversionData(startDate: string, endDate: string) {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'conversions' },
            { name: 'totalRevenue' },
            { name: 'purchaseRevenue' },
            { name: 'itemsViewed' },
            { name: 'addToCarts' },
            { name: 'checkouts' },
            { name: 'purchases' }
          ],
          dimensions: [
            { name: 'eventName' },
            { name: 'sourceMedium' }
          ]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Analytics Conversion API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Facebook Pixel API Integration
export class FacebookPixelAPI {
  private accessToken: string;
  private pixelId: string;
  
  constructor(accessToken: string, pixelId: string) {
    this.accessToken = accessToken;
    this.pixelId = pixelId;
  }
  
  async getPixelStats(startDate: string, endDate: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.pixelId}/stats?start_date=${startDate}&end_date=${endDate}&access_token=${this.accessToken}`,
      {
        method: 'GET',
      }
    );
    
    if (!response.ok) {
      throw new Error(`Facebook Pixel API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getConversions(startDate: string, endDate: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.pixelId}/events?start_date=${startDate}&end_date=${endDate}&access_token=${this.accessToken}`,
      {
        method: 'GET',
      }
    );
    
    if (!response.ok) {
      throw new Error(`Facebook Pixel Events API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// HubSpot API Integration
export class HubSpotAPI {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getContacts(limit: number = 100) {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&hapikey=${this.apiKey}`,
      {
        method: 'GET',
      }
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot Contacts API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getDeals(limit: number = 100) {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals?limit=${limit}&hapikey=${this.apiKey}`,
      {
        method: 'GET',
      }
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot Deals API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getFormSubmissions(formId: string) {
    const response = await fetch(
      `https://api.hubapi.com/form-integrations/v1/submissions/forms/${formId}?hapikey=${this.apiKey}`,
      {
        method: 'GET',
      }
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot Forms API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Hotjar API Integration
export class HotjarAPI {
  private apiKey: string;
  private siteId: string;
  
  constructor(apiKey: string, siteId: string) {
    this.apiKey = apiKey;
    this.siteId = siteId;
  }
  
  async getHeatmaps() {
    const response = await fetch(
      `https://api.hotjar.com/v1/sites/${this.siteId}/heatmaps`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Hotjar API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getRecordings(limit: number = 20) {
    const response = await fetch(
      `https://api.hotjar.com/v1/sites/${this.siteId}/recordings?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Hotjar Recordings API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Website Analytics Aggregator
export class WebAnalyticsAggregator {
  async aggregateMetrics(businessIntegration: any) {
    const metrics: Record<string, any> = {};
    
    try {
      // Google Analytics 4
      if (businessIntegration?.googleAnalyticsId && process.env.GOOGLE_ANALYTICS_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_ANALYTICS_CREDENTIALS);
        const ga4API = new GoogleAnalyticsAPI(credentials, businessIntegration.googleAnalyticsId);
        
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [realtimeData, trafficData, conversionData] = await Promise.all([
          ga4API.getRealtimeData(),
          ga4API.getTrafficData(thirtyDaysAgo, today),
          ga4API.getConversionData(thirtyDaysAgo, today)
        ]);
        
        metrics.googleAnalytics = {
          activeUsers: realtimeData.rows?.[0]?.metricValues?.[0]?.value || 0,
          pageViews: this.extractGA4Metric(trafficData, 'screenPageViews'),
          sessions: this.extractGA4Metric(trafficData, 'sessions'),
          uniqueVisitors: this.extractGA4Metric(trafficData, 'totalUsers'),
          bounceRate: this.extractGA4Metric(trafficData, 'bounceRate'),
          avgSessionDuration: this.extractGA4Metric(trafficData, 'averageSessionDuration'),
          conversions: this.extractGA4Metric(conversionData, 'conversions'),
          revenue: this.extractGA4Metric(conversionData, 'totalRevenue'),
          conversionRate: this.calculateConversionRate(trafficData, conversionData),
        };
      }
      
      // Facebook Pixel
      if (businessIntegration?.facebookPixelId && process.env.FACEBOOK_ACCESS_TOKEN) {
        const pixelAPI = new FacebookPixelAPI(process.env.FACEBOOK_ACCESS_TOKEN, businessIntegration.facebookPixelId);
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [pixelStats, conversions] = await Promise.all([
          pixelAPI.getPixelStats(thirtyDaysAgo, today),
          pixelAPI.getConversions(thirtyDaysAgo, today)
        ]);
        
        metrics.facebookPixel = {
          impressions: pixelStats.data?.[0]?.impressions || 0,
          clicks: pixelStats.data?.[0]?.clicks || 0,
          conversions: conversions.data?.length || 0,
        };
      }
      
      // HubSpot CRM
      if (businessIntegration?.hubspotApiKey) {
        const hubspotAPI = new HubSpotAPI(businessIntegration.hubspotApiKey);
        
        const [contacts, deals] = await Promise.all([
          hubspotAPI.getContacts(),
          hubspotAPI.getDeals()
        ]);
        
        metrics.hubspot = {
          totalContacts: contacts.total || 0,
          totalDeals: deals.total || 0,
          recentContacts: contacts.results?.length || 0,
          recentDeals: deals.results?.length || 0,
        };
      }
      
    } catch (error) {
      console.error('Website analytics aggregation error:', error);
      throw error;
    }
    
    return metrics;
  }
  
  private extractGA4Metric(data: any, metricName: string): number {
    const metricIndex = data.metricHeaders?.findIndex((header: any) => header.name === metricName);
    if (metricIndex === -1 || !data.rows?.[0]?.metricValues?.[metricIndex]) return 0;
    return parseFloat(data.rows[0].metricValues[metricIndex].value) || 0;
  }
  
  private calculateConversionRate(trafficData: any, conversionData: any): number {
    const sessions = this.extractGA4Metric(trafficData, 'sessions');
    const conversions = this.extractGA4Metric(conversionData, 'conversions');
    if (sessions === 0) return 0;
    return (conversions / sessions) * 100;
  }
}

// Website Metrics Schema
export const websiteMetricsSchema = z.object({
  websiteUrl: z.string().url(),
  metrics: z.object({
    pageViews: z.number().optional(),
    uniqueVisitors: z.number().optional(),
    sessions: z.number().optional(),
    bounceRate: z.number().optional(),
    avgSessionDuration: z.number().optional(),
    conversions: z.number().optional(),
    conversionRate: z.number().optional(),
    leads: z.number().optional(),
    purchases: z.number().optional(),
    revenue: z.number().optional(),
  }),
});

export type WebsiteMetrics = z.infer<typeof websiteMetricsSchema>;