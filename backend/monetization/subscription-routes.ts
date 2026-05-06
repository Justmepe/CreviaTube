import { Router } from 'express';
import { db } from '../core/database/connection';
import { communitySubscriptions } from '../../shared/community-monetization-schema';
import { users } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { rateLimiters } from '../middleware/rate-limiter';

const router = Router();
router.use(rateLimiters.api.middleware());

// ===== SUBSCRIPTION MANAGEMENT ROUTES =====

// Get user's current subscription
router.get('/current', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;

    const subscription = await db
      .select()
      .from(communitySubscriptions)
      .where(and(
        eq(communitySubscriptions.userId, userId),
        eq(communitySubscriptions.status, 'active')
      ))
      .limit(1);

    res.json({
      success: true,
      data: subscription[0] || null,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message,
    });
  }
});

// Create new subscription
router.post('/create', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      planType,
      amount,
      currency = 'USD',
      billingCycle,
      paymentMethod = 'stripe',
      stripeSubscriptionId
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!planType || !amount || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Plan type, amount, and billing cycle are required',
      });
    }

    // Validate plan type
    const validPlanTypes = ['premium', 'agency', 'enterprise'];
    if (!validPlanTypes.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Plan type must be one of: premium, agency, enterprise',
      });
    }

    // Validate billing cycle
    const validBillingCycles = ['monthly', 'yearly'];
    if (!validBillingCycles.includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Billing cycle must be one of: monthly, yearly',
      });
    }

    // Set features based on plan type
    const features = getPlanFeatures(planType);

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription
    const [newSubscription] = await db.insert(communitySubscriptions).values({
      userId,
      planType,
      amount: Number(amount),
      currency,
      billingCycle,
      paymentMethod,
      stripeSubscriptionId,
      features,
      status: 'active',
      startDate,
      endDate,
      autoRenew: true,
    }).returning();

    res.status(201).json({
      success: true,
      data: newSubscription,
      message: 'Subscription created successfully',
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message,
    });
  }
});

// Cancel subscription
router.put('/cancel', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;

    // Find active subscription
    const subscription = await db
      .select()
      .from(communitySubscriptions)
      .where(and(
        eq(communitySubscriptions.userId, userId),
        eq(communitySubscriptions.status, 'active')
      ))
      .limit(1);

    if (!subscription.length) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    // Update subscription status
    await db
      .update(communitySubscriptions)
      .set({
        status: 'cancelled',
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(eq(communitySubscriptions.id, subscription[0].id));

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
});

// Update subscription
router.put('/update', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      planType,
      amount,
      billingCycle,
      autoRenew
    } = req.body;

    const userId = req.user.id;

    // Find active subscription
    const subscription = await db
      .select()
      .from(communitySubscriptions)
      .where(and(
        eq(communitySubscriptions.userId, userId),
        eq(communitySubscriptions.status, 'active')
      ))
      .limit(1);

    if (!subscription.length) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    // Update subscription
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (planType) {
      updateData.planType = planType;
      updateData.features = getPlanFeatures(planType);
    }

    if (amount) updateData.amount = Number(amount);
    if (billingCycle) updateData.billingCycle = billingCycle;
    if (autoRenew !== undefined) updateData.autoRenew = autoRenew;

    await db
      .update(communitySubscriptions)
      .set(updateData)
      .where(eq(communitySubscriptions.id, subscription[0].id));

    res.json({
      success: true,
      message: 'Subscription updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message,
    });
  }
});

// Get subscription history
router.get('/history', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userId = req.user.id;

    const subscriptions = await db
      .select()
      .from(communitySubscriptions)
      .where(eq(communitySubscriptions.userId, userId))
      .orderBy(desc(communitySubscriptions.createdAt));

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history',
      error: error.message,
    });
  }
});

// Helper function to get plan features
function getPlanFeatures(planType: string) {
  switch (planType) {
    case 'premium':
      return {
        advancedAnalytics: true,
        priorityPlacement: true,
        advancedFilters: true,
        recommendations: true,
        exportData: true,
        noAds: true,
        whiteLabel: false,
        apiAccess: false,
        customIntegrations: false,
      };
    case 'agency':
      return {
        advancedAnalytics: true,
        priorityPlacement: true,
        advancedFilters: true,
        recommendations: true,
        exportData: true,
        noAds: true,
        whiteLabel: true,
        apiAccess: false,
        customIntegrations: false,
      };
    case 'enterprise':
      return {
        advancedAnalytics: true,
        priorityPlacement: true,
        advancedFilters: true,
        recommendations: true,
        exportData: true,
        noAds: true,
        whiteLabel: true,
        apiAccess: true,
        customIntegrations: true,
      };
    default:
      return {
        advancedAnalytics: false,
        priorityPlacement: false,
        advancedFilters: false,
        recommendations: false,
        exportData: false,
        noAds: false,
        whiteLabel: false,
        apiAccess: false,
        customIntegrations: false,
      };
  }
}

export default router;
