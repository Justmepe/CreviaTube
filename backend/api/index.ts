import { Express } from "express";
import { authAPI } from "./auth";
import { platformReviewsAPI } from "./platform-reviews";
import { campaignsAPI } from "./campaigns";

export function setupAPIs(app: Express): void {
  // Authentication API
  app.use("/api", authAPI);
  
  // Platform Reviews API
  app.use("/api/platform-reviews", platformReviewsAPI);
  
  // Campaigns API  
  app.use("/api/campaigns", campaignsAPI);
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });
}