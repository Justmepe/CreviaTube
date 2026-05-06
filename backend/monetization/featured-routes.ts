import { Router } from 'express';
import { db } from '../core/database/connection';
import { communityFeatures } from '../../shared/community-monetization-schema';
import { communities } from '../../shared/community-schema';
import { users } from '../../shared/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { rateLimiters } from '../middleware/rate-limiter';

const router = Router();
router.use(rateLimiters.api.middleware());

// ===== FEATURED PLACEMENT & VERIFICATION ROUTES =====

// Purchase featured placement
router.post('/purchase', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      communityId,
      featureType,
      amount,
      currency = 'USD',
      duration = 30, // days
      stripePaymentIntentId
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!communityId || !featureType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Community ID, feature type, and amount are required',
      });
    }

    // Validate feature type
    const validFeatureTypes = ['verification', 'featured', 'banner', 'sponsored'];
    if (!validFeatureTypes.includes(featureType)) {
      return res.status(400).json({
        success: false,
        message: 'Feature type must be one of: verification, featured, banner, sponsored',
      });
    }

    // Check if community exists and belongs to user
    const community = await db
      .select()
      .from(communities)
      .where(and(
        eq(communities.id, communityId),
        eq(communities.creatorId, userId)
      ))
      .limit(1);

    if (!community.length) {
      return res.status(404).json({
        success: false,
        message: 'Community not found or access denied',
      });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Create featured placement
    const [newFeature] = await db.insert(communityFeatures).values({
      communityId,
      featureType,
      amount: Number(amount),
      currency,
      status: 'active',
      startDate,
      endDate,
      paymentStatus: 'paid',
      stripePaymentIntentId,
    }).returning();

    // Update community verification status if it's a verification feature
    if (featureType === 'verification') {
      await db
        .update(communities)
        .set({
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(communities.id, communityId));
    }

    res.status(201).json({
      success: true,
      data: newFeature,
      message: 'Featured placement purchased successfully',
    });
  } catch (error: any) {
    console.error('Error purchasing featured placement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase featured placement',
      error: error.message,
    });
  }
});

// Get user's featured placements
router.get('/my-features', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;
    const { status } = req.query;

    // Build where conditions
    const whereConditions = [eq(communities.creatorId, userId)];
    
    if (status) {
      whereConditions.push(eq(communityFeatures.status, status as string));
    }

    const features = await db
      .select({
        id: communityFeatures.id,
        featureType: communityFeatures.featureType,
        amount: communityFeatures.amount,
        currency: communityFeatures.currency,
        status: communityFeatures.status,
        startDate: communityFeatures.startDate,
        endDate: communityFeatures.endDate,
        paymentStatus: communityFeatures.paymentStatus,
        createdAt: communityFeatures.createdAt,
        community: {
          id: communities.id,
          name: communities.name,
          platform: communities.platform,
          isVerified: communities.isVerified,
        }
      })
      .from(communityFeatures)
      .leftJoin(communities, eq(communityFeatures.communityId, communities.id))
      .where(and(...whereConditions))
      .orderBy(desc(communityFeatures.createdAt));

    res.json({
      success: true,
      data: features,
    });
  } catch (error: any) {
    console.error('Error fetching featured placements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured placements',
      error: error.message,
    });
  }
});

// Get active featured communities for discovery
router.get('/active', async (req, res) => {
  try {
    const { featureType, limit = 10 } = req.query;

    // Build where conditions
    const whereConditions = [
      eq(communityFeatures.status, 'active'),
      gte(communityFeatures.endDate, new Date())
    ];
    
    if (featureType) {
      whereConditions.push(eq(communityFeatures.featureType, featureType as string));
    }

    const features = await db
      .select({
        id: communityFeatures.id,
        featureType: communityFeatures.featureType,
        startDate: communityFeatures.startDate,
        endDate: communityFeatures.endDate,
        community: {
          id: communities.id,
          name: communities.name,
          description: communities.description,
          platform: communities.platform,
          platformUrl: communities.platformUrl,
          price: communities.price,
          currency: communities.currency,
          memberCount: communities.memberCount,
          maxMembers: communities.maxMembers,
          tags: communities.tags,
          category: communities.category,
          isVerified: communities.isVerified,
          coverImage: communities.coverImage,
          createdAt: communities.createdAt,
          creator: {
            id: users.id,
            username: users.username,
            fullName: users.fullName,
          }
        }
      })
      .from(communityFeatures)
      .leftJoin(communities, eq(communityFeatures.communityId, communities.id))
      .leftJoin(users, eq(communities.creatorId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(communityFeatures.createdAt))
      .limit(Number(limit));

    res.json({
      success: true,
      data: features,
    });
  } catch (error: any) {
    console.error('Error fetching active featured communities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active featured communities',
      error: error.message,
    });
  }
});

// Cancel featured placement
router.put('/:id/cancel', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Check if feature exists and belongs to user
    const feature = await db
      .select()
      .from(communityFeatures)
      .leftJoin(communities, eq(communityFeatures.communityId, communities.id))
      .where(and(
        eq(communityFeatures.id, id),
        eq(communities.creatorId, userId)
      ))
      .limit(1);

    if (!feature.length) {
      return res.status(404).json({
        success: false,
        message: 'Featured placement not found or access denied',
      });
    }

    // Update feature status
    await db
      .update(communityFeatures)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(communityFeatures.id, id));

    // Remove verification if it was a verification feature
    if (feature[0].communityFeatures.featureType === 'verification') {
      await db
        .update(communities)
        .set({
          isVerified: false,
          updatedAt: new Date(),
        })
        .where(eq(communities.id, feature[0].communityFeatures.communityId));
    }

    res.json({
      success: true,
      message: 'Featured placement cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling featured placement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel featured placement',
      error: error.message,
    });
  }
});

// Get featured placement analytics
router.get('/analytics', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    // Get features for the period
    const features = await db
      .select({
        id: communityFeatures.id,
        featureType: communityFeatures.featureType,
        amount: communityFeatures.amount,
        currency: communityFeatures.currency,
        status: communityFeatures.status,
        startDate: communityFeatures.startDate,
        endDate: communityFeatures.endDate,
        createdAt: communityFeatures.createdAt,
        community: {
          id: communities.id,
          name: communities.name,
        }
      })
      .from(communityFeatures)
      .leftJoin(communities, eq(communityFeatures.communityId, communities.id))
      .where(and(
        eq(communities.creatorId, userId),
        gte(communityFeatures.createdAt, startDate)
      ));

    // Calculate analytics
    const totalSpent = features.reduce((sum, feature) => {
      return sum + Number(feature.amount);
    }, 0);

    const spendingByType = features.reduce((acc, feature) => {
      const type = feature.featureType;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += Number(feature.amount);
      return acc;
    }, {} as Record<string, number>);

    const statusBreakdown = features.reduce((acc, feature) => {
      const status = feature.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += Number(feature.amount);
      return acc;
    }, {} as Record<string, number>);

    const activeFeatures = features.filter(feature => 
      feature.status === 'active' && new Date(feature.endDate) >= new Date()
    );

    // Calculate daily spending for the last 30 days
    const dailySpending = [];
    for (let i = 0; i < Number(period); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayFeatures = features.filter(feature => {
        const featureDate = new Date(feature.createdAt);
        return featureDate >= dayStart && featureDate <= dayEnd;
      });

      const daySpending = dayFeatures.reduce((sum, feature) => {
        return sum + Number(feature.amount);
      }, 0);

      dailySpending.unshift({
        date: date.toISOString().split('T')[0],
        spending: daySpending,
        count: dayFeatures.length,
      });
    }

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        totalSpent,
        spendingByType,
        statusBreakdown,
        dailySpending,
        activeFeatures: activeFeatures.length,
        totalFeatures: features.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching featured placement analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured placement analytics',
      error: error.message,
    });
  }
});

// Get pricing information
router.get('/pricing', async (req, res) => {
  try {
    const pricing = {
      verification: {
        basic: {
          price: 99,
          currency: 'USD',
          duration: 'lifetime',
          features: [
            'Verified badge on community',
            'Increased trust and credibility',
            'Priority in search results',
            'Basic verification process'
          ]
        },
        premium: {
          price: 199,
          currency: 'USD',
          duration: '1 year',
          features: [
            'All basic verification features',
            'Advanced analytics dashboard',
            'Priority customer support',
            'Featured placement for 30 days'
          ]
        }
      },
      featured: {
        standard: {
          price: 49,
          currency: 'USD',
          duration: '30 days',
          features: [
            'Featured placement in discovery',
            'Increased visibility',
            'Priority in search results',
            'Featured badge'
          ]
        },
        premium: {
          price: 199,
          currency: 'USD',
          duration: '30 days',
          features: [
            'Homepage banner placement',
            'Maximum visibility',
            'Priority in all search results',
            'Premium featured badge',
            'Analytics dashboard access'
          ]
        }
      },
      sponsored: {
        standard: {
          price: 299,
          currency: 'USD',
          duration: '30 days',
          features: [
            'Sponsored discovery placement',
            'Targeted audience reach',
            'Advanced analytics',
            'Custom promotion period'
          ]
        }
      }
    };

    res.json({
      success: true,
      data: pricing,
    });
  } catch (error: any) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing',
      error: error.message,
    });
  }
});

export default router;
