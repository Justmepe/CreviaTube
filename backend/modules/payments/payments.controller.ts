import { Request, Response } from "express";
import { PaymentsService } from "./payments.service";

export class PaymentsController {
  private paymentsService: PaymentsService;

  constructor() {
    this.paymentsService = new PaymentsService();
  }

  /**
   * Test PesaPal authentication
   */
  testPesaPalAuth = async (req: Request, res: Response) => {
    try {
      const result = await this.paymentsService.testPesaPalAuth();
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            hasToken: result.hasToken,
            environment: result.environment,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to test PesaPal authentication",
        error: error.message
      });
    }
  };

  /**
   * Test campaign funding flow
   */
  testCampaignFunding = async (req: Request, res: Response) => {
    try {
      const { campaignId, amount, phoneNumber, email } = req.body;

      if (!campaignId || !amount || !phoneNumber || !email) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: campaignId, amount, phoneNumber, email"
        });
      }

      const result = await this.paymentsService.testCampaignFunding({
        campaignId,
        amount: parseFloat(amount),
        phoneNumber,
        email
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to test campaign funding",
        error: error.message
      });
    }
  };

  /**
   * Get escrow balance
   */
  getEscrowBalance = async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "Campaign ID is required"
        });
      }

      const result = await this.paymentsService.getEscrowBalance(campaignId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.balance
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get escrow balance",
        error: error.message
      });
    }
  };

  /**
   * Test clipper payout
   */
  testClipperPayout = async (req: Request, res: Response) => {
    try {
      const { clipperId, campaignId, amount, paymentMethod, phoneNumber, email } = req.body;

      if (!clipperId || !campaignId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: clipperId, campaignId, amount, paymentMethod"
        });
      }

      const result = await this.paymentsService.testClipperPayout({
        clipperId,
        campaignId,
        amount: parseFloat(amount),
        paymentMethod,
        phoneNumber,
        email
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to test clipper payout",
        error: error.message
      });
    }
  };

  /**
   * Handle PesaPal payment callback
   */
  handlePesaPalCallback = async (req: Request, res: Response) => {
    try {
      console.log('PesaPal Callback received:', req.query);
      
      const { OrderTrackingId, OrderMerchantReference } = req.query;
      
      if (!OrderTrackingId || !OrderMerchantReference) {
        return res.status(400).json({
          success: false,
          message: "Missing required callback parameters"
        });
      }

      // TODO: Implement proper callback handling
      // This should verify payment status with PesaPal and update database
      
      res.json({
        success: true,
        message: "Callback received successfully",
        data: {
          orderTrackingId: OrderTrackingId,
          merchantReference: OrderMerchantReference,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to handle PesaPal callback",
        error: error.message
      });
    }
  };
}