import { EscrowService } from "../../core/services/escrow-service";

export class PaymentsService {
  private escrowService: EscrowService;

  constructor() {
    this.escrowService = new EscrowService();
  }

  /**
   * Test PesaPal authentication with sandbox credentials
   */
  async testPesaPalAuth() {
    try {
      const authToken = await (this.escrowService as any).getPesaPalAuthToken();
      return {
        success: true,
        message: "PesaPal authentication successful",
        hasToken: !!authToken,
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox"
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Test complete campaign funding flow
   */
  async testCampaignFunding(testData: {
    campaignId: string;
    amount: number;
    phoneNumber: string;
    email: string;
  }) {
    try {
      const result = await this.escrowService.fundCampaign(testData.campaignId, {
        method: "mobile_money",
        phoneNumber: testData.phoneNumber,
        email: testData.email
      });

      return {
        success: true,
        result,
        message: "Campaign funding initiated successfully"
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Check escrow balance for a campaign
   */
  async getEscrowBalance(campaignId: string) {
    try {
      const balance = await this.escrowService.getEscrowBalance(campaignId);
      return {
        success: true,
        balance,
        message: "Escrow balance retrieved successfully"
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Test automatic payout to clipper
   */
  async testClipperPayout(testData: {
    clipperId: string;
    campaignId: string;
    amount: number;
    paymentMethod: string;
    phoneNumber?: string;
    email?: string;
  }) {
    try {
      const result = await this.escrowService.processClipperPayout(
        testData.clipperId,
        testData.campaignId,
        testData.amount,
        testData.paymentMethod,
        {
          phoneNumber: testData.phoneNumber,
          email: testData.email
        }
      );

      return {
        success: true,
        result,
        message: "Clipper payout processed successfully"
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }
}