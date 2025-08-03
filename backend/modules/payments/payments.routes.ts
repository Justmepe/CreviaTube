import { Router } from "express";
import { PaymentsController } from "./payments.controller";

const router = Router();
const paymentsController = new PaymentsController();

// Test endpoints for PesaPal integration
router.post("/test-pesapal-auth", paymentsController.testPesaPalAuth);
router.post("/test-campaign-funding", paymentsController.testCampaignFunding);
router.get("/escrow-balance/:campaignId", paymentsController.getEscrowBalance);
router.post("/test-clipper-payout", paymentsController.testClipperPayout);

// PesaPal callback endpoint
router.get("/pesapal/callback", paymentsController.handlePesaPalCallback);
router.post("/pesapal/callback", paymentsController.handlePesaPalCallback);

export { router as paymentsRoutes };