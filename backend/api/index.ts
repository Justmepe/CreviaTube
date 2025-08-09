import { Express } from "express";
import { authAPI } from "./auth";
import { platformReviewsAPI } from "./platform-reviews";
import { campaignsAPI } from "./campaigns";
import { adminAPI } from "./admin";
import { metricsAPI } from "./metrics";
import { paymentsAPI } from "./payments";
import { usersAPI } from "./users";
import { pagesAPI } from "./pages/index";

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
  
  // Static Pages API
  app.use("/api/pages", pagesAPI);
  
  // Payment methods endpoint (for campaign funding)
  app.get("/api/payment-methods", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    res.json({
      availableMethods: [
        {
          id: "mpesa",
          name: "M-Pesa",
          description: "Mobile Money Transfer - Kenya",
          icon: "smartphone",
          requires: ["phoneNumber"],
          requiresPhone: true,
          requiresEmail: true
        },
        {
          id: "paypal", 
          name: "PayPal",
          description: "Secure online payments worldwide",
          icon: "credit-card",
          requires: ["email"],
          requiresPhone: false,
          requiresEmail: true
        },
        {
          id: "bank",
          name: "Bank Transfer", 
          description: "Direct bank transfer",
          icon: "building",
          requires: ["email"],
          requiresPhone: false,
          requiresEmail: true
        }
      ]
    });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });
}