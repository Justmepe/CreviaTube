// Social Media API Integration Services
import { z } from "zod";

// Instagram Business API Integration
export class InstagramAPI {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  async getUserProfile(userId: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=account_type,media_count,followers_count&access_token=${this.accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getAccountInsights(userId: string, metrics: string[] = ['impressions', 'reach', 'profile_views']) {
    const metricsParam = metrics.join(',');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}/insights?metric=${metricsParam}&period=day&access_token=${this.accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`Instagram Insights API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getMediaInsights(mediaId: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=impressions,reach,engagement&access_token=${this.accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`Instagram Media Insights error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// YouTube Data API Integration
export class YouTubeAPI {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getChannelStatistics(channelId: string) {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${this.apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items?.[0];
  }
  
  async getChannelAnalytics(channelId: string, startDate: string, endDate: string) {
    // Note: This requires OAuth and channel ownership
    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==${channelId}&startDate=${startDate}&endDate=${endDate}&metrics=views,comments,likes,shares,estimatedMinutesWatched,averageViewDuration&key=${this.apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube Analytics API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// TikTok Business API Integration  
export class TikTokAPI {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  async getUserInfo(openId: string) {
    const response = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getVideoList(openId: string) {
    const response = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_count: 20,
          cursor: 0
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`TikTok Video List API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Twitter/X API Integration
export class TwitterAPI {
  private bearerToken: string;
  
  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }
  
  async getUserByUsername(username: string) {
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics,verified,created_at`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getUserTweets(userId: string) {
    const response = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=public_metrics,created_at&max_results=10`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Twitter Tweets API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Unified Social Media Metrics Aggregator
export class SocialMediaAggregator {
  async aggregateMetrics(socialAccounts: any) {
    const metrics: Record<string, any> = {};
    
    try {
      // Instagram Business Account
      if (socialAccounts?.instagram?.accessToken && socialAccounts.instagram.businessAccount) {
        const instagramAPI = new InstagramAPI(socialAccounts.instagram.accessToken);
        const profile = await instagramAPI.getUserProfile('me');
        const insights = await instagramAPI.getAccountInsights('me');
        
        metrics.instagram = {
          followers: profile.followers_count,
          posts: profile.media_count,
          impressions: insights.data?.find((d: any) => d.name === 'impressions')?.values?.[0]?.value || 0,
          reach: insights.data?.find((d: any) => d.name === 'reach')?.values?.[0]?.value || 0,
          engagementRate: this.calculateEngagementRate(insights, profile.followers_count),
        };
      }
      
      // YouTube Channel
      if (socialAccounts?.youtube?.channelId) {
        const youtubeAPI = new YouTubeAPI(process.env.YOUTUBE_API_KEY!);
        const channelData = await youtubeAPI.getChannelStatistics(socialAccounts.youtube.channelId);
        
        metrics.youtube = {
          subscribers: parseInt(channelData.statistics.subscriberCount),
          views: parseInt(channelData.statistics.viewCount),
          videos: parseInt(channelData.statistics.videoCount),
          // Note: Analytics require OAuth with channel ownership
        };
      }
      
      // TikTok Business Account
      if (socialAccounts?.tiktok?.accessToken) {
        const tiktokAPI = new TikTokAPI(socialAccounts.tiktok.accessToken);
        const userInfo = await tiktokAPI.getUserInfo('me');
        
        metrics.tiktok = {
          followers: userInfo.data?.user?.follower_count || 0,
          following: userInfo.data?.user?.following_count || 0,
          likes: userInfo.data?.user?.likes_count || 0,
          videos: userInfo.data?.user?.video_count || 0,
        };
      }
      
      // Twitter/X Account
      if (socialAccounts?.twitter?.username) {
        const twitterAPI = new TwitterAPI(process.env.TWITTER_BEARER_TOKEN!);
        const userData = await twitterAPI.getUserByUsername(socialAccounts.twitter.username);
        
        metrics.twitter = {
          followers: userData.data?.public_metrics?.followers_count || 0,
          following: userData.data?.public_metrics?.following_count || 0,
          tweets: userData.data?.public_metrics?.tweet_count || 0,
          listed: userData.data?.public_metrics?.listed_count || 0,
        };
      }
      
    } catch (error) {
      console.error('Social media metrics aggregation error:', error);
      throw error;
    }
    
    return metrics;
  }
  
  private calculateEngagementRate(insights: any, followers: number): number {
    const impressions = insights.data?.find((d: any) => d.name === 'impressions')?.values?.[0]?.value || 0;
    if (impressions === 0 || followers === 0) return 0;
    return (impressions / followers) * 100;
  }
}

// Social Media Metrics Schema for validation
export const socialMetricsSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook']),
  metrics: z.object({
    followers: z.number().optional(),
    following: z.number().optional(),
    posts: z.number().optional(),
    likes: z.number().optional(),
    comments: z.number().optional(),
    shares: z.number().optional(),
    views: z.number().optional(),
    engagementRate: z.number().optional(),
    subscribers: z.number().optional(),
    watchTime: z.number().optional(),
    impressions: z.number().optional(),
    reach: z.number().optional(),
    stories: z.number().optional(),
    reels: z.number().optional(),
  }),
});

export type SocialMetrics = z.infer<typeof socialMetricsSchema>;