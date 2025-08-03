import { Router } from "express";
import { getInfluencerAnalytics, getTraderAnalytics, getEntrepreneurAnalytics } from "./creator-analytics.controller";

const router = Router();

// Creator-specific analytics endpoints
router.get("/influencer/:userId", getInfluencerAnalytics);
router.get("/trader/:userId", getTraderAnalytics);
router.get("/entrepreneur/:userId", getEntrepreneurAnalytics);

// Self analytics endpoints (using logged-in user ID)
router.get("/influencer", getInfluencerAnalytics);
router.get("/trader", getTraderAnalytics);
router.get("/entrepreneur", getEntrepreneurAnalytics);

export default router;