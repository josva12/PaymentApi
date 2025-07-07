import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { nanoid } from "nanoid";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = nanoid(16);
  
  // Add request ID to request object
  (req as any).id = requestId;
  
  // Add request ID to response headers
  res.setHeader("X-Request-ID", requestId);
  
  // Capture response body
  let responseBody: any = undefined;
  const originalJson = res.json;
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Log request details
  const requestDetails = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  };

  // Log request (excluding sensitive data)
  if (req.path.startsWith("/api")) {
    logger.info(`Request started: ${req.method} ${req.path}`, requestDetails);
  }

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    const responseDetails = {
      ...requestDetails,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("Content-Length") || 0,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(`Request failed: ${req.method} ${req.path}`, responseDetails);
    } else if (res.statusCode >= 400) {
      logger.warn(`Request error: ${req.method} ${req.path}`, responseDetails);
    } else if (req.path.startsWith("/api")) {
      logger.info(`Request completed: ${req.method} ${req.path}`, responseDetails);
    }

    // Log response body for debugging (only in development)
    if (process.env.NODE_ENV === "development" && responseBody && req.path.startsWith("/api")) {
      const sanitizedBody = sanitizeResponseBody(responseBody);
      logger.debug(`Response body:`, {
        requestId,
        body: sanitizedBody,
      });
    }
  });

  next();
};

// Sanitize response body to remove sensitive information
function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sensitiveFields = [
    "password", "token", "secret", "apiKey", "authorization",
    "cardNumber", "cvv", "pin", "otp", "verificationCode"
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
} 