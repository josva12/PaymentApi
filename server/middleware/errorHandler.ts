import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let details: any = null;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    details = error.errors.map(err => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code
    }));
  }
  // Handle custom application errors
  else if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // Handle JWT errors
  else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }
  // Handle database errors
  else if (error.name === "SequelizeValidationError" || error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }
  else if (error.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message = "Resource already exists";
  }
  // Handle network errors
  else if (error.name === "ECONNREFUSED") {
    statusCode = 503;
    message = "Service temporarily unavailable";
  }
  // Handle timeout errors
  else if (error.name === "ETIMEDOUT") {
    statusCode = 408;
    message = "Request timeout";
  }

  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  };

  // Log based on error severity
  if (statusCode >= 500) {
    logger.error("Server Error:", errorDetails);
  } else if (statusCode >= 400) {
    logger.warn("Client Error:", errorDetails);
  } else {
    logger.info("Application Error:", errorDetails);
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";
  
  const response: any = {
    success: false,
    error: message,
    ...(details && { details }),
    ...(isDevelopment && { stack: error.stack }),
  };

  // Add request ID if available
  if ((req as any).id) {
    response.requestId = (req as any).id;
  }

  res.status(statusCode).json(response);
};

// Helper function to create custom errors
export const createError = (message: string, statusCode: number = 500): CustomError => {
  return new CustomError(message, statusCode);
};

// Common error types
export const Errors = {
  BadRequest: (message: string = "Bad request") => createError(message, 400),
  Unauthorized: (message: string = "Unauthorized") => createError(message, 401),
  Forbidden: (message: string = "Forbidden") => createError(message, 403),
  NotFound: (message: string = "Resource not found") => createError(message, 404),
  Conflict: (message: string = "Resource conflict") => createError(message, 409),
  TooManyRequests: (message: string = "Too many requests") => createError(message, 429),
  InternalServer: (message: string = "Internal server error") => createError(message, 500),
  ServiceUnavailable: (message: string = "Service unavailable") => createError(message, 503),
}; 