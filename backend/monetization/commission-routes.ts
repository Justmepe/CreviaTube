import { Router } from 'express';
import { db } from '../core/database/connection';
import { communityCommissions } from '../../shared/community-monetization-schema';
import { communities } from '../../shared/community-schema';
import { users } from '../../shared/schema';
import { eq, and, desc, gte, lte, sum } from 'drizzle-orm';
import { rateLimiters } from '../middleware/rate-limiter';

const router = Router();
router.use(rateLimiters.api.middleware());

// ===== COMMISSION TRACKING ROUTES =====

// Track a new commission
router.post('/track', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      communityId,
      commissionType,
      platform,
      amount,
      commissionRate,
      platformTransactionId
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!communityId || !commissionType || !platform || !amount || !commissionRate) {
      return res.status(400).json({
        success: false,
        message: 'Community ID, commission type, platform, amount, and commission rate are required',
      });
    }

    // Validate commission type
    const validCommissionTypes = ['membership', 'event', 'merchandise', 'course'];
    if (!validCommissionTypes.includes(commissionType)) {
      return res.status(400).json({
        success: false,
        message: 'Commission type must be one of: membership, event, merchandise, course',
      });
    }

    // Validate platform
    const validPlatforms = ['whop', 'skool', 'custom'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Platform must be one of: whop, skool, custom',
      });
    }

    // Calculate commission amount
    const commissionAmount = (Number(amount) * Number(commissionRate)) / 100;

    // Create commission record
    const [newCommission] = await db.insert(communityCommissions).values({
      communityId,
      userId,
      commissionType,
      platform,
      amount: Number(amount),
      commissionRate: Number(commissionRate),
      commissionAmount,
      currency: 'USD',
      status: 'pending',
      platformTransactionId,
    }).returning();

    res.status(201).json({
      success: true,
      data: newCommission,
      message: 'Commission tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track commission',
      error: error.message,
    });
  }
});

// Get user's commission earnings
router.get('/earnings', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;
    const { startDate, endDate, status } = req.query;

    // Build where conditions
    const whereConditions = [eq(communityCommissions.userId, userId)];
    
    if (startDate) {
      whereConditions.push(gte(communityCommissions.createdAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      whereConditions.push(lte(communityCommissions.createdAt, new Date(endDate as string)));
    }
    
    if (status) {
      whereConditions.push(eq(communityCommissions.status, status as string));
    }

    const commissions = await db
      .select({
        id: communityCommissions.id,
        commissionType: communityCommissions.commissionType,
        platform: communityCommissions.platform,
        amount: communityCommissions.amount,
        commissionRate: communityCommissions.commissionRate,
        commissionAmount: communityCommissions.commissionAmount,
        currency: communityCommissions.currency,
        status: communityCommissions.status,
        createdAt: communityCommissions.createdAt,
        community: {
          id: communities.id,
          name: communities.name,
          platform: communities.platform,
        }
      })
      .from(communityCommissions)
      .leftJoin(communities, eq(communityCommissions.communityId, communities.id))
      .where(and(...whereConditions))
      .orderBy(desc(communityCommissions.createdAt));

    // Calculate totals
    const totalEarnings = commissions.reduce((sum, commission) => {
      return sum + Number(commission.commissionAmount);
    }, 0);

    const pendingEarnings = commissions
      .filter(commission => commission.status === 'pending')
      .reduce((sum, commission) => {
        return sum + Number(commission.commissionAmount);
      }, 0);

    const paidEarnings = commissions
      .filter(commission => commission.status === 'paid')
      .reduce((sum, commission) => {
        return sum + Number(commission.commissionAmount);
      }, 0);

    res.json({
      success: true,
      data: {
        commissions,
        summary: {
          totalEarnings,
          pendingEarnings,
          paidEarnings,
          totalCommissions: commissions.length,
        }
      },
    });
  } catch (error: any) {
    console.error('Error fetching commission earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission earnings',
      error: error.message,
    });
  }
});

// Get commission analytics
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

    // Get commissions for the period
    const commissions = await db
      .select()
      .from(communityCommissions)
      .where(and(
        eq(communityCommissions.userId, userId),
        gte(communityCommissions.createdAt, startDate)
      ));

    // Calculate analytics
    const totalEarnings = commissions.reduce((sum, commission) => {
      return sum + Number(commission.commissionAmount);
    }, 0);

    const earningsByPlatform = commissions.reduce((acc, commission) => {
      const platform = commission.platform;
      if (!acc[platform]) {
        acc[platform] = 0;
      }
      acc[platform] += Number(commission.commissionAmount);
      return acc;
    }, {} as Record<string, number>);

    const earningsByType = commissions.reduce((acc, commission) => {
      const type = commission.commissionType;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += Number(commission.commissionAmount);
      return acc;
    }, {} as Record<string, number>);

    const statusBreakdown = commissions.reduce((acc, commission) => {
      const status = commission.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += Number(commission.commissionAmount);
      return acc;
    }, {} as Record<string, number>);

    // Calculate daily earnings for the last 30 days
    const dailyEarnings = [];
    for (let i = 0; i < Number(period); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCommissions = commissions.filter(commission => {
        const commissionDate = new Date(commission.createdAt);
        return commissionDate >= dayStart && commissionDate <= dayEnd;
      });

      const dayEarnings = dayCommissions.reduce((sum, commission) => {
        return sum + Number(commission.commissionAmount);
      }, 0);

      dailyEarnings.unshift({
        date: date.toISOString().split('T')[0],
        earnings: dayEarnings,
        count: dayCommissions.length,
      });
    }

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        totalEarnings,
        earningsByPlatform,
        earningsByType,
        statusBreakdown,
        dailyEarnings,
        totalCommissions: commissions.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching commission analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission analytics',
      error: error.message,
    });
  }
});

// Update commission status
router.put('/:id/status', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { status, paidAt } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['pending', 'paid', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: pending, paid, failed',
      });
    }

    // Check if commission exists and belongs to user
    const commission = await db
      .select()
      .from(communityCommissions)
      .where(and(
        eq(communityCommissions.id, id),
        eq(communityCommissions.userId, userId)
      ))
      .limit(1);

    if (!commission.length) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found or access denied',
      });
    }

    // Update commission status
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'paid' && paidAt) {
      updateData.paidAt = new Date(paidAt);
    }

    await db
      .update(communityCommissions)
      .set(updateData)
      .where(eq(communityCommissions.id, id));

    res.json({
      success: true,
      message: 'Commission status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating commission status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update commission status',
      error: error.message,
    });
  }
});

// Get commission by ID
router.get('/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const commission = await db
      .select({
        id: communityCommissions.id,
        commissionType: communityCommissions.commissionType,
        platform: communityCommissions.platform,
        amount: communityCommissions.amount,
        commissionRate: communityCommissions.commissionRate,
        commissionAmount: communityCommissions.commissionAmount,
        currency: communityCommissions.currency,
        status: communityCommissions.status,
        platformTransactionId: communityCommissions.platformTransactionId,
        paidAt: communityCommissions.paidAt,
        createdAt: communityCommissions.createdAt,
        community: {
          id: communities.id,
          name: communities.name,
          platform: communities.platform,
        }
      })
      .from(communityCommissions)
      .leftJoin(communities, eq(communityCommissions.communityId, communities.id))
      .where(and(
        eq(communityCommissions.id, id),
        eq(communityCommissions.userId, userId)
      ))
      .limit(1);

    if (!commission.length) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found or access denied',
      });
    }

    res.json({
      success: true,
      data: commission[0],
    });
  } catch (error: any) {
    console.error('Error fetching commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission',
      error: error.message,
    });
  }
});

export default router;
