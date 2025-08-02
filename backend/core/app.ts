import express from "express";
import cors from "cors";
import { setupAuth } from "../modules/auth/auth.middleware";
import { setupDatabase } from "./database/connection";
import { setupMiddleware } from "./middleware/setup";
import { setupRoutes } from "./routes";

export async function createApp(): Promise<express.Application> {
  const app = express();

  // Core middleware
  app.use(cors({
    origin: process.env.NODE_ENV === "production" 
      ? ["https://your-domain.com"] 
      : ["http://localhost:5173", "http://localhost:5000"],
    credentials: true
  }));
  
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Database connection
  await setupDatabase(app);

  // Authentication middleware
  setupAuth(app);

  // Additional middleware
  setupMiddleware(app);

  // API routes
  setupRoutes(app);

  return app;
}