import type { Express } from "express";
import { botDetectionMiddleware } from "../../modules/bot-protection/bot-detection.middleware";
import { rateLimitMiddleware } from "./rate-limit";
import { errorHandler } from "./error-handler";
import { requestLogger } from "./logger";

export function setupMiddleware(app: Express): void {
  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimitMiddleware);

  // Bot detection
  app.use(botDetectionMiddleware);

  // Error handling (should be last)
  app.use(errorHandler);
}