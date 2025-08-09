import { Router } from "express";

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Get user payment history
router.get("/history", requireAuth, async (req, res) => {
  try {
    // TODO: Implement payment history logic
    res.json({ message: "Payment history endpoint" });
  } catch (error) {
    console.error("Payment history error:", error);
    res.status(500).json({ message: "Failed to fetch payment history" });
  }
});

// Get user balance and earnings
router.get("/balance", requireAuth, async (req, res) => {
  try {
    // TODO: Implement balance check logic
    res.json({ message: "Payment balance endpoint" });
  } catch (error) {
    console.error("Payment balance error:", error);
    res.status(500).json({ message: "Failed to fetch balance" });
  }
});

// Request payout
router.post("/payout", requireAuth, async (req, res) => {
  try {
    // TODO: Implement payout request logic
    res.json({ message: "Payout request endpoint" });
  } catch (error) {
    console.error("Payout request error:", error);
    res.status(500).json({ message: "Failed to process payout request" });
  }
});

// Update payment methods
router.post("/methods", requireAuth, async (req, res) => {
  try {
    // TODO: Implement payment method update logic
    res.json({ message: "Payment methods endpoint" });
  } catch (error) {
    console.error("Payment methods error:", error);
    res.status(500).json({ message: "Failed to update payment methods" });
  }
});

// PesaPal payment callback (IPN - Instant Payment Notification)
router.get("/pesapal/callback", async (req, res) => {
  try {
    console.log('PesaPal Callback received:', req.query);
    
    const { OrderTrackingId, OrderMerchantReference } = req.query;
    
    if (!OrderTrackingId || !OrderMerchantReference) {
      console.error('Missing callback parameters:', req.query);
      return res.status(400).json({
        success: false,
        message: "Missing required callback parameters"
      });
    }

    // Import storage and EscrowService for payment verification
    const storage = require("../../storage").default;
    const { EscrowService } = require("../../core/services/escrow-service");
    const escrowService = new EscrowService();
    
    try {
      // Verify payment status with PesaPal
      const paymentStatus = await escrowService.verifyPesaPalPayment(OrderTrackingId as string);
      
      if (paymentStatus === "COMPLETED") {
        // Find campaign by tracking ID and mark as funded
        const campaign = await storage.getCampaignByTrackingId(OrderTrackingId as string);
        
        if (campaign) {
          await storage.updateCampaignFundingStatus(campaign.id, "funded");
          console.log(`Campaign ${campaign.id} successfully funded via PesaPal payment ${OrderTrackingId}`);
          
          res.json({
            success: true,
            message: "Payment verified and campaign funded",
            data: {
              campaignId: campaign.id,
              orderTrackingId: OrderTrackingId,
              merchantReference: OrderMerchantReference,
              status: "funded"
            }
          });
        } else {
          console.error(`Campaign not found for tracking ID: ${OrderTrackingId}`);
          res.status(404).json({
            success: false,
            message: "Campaign not found for tracking ID"
          });
        }
      } else {
        console.log(`Payment ${OrderTrackingId} status: ${paymentStatus}`);
        res.json({
          success: true,
          message: `Payment status: ${paymentStatus}`,
          data: {
            orderTrackingId: OrderTrackingId,
            merchantReference: OrderMerchantReference,
            status: paymentStatus
          }
        });
      }
      
    } catch (verifyError: any) {
      console.error('PesaPal verification error:', verifyError);
      res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error: verifyError.message
      });
    }
    
  } catch (error: any) {
    console.error('PesaPal callback error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to process PesaPal callback",
      error: error.message
    });
  }
});

// PesaPal test endpoints for development
router.post("/pesapal/test-auth", async (req, res) => {
  try {
    const { PaymentsService } = require("../../modules/payments/payments.service");
    const paymentsService = new PaymentsService();
    
    const result = await paymentsService.testPesaPalAuth();
    
    if (result.success) {
      res.json({
        success: true,
        message: "PesaPal authentication test successful",
        data: {
          hasToken: result.hasToken,
          environment: result.environment,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "PesaPal auth test failed",
      error: error.message
    });
  }
});

// Webhook for payment provider notifications
router.post("/webhook", async (req, res) => {
  try {
    // TODO: Implement payment webhook logic for other providers
    res.json({ message: "Payment webhook endpoint" });
  } catch (error) {
    console.error("Payment webhook error:", error);
    res.status(500).json({ message: "Failed to process webhook" });
  }
});

// Get escrow status for campaigns
router.get("/escrow/:campaignId", requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    // TODO: Implement escrow status logic
    res.json({ message: "Escrow status endpoint", campaignId });
  } catch (error) {
    console.error("Escrow status error:", error);
    res.status(500).json({ message: "Failed to fetch escrow status" });
  }
});

export { router as paymentsAPI };