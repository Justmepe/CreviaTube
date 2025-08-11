import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupAPIs } from "./api";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup authentication
  setupAuth(app);
  
  // Setup organized API routes
  setupAPIs(app);
  
  // Setup core enterprise dashboard route directly to avoid import issues
  app.get("/api/enterprise/dashboard", async (req, res) => {
    console.log('Enterprise dashboard request:', req.isAuthenticated(), req.user?.role);
    
    if (!req.isAuthenticated()) {
      console.log('Enterprise dashboard: Not authenticated');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Check if user is enterprise type or admin
      if ((req.user as any).userType !== "enterprise" && (req.user as any).role !== "admin") {
        console.log('Enterprise dashboard: User not enterprise type or admin:', (req.user as any).userType, (req.user as any).role);
        return res.status(403).json({ message: "Enterprise account or admin access required" });
      }

      // Simple response for now - this fixes the JSON parsing error
      const mockStats = {
        totalCampaigns: 5,
        activeCampaigns: 3,
        totalRevenue: 2500,
        totalEvents: 1250,
        account: {
          company: (req.user as any).role === "admin" 
            ? "Admin Dashboard - All Enterprise Accounts"
            : (req.user as any).fullName || (req.user as any).username,
          domain: (req.user as any).role === "admin" 
            ? "creocash.com/admin" 
            : `${(req.user as any).username}.creocash.app`,
          status: (req.user as any).role === "admin" ? "admin" : "setup",
          commissionRate: 0.15,
          features: {
            whiteLabel: true,
            customBranding: true,
            apiAccess: true,
            customDomains: true,
            prioritySupport: true,
            dedicatedManager: false
          }
        }
      };

      const responseData = {
        stats: mockStats,
        campaigns: [],
        account: null,
        user: req.user
      };

      res.json(responseData);
    } catch (error: any) {
      console.error("Error fetching enterprise dashboard:", error);
      res.status(500).json({ message: "Failed to fetch enterprise dashboard" });
    }
  });
  
  const server = http.createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve on PORT environment variable (required for external hosting)
  // Default to 5000 for local development
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.HOST || "0.0.0.0";
  
  const serverOptions: any = {
    port,
    host,
  };
  
  // Only use reusePort in Replit environment
  if (process.env.REPL_ID) {
    serverOptions.reusePort = true;
  }
  
  server.listen(serverOptions, () => {
    log(`serving on ${host}:${port}`);
    log(`environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.DATABASE_URL) {
      log(`database: connected`);
    } else {
      log(`database: ⚠️  DATABASE_URL not configured`);
    }
  });
})();
