import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { Errors } from "./errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.Unauthorized("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      throw Errors.Unauthorized("Invalid or inactive user");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(Errors.Unauthorized("Invalid token"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(Errors.Unauthorized("Token expired"));
    } else {
      next(error);
    }
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Errors.Unauthorized("Authentication required"));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(Errors.Forbidden("Insufficient permissions"));
    }
    
    next();
  };
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await storage.getUser(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication on token errors
    next();
  }
}; 