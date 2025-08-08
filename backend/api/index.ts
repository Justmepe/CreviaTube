import { Express } from "express";
import { authAPI } from "./auth";
import { platformReviewsAPI } from "./platform-reviews";
import { campaignsAPI } from "./campaigns";
import { adminAPI } from "./admin";
import { metricsAPI } from "./metrics";
import { paymentsAPI } from "./payments";
import { usersAPI } from "./users";

export function setupAPIs(app: Express): void {
  // Authentication API
  app.use("/api", authAPI);
  
  // Platform Reviews API
  app.use("/api/platform-reviews", platformReviewsAPI);
  
  // Campaigns API  
  app.use("/api/campaigns", campaignsAPI);
  
  // Admin API
  app.use("/api/admin", adminAPI);
  
  // Metrics API
  app.use("/api/metrics", metricsAPI);
  
  // Payments API
  app.use("/api/payments", paymentsAPI);
  
  // Users API
  app.use("/api/users", usersAPI);
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });
}