import type { Express } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { campaignRoutes } from "../modules/campaigns/campaigns.routes";
import { userRoutes } from "../modules/users/users.routes";
import { adminRoutes } from "../modules/admin/admin.routes";
import { paymentRoutes } from "../modules/payments/payments.routes";
import { metricsRoutes } from "../modules/metrics/metrics.routes";

export function setupRoutes(app: Express): void {
  // Authentication routes
  app.use("/api/auth", authRoutes);
  
  // User management routes
  app.use("/api/users", userRoutes);
  
  // Campaign management routes
  app.use("/api/campaigns", campaignRoutes);
  
  // Payment processing routes
  app.use("/api/payments", paymentRoutes);
  
  // Metrics and analytics routes
  app.use("/api/metrics", metricsRoutes);
  
  // Admin routes
  app.use("/api/admin", adminRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });
}