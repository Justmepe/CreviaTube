import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { autoSyncService } from "./core/services/auto-sync";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging and pretty-print JSON middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  
  // Override res.json to capture response and optionally pretty-print
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    
    // Check if pretty printing is requested via query param or default in development
    const pretty = req.query.pretty !== undefined || 
                   req.query.format === 'pretty' ||
                   (process.env.NODE_ENV === 'development' && !req.query.minify);
    
    // If pretty printing is requested, format the JSON
    if (pretty && typeof bodyJson === 'object' && bodyJson !== null) {
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(bodyJson, null, 2));
    }
    
    // Otherwise use the original json method
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
  // Setup all routes including authentication and APIs
  const server = await registerRoutes(app);

  // Initialize auto-sync service
  await autoSyncService.initialize();
  
  // Error handling middleware
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
