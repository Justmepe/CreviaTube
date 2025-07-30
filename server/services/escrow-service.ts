import { db } from "../db";
import { budgetEscrow, autoPayments, campaigns, trackingEvents, users, payouts, clipperCampaigns } from "@shared/schema";
import { eq, and, sum } from "drizzle-orm";
interface PesaPalConfig {
  consumerKey: string;
  consumerSecret: string;
  baseUrl: string;
  isSandbox: boolean;
}

let pesapalConfig: PesaPalConfig | null = null;

if (process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET) {
  pesapalConfig = {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY,
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
    baseUrl: process.env.PESAPAL_BASE_URL || "https://pay.pesapal.com/v3",
    isSandbox: process.env.NODE_ENV !== "production",
  };
}

export class EscrowService {
  /**
   * Creates escrow account and processes payment for campaign funding
   * Platform takes 20%, remaining 80% goes to escrow for automatic clipper payments
   */
  async fundCampaign(campaignId: string, paymentData: { method: string; phoneNumber?: string; email?: string }) {
    if (!pesapalConfig) {
      throw new Error("PesaPal not configured. Please provide PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.");
    }
    
    try {
      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      if (campaign.status !== "draft") {
        throw new Error("Only draft campaigns can be funded");
      }

      const totalAmountUSD = parseFloat(campaign.budget);
      
      // Convert USD to KES (approximate rate: 1 USD = 130 KES)
      const usdToKesRate = 130;
      const totalAmountKES = totalAmountUSD * usdToKesRate;
      
      const platformFeeAmountUSD = totalAmountUSD * 0.20; // 20% platform fee
      const escrowAmountUSD = totalAmountUSD * 0.80; // 80% for clippers

      // Process payment through PesaPal (sandbox mode for development)
      const paymentResult = await this.processPesaPalPayment({
        amount: totalAmountKES, // Convert to KES for PesaPal
        currency: "KES", // Kenya Shillings
        description: `Campaign funding: ${campaign.name} ($${totalAmountUSD} USD)`,
        campaignId: campaign.id,
        creatorId: campaign.creatorId,
        paymentMethod: paymentData.method,
        phoneNumber: paymentData.phoneNumber,
        email: paymentData.email,
      });

      if (paymentResult.status !== "success") {
        throw new Error("Payment failed. Please try again.");
      }

      // Note: DO NOT mark campaign as funded yet - wait for payment confirmation
      // PesaPal will call our callback endpoint when payment is confirmed
      
      // Store payment initiation details for tracking
      const paymentReference = `campaign_${campaign.id}_${Date.now()}`;
      
      // Update campaign with payment tracking info but keep as pending
      await db
        .update(campaigns)
        .set({
          fundingStatus: "payment_initiated", // New status for tracking
          paymentTrackingId: paymentResult.transactionId,
          paymentReference: paymentReference,
        })
        .where(eq(campaigns.id, campaign.id));

      return {
        success: true,
        totalAmountUSD: totalAmountUSD,
        totalAmountKES: totalAmountKES,
        escrowAmountUSD: escrowAmountUSD,
        platformFeeAmountUSD: platformFeeAmountUSD,
        transactionId: paymentResult.transactionId,
        redirectUrl: paymentResult.redirectUrl,
        paymentReference: paymentReference,
      };

    } catch (error: any) {
      console.error('Campaign funding error:', error);
      throw new Error(error.message || "Failed to fund campaign");
    }
  }

  /**
   * Verifies payment status with PesaPal API
   */
  async verifyPesaPalPayment(trackingId: string): Promise<string> {
    if (!pesapalConfig) {
      throw new Error("PesaPal not configured");
    }

    try {
      const authToken = await this.getPesaPalAuthToken();
      
      const response = await fetch(`${pesapalConfig.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`PesaPal verification failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('PesaPal verification result:', result);
      
      return result.payment_status_description || "PENDING";
    } catch (error: any) {
      console.error('PesaPal verification error:', error);
      throw new Error(error.message || "Payment verification failed");
    }
  }

  /**
   * Confirms campaign funding after successful payment verification
   */
  async confirmCampaignFunding(campaignId: string, transactionId: string): Promise<void> {
    try {
      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const totalAmountUSD = parseFloat(campaign.budget);
      const platformFeeAmountUSD = totalAmountUSD * 0.20;
      const escrowAmountUSD = totalAmountUSD * 0.80;

      // Create escrow record
      const [escrowRecord] = await db
        .insert(budgetEscrow)
        .values({
          campaignId: campaign.id,
          creatorId: campaign.creatorId,
          totalAmount: totalAmountUSD.toString(),
          escrowAmount: escrowAmountUSD.toString(),
          platformFeeAmount: platformFeeAmountUSD.toString(),
          availableBalance: escrowAmountUSD.toString(),
          lockedBalance: "0",
          status: "active",
          paymentMethod: "pesapal",
          transactionId: transactionId,
          isLocked: true,
        })
        .returning();

      // Update campaign to funded status
      await db
        .update(campaigns)
        .set({
          status: "active", // Mark as active once funded
          fundingStatus: "funded",
          fundedAt: new Date(),
          escrowBalance: escrowAmountUSD.toString(),
          platformFee: platformFeeAmountUSD.toString(),
        })
        .where(eq(campaigns.id, campaign.id));

      console.log(`Campaign ${campaignId} successfully funded with escrow ${escrowRecord.id}`);
    } catch (error: any) {
      console.error('Campaign funding confirmation error:', error);
      throw new Error(error.message || "Failed to confirm campaign funding");
    }
  }

  /**
   * Automatically processes payment to clipper when tracking event is verified
   * Deducts from escrow balance and schedules immediate payment
   */
  async processAutomaticPayment(eventId: string) {
    try {
      // Get tracking event details
      const [trackingEvent] = await db
        .select({
          id: trackingEvents.id,
          clipperId: trackingEvents.clipperId,
          campaignId: trackingEvents.campaignId,
          rewardAmount: trackingEvents.rewardAmount,
          status: trackingEvents.status,
        })
        .from(trackingEvents)
        .where(eq(trackingEvents.id, eventId));

      if (!trackingEvent) {
        throw new Error("Tracking event not found");
      }

      if (trackingEvent.status !== "verified") {
        throw new Error("Only verified events can trigger payments");
      }

      if (!trackingEvent.rewardAmount) {
        throw new Error("No reward amount specified");
      }

      // Get escrow details for the campaign
      const [escrow] = await db
        .select()
        .from(budgetEscrow)
        .where(and(
          eq(budgetEscrow.campaignId, trackingEvent.campaignId),
          eq(budgetEscrow.status, "active")
        ));

      if (!escrow) {
        throw new Error("No active escrow found for campaign");
      }

      const rewardAmount = parseFloat(trackingEvent.rewardAmount);
      const availableBalance = parseFloat(escrow.availableBalance);

      if (availableBalance < rewardAmount) {
        throw new Error("Insufficient escrow balance for payment");
      }

      // Get clipper's payment preferences
      const [clipper] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          mpesaNumber: users.mpesaNumber,
        })
        .from(users)
        .where(eq(users.id, trackingEvent.clipperId));

      if (!clipper) {
        throw new Error("Clipper not found");
      }

      // Determine payment method (prioritize M-Pesa for Kenya, fallback to email for PayPal)
      let paymentMethod = "paypal";
      let paymentDetails = JSON.stringify({ email: clipper.email });

      if (clipper.mpesaNumber) {
        paymentMethod = "mobile_money";
        paymentDetails = JSON.stringify({ 
          phoneNumber: clipper.mpesaNumber,
          provider: "mpesa" 
        });
      }

      // Create auto-payment record
      const [autoPayment] = await db
        .insert(autoPayments)
        .values({
          escrowId: escrow.id,
          clipperId: trackingEvent.clipperId,
          campaignId: trackingEvent.campaignId,
          eventId: trackingEvent.id,
          amount: rewardAmount.toString(),
          status: "pending",
          paymentMethod,
          paymentDetails,
          scheduledAt: new Date(), // Process immediately
        })
        .returning();

      // Update escrow balance (lock the reward amount)
      const newAvailableBalance = availableBalance - rewardAmount;
      const newLockedBalance = parseFloat(escrow.lockedBalance) + rewardAmount;

      await db
        .update(budgetEscrow)
        .set({
          availableBalance: newAvailableBalance.toString(),
          lockedBalance: newLockedBalance.toString(),
        })
        .where(eq(budgetEscrow.id, escrow.id));

      // Update tracking event status to paid
      await db
        .update(trackingEvents)
        .set({ status: "paid" })
        .where(eq(trackingEvents.id, eventId));

      // Process the actual payment immediately
      await this.executePayment(autoPayment.id);

      return {
        success: true,
        paymentId: autoPayment.id,
        amount: rewardAmount,
        paymentMethod,
        clipperName: clipper.fullName,
      };

    } catch (error: any) {
      console.error('Automatic payment error:', error);
      throw new Error(error.message || "Failed to process automatic payment");
    }
  }

  /**
   * Executes the actual payment to clipper via their preferred method
   */
  private async executePayment(autoPaymentId: string) {
    try {
      const [payment] = await db
        .select({
          id: autoPayments.id,
          amount: autoPayments.amount,
          paymentMethod: autoPayments.paymentMethod,
          paymentDetails: autoPayments.paymentDetails,
          clipperId: autoPayments.clipperId,
          status: autoPayments.status,
        })
        .from(autoPayments)
        .where(eq(autoPayments.id, autoPaymentId));

      if (!payment || payment.status !== "pending") {
        throw new Error("Invalid payment record");
      }

      const amount = parseFloat(payment.amount);
      const details = JSON.parse(payment.paymentDetails || "{}");

      let transactionId = "";
      
      if (payment.paymentMethod === "mobile_money" && details.phoneNumber) {
        // For M-Pesa integration, you would integrate with Safaricom API
        // This is a placeholder for the actual M-Pesa implementation
        transactionId = await this.processMpesaPayment(details.phoneNumber, amount);
        
      } else if (payment.paymentMethod === "paypal" && details.email) {
        // For PayPal integration, you would use PayPal API
        // This is a placeholder for the actual PayPal implementation
        transactionId = await this.processPayPalPayment(details.email, amount);
        
      } else {
        throw new Error("Unsupported payment method");
      }

      // Update payment status
      await db
        .update(autoPayments)
        .set({
          status: "completed",
          processedAt: new Date(),
        })
        .where(eq(autoPayments.id, autoPaymentId));

      // Update escrow (move from locked to completed)
      const [escrow] = await db
        .select()
        .from(budgetEscrow)
        .where(eq(budgetEscrow.id, payment.escrowId));

      if (escrow) {
        const newLockedBalance = parseFloat(escrow.lockedBalance) - amount;
        await db
          .update(budgetEscrow)
          .set({
            lockedBalance: Math.max(0, newLockedBalance).toString(),
          })
          .where(eq(budgetEscrow.id, escrow.id));
      }

      return transactionId;

    } catch (error: any) {
      // Mark payment as failed and unlock the funds
      await db
        .update(autoPayments)
        .set({
          status: "failed",
          failureReason: error.message,
          retryCount: payment.retryCount + 1,
        })
        .where(eq(autoPayments.id, autoPaymentId));

      throw error;
    }
  }

  /**
   * Placeholder for M-Pesa payment processing
   * In production, integrate with Safaricom Daraja API
   */
  private async processMpesaPayment(phoneNumber: string, amount: number): Promise<string> {
    // This would integrate with Safaricom Daraja API
    // For now, we'll simulate success
    console.log(`Processing M-Pesa payment: ${amount} to ${phoneNumber}`);
    return `MPESA${Date.now()}`;
  }



  /**
   * Processes PesaPal payment for campaign funding
   */
  private async processPesaPalPayment(paymentData: {
    amount: number;
    currency: string;
    description: string;
    campaignId: string;
    creatorId: string;
    paymentMethod: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<{ status: string; transactionId: string; redirectUrl?: string }> {
    try {
      // Generate authentication token
      const authToken = await this.getPesaPalAuthToken();
      
      // First register IPN
      const ipnId = await this.registerPesaPalIPN();
      
      const pesapalPayment = {
        id: `campaign_${paymentData.campaignId}_${Date.now()}`,
        currency: paymentData.currency,
        amount: paymentData.amount,
        description: paymentData.description,
        callback_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://localhost:5000'}/api/pesapal/callback`,
        redirect_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://localhost:5000'}/campaigns/${paymentData.campaignId}/funding?status=success`,
        notification_id: ipnId,
        billing_address: {
          email_address: paymentData.email,
          phone_number: paymentData.phoneNumber,
          country_code: "KE",
          first_name: "Campaign",
          last_name: "Creator",
        }
      };

      const response = await fetch(`${pesapalConfig!.baseUrl}/api/Transactions/SubmitOrderRequest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify(pesapalPayment),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PesaPal API Error:', response.status, errorText);
        throw new Error(`PesaPal API returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('PesaPal API Response:', result);
      
      if (result.order_tracking_id) {
        return {
          status: "success",
          transactionId: result.order_tracking_id,
          redirectUrl: result.redirect_url,
        };
      } else {
        throw new Error(result.error?.message || result.message || "PesaPal payment initialization failed");
      }

    } catch (error: any) {
      console.error('PesaPal payment error:', error);
      throw new Error(error.message || "Payment processing failed");
    }
  }

  /**
   * Gets PesaPal authentication token
   */
  private async getPesaPalAuthToken(): Promise<string> {
    if (!pesapalConfig) {
      throw new Error("PesaPal not configured");
    }

    const response = await fetch(`${pesapalConfig.baseUrl}/api/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        consumer_key: pesapalConfig.consumerKey,
        consumer_secret: pesapalConfig.consumerSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PesaPal Auth Error:', response.status, errorText);
      throw new Error(`PesaPal authentication failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('PesaPal Auth Response:', result);
    
    if (result.token) {
      return result.token;
    } else {
      throw new Error(result.error?.message || "Failed to get PesaPal auth token");
    }
  }

  /**
   * Registers IPN (Instant Payment Notification) with PesaPal
   */
  private async registerPesaPalIPN(): Promise<string> {
    if (!pesapalConfig) {
      throw new Error("PesaPal not configured");
    }

    const authToken = await this.getPesaPalAuthToken();
    const callbackUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://localhost:5000'}/api/pesapal/callback`;

    const response = await fetch(`${pesapalConfig.baseUrl}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        url: callbackUrl,
        ipn_notification_type: "GET"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PesaPal IPN Registration Error:', response.status, errorText);
      throw new Error(`PesaPal IPN registration failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('PesaPal IPN Response:', result);
    
    if (result.ipn_id) {
      return result.ipn_id;
    } else {
      throw new Error(result.error?.message || "Failed to register PesaPal IPN");
    }
  }

  /**
   * Processes PayPal payment for international clippers
   */
  private async processPayPalPayment(email: string, amount: number): Promise<string> {
    // This would integrate with PayPal Payouts API
    // For now, we'll simulate success
    console.log(`Processing PayPal payment: ${amount} to ${email}`);
    return `PP${Date.now()}`;
  }

  /**
   * Gets escrow balance and status for a campaign
   */
  async getEscrowStatus(campaignId: string) {
    const [escrow] = await db
      .select()
      .from(budgetEscrow)
      .where(eq(budgetEscrow.campaignId, campaignId));

    if (!escrow) {
      return null;
    }

    // Get total payments made
    const totalPayments = await db
      .select({ total: sum(autoPayments.amount) })
      .from(autoPayments)
      .where(and(
        eq(autoPayments.escrowId, escrow.id),
        eq(autoPayments.status, "completed")
      ));

    return {
      ...escrow,
      totalPaid: totalPayments[0]?.total || "0",
      remainingBalance: parseFloat(escrow.availableBalance) + parseFloat(escrow.lockedBalance),
    };
  }

  /**
   * Admin function to approve emergency escrow refunds
   * Only allowed in exceptional circumstances
   */
  async processEscrowRefund(campaignId: string, adminId: string, reason: string, amount?: number) {
    // This would require admin approval and special circumstances
    // Implementation would depend on business rules
    throw new Error("Escrow refunds require special admin approval process");
  }

  /**
   * Processes clipper payout requests by deducting from campaign escrow
   * This handles manual payout requests from clippers
   */
  async processPayout(payoutId: string): Promise<any> {
    console.log(`Processing payout: ${payoutId}`);
    
    try {
      // Get the payout from the payouts table
      const [payout] = await db
        .select()
        .from(payouts)
        .where(eq(payouts.id, payoutId));
      
      if (!payout) {
        throw new Error("Payout not found");
      }

      if (payout.status !== "pending") {
        throw new Error(`Payout already processed with status: ${payout.status}`);
      }

      const payoutAmount = parseFloat(payout.amount);
      console.log(`Processing payout of $${payoutAmount} for clipper ${payout.clipperId}`);

      // Get clipper's campaign relationships to find which escrow accounts to deduct from
      const campaignRelations = await db
        .select()
        .from(clipperCampaigns)
        .where(eq(clipperCampaigns.clipperId, payout.clipperId));
      
      let remainingAmount = payoutAmount;
      const deductions = [];

      // Deduct from available escrow balances proportionally
      for (const campaignRelation of campaignRelations) {
        if (remainingAmount <= 0) break;

        // Get campaign escrow
        const [escrow] = await db
          .select()
          .from(budgetEscrow)
          .where(eq(budgetEscrow.campaignId, campaignRelation.campaignId));
          
        if (!escrow || parseFloat(escrow.availableBalance) <= 0) continue;

        // Calculate how much to deduct from this escrow
        const availableBalance = parseFloat(escrow.availableBalance);
        const deductionAmount = Math.min(remainingAmount, availableBalance);
        
        // Update escrow balance
        await db
          .update(budgetEscrow)
          .set({
            availableBalance: (availableBalance - deductionAmount).toString(),
            lockedBalance: (parseFloat(escrow.lockedBalance) + deductionAmount).toString(),
          })
          .where(eq(budgetEscrow.id, escrow.id));

        deductions.push({
          campaignId: campaignRelation.campaignId,
          amount: deductionAmount,
        });

        remainingAmount -= deductionAmount;
        console.log(`Deducted $${deductionAmount} from campaign ${campaignRelation.campaignId} escrow`);
      }

      if (remainingAmount > 0) {
        throw new Error(`Insufficient escrow funds. Missing $${remainingAmount.toFixed(2)}`);
      }

      // Update payout status to processing
      await db
        .update(payouts)
        .set({ status: "processing" })
        .where(eq(payouts.id, payoutId));

      // Simulate payment processing completion
      setTimeout(async () => {
        try {
          await db
            .update(payouts)
            .set({ 
              status: "completed",
              processedAt: new Date()
            })
            .where(eq(payouts.id, payoutId));
          console.log(`✅ Payout ${payoutId} completed successfully`);
        } catch (error) {
          console.error(`❌ Failed to complete payout ${payoutId}:`, error);
        }
      }, 2000);

      console.log(`✅ Payout ${payoutId} processed successfully. Deductions:`, deductions);
      
      return {
        success: true,
        payoutId,
        amount: payoutAmount,
        status: "processing",
        deductions,
        message: "Payout is being processed. Funds will be transferred within 24 hours."
      };
    } catch (error: any) {
      console.error(`❌ Payout processing error for ${payoutId}:`, error);
      
      // Mark payout as failed
      try {
        await db
          .update(payouts)
          .set({ status: "failed" })
          .where(eq(payouts.id, payoutId));
      } catch (updateError) {
        console.error('Failed to update payout status to failed:', updateError);
      }
      
      throw error;
    }
  }
}

export const escrowService = new EscrowService();