import type { Express, Request } from "express";
import { storage } from "./storage";
import { 
  insertTransactionSchema, 
  insertWebhookSchema, 
  insertUserSchema,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_METHODS
} from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "./utils/logger";
import { errorHandler, Errors, CustomError } from "./middleware/errorHandler";
import { authenticate, authorize } from "./middleware/auth";
import { validateRequest } from "./middleware/validation";
import { mpesaService } from "./services/mpesa";
import { equityService } from "./services/equity";
import { webhookService } from "./services/webhooks";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = "24h";

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Authentication middleware
async function authenticateUser(req: AuthenticatedRequest, res: any, next: any) {
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
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(Errors.Unauthorized("Invalid token"));
    }
  }
}

// Role-based authorization middleware
function authorizeRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: any, next: any) => {
    if (!req.user) {
      return next(Errors.Unauthorized("Authentication required"));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(Errors.Forbidden("Insufficient permissions"));
    }
    
    next();
  };
}

export function registerRoutes(app: Express): void {
  // ==================== AUTHENTICATION ROUTES ====================

  // User registration
  app.post("/api/auth/register", validateRequest(insertUserSchema), async (req: AuthenticatedRequest, res, next) => {
    try {
      const userData = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        throw Errors.Conflict("Username already exists");
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        throw Errors.Conflict("Email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Log registration
      await storage.createAuditLog({
        userId: user.id,
        action: "user_registered",
        resource: "user",
        resourceId: user.id.toString(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
            role: user.role,
          apiKey: user.apiKey,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // User login
  app.post("/api/auth/login", async (req: AuthenticatedRequest, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw Errors.BadRequest("Username and password are required");
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        throw Errors.Unauthorized("Invalid credentials");
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        throw Errors.Unauthorized("Account is temporarily locked");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Increment failed login attempts
        await storage.incrementFailedLoginAttempts(user.id);
        throw Errors.Unauthorized("Invalid credentials");
      }

      // Reset failed login attempts on successful login
      await storage.resetFailedLoginAttempts(user.id);
      await storage.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Log successful login
      await storage.createAuditLog({
        userId: user.id,
        action: "user_login",
        resource: "user",
        resourceId: user.id.toString(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
            role: user.role,
          apiKey: user.apiKey,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== PAYMENT ROUTES ====================

  // Create payment intent
  app.post("/api/v1/payments/create-intent", 
    authenticateUser, 
    authorizeRole(["merchant", "admin"]),
    validateRequest(insertTransactionSchema),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const transactionData = req.body;
        const userId = req.user!.id;

        // Create transaction record
      const transaction = await storage.createTransaction({
        ...transactionData,
          userId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        // Log payment intent creation
        await storage.createAuditLog({
          userId,
          action: "payment_intent_created",
          resource: "transaction",
          resourceId: transaction.transactionId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.status(201).json({
          success: true,
          message: "Payment intent created successfully",
          data: {
        transaction_id: transaction.transactionId,
            status: transaction.status,
            amount: parseFloat(transaction.amount),
            currency: transaction.currency,
            provider: transaction.provider,
            payment_method: transaction.paymentMethod,
            expires_at: transaction.expiresAt?.toISOString(),
        created_at: transaction.createdAt.toISOString(),
          },
      });
    } catch (error) {
        next(error);
      }
    }
  );

  // Initiate payment
  app.post("/api/v1/payments/initiate/:transactionId", 
    authenticateUser,
    authorizeRole(["merchant", "admin"]),
    async (req: AuthenticatedRequest, res, next) => {
    try {
      const { transactionId } = req.params;
        const userId = req.user!.id;

        // Get transaction
      const transaction = await storage.getTransaction(transactionId);
        if (!transaction) {
          throw Errors.NotFound("Transaction not found");
        }

        if (transaction.userId !== userId) {
          throw Errors.Forbidden("Access denied");
        }

        if (transaction.status !== PAYMENT_STATUS.PENDING) {
          throw Errors.BadRequest("Transaction is not in pending status");
        }

        // Update status to processing
        await storage.updateTransaction(transactionId, {
          status: PAYMENT_STATUS.PROCESSING,
        });

        let paymentResult;

        // Route to appropriate payment service
        switch (transaction.provider) {
          case PAYMENT_PROVIDERS.MPESA:
            paymentResult = await mpesaService.initiateSTKPush(transaction);
            break;
          case PAYMENT_PROVIDERS.EQUITY:
            paymentResult = await equityService.initiatePayment(transaction);
            break;
          case PAYMENT_PROVIDERS.PAYBILL:
          case PAYMENT_PROVIDERS.TILL:
            paymentResult = await mpesaService.initiatePaybillPayment(transaction);
            break;
          default:
            throw Errors.BadRequest("Unsupported payment provider");
        }

        // Log payment initiation
        await storage.createAuditLog({
          userId,
          action: "payment_initiated",
          resource: "transaction",
          resourceId: transactionId,
          details: { provider: transaction.provider, paymentMethod: transaction.paymentMethod },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json({
          success: true,
          message: "Payment initiated successfully",
          data: {
            transaction_id: transactionId,
            status: PAYMENT_STATUS.PROCESSING,
            checkout_request_id: paymentResult.checkoutRequestId,
            merchant_request_id: paymentResult.merchantRequestId,
            instructions: paymentResult.instructions,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // Get transaction status
  app.get("/api/v1/transactions/:transactionId", 
    authenticateUser,
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const { transactionId } = req.params;
        const userId = req.user!.id;

        const transaction = await storage.getTransaction(transactionId);
        if (!transaction) {
          throw Errors.NotFound("Transaction not found");
        }

        // Check access permissions
        if (transaction.userId !== userId && req.user!.role !== "admin") {
          throw Errors.Forbidden("Access denied");
      }

      res.json({
          success: true,
          data: {
        transaction_id: transaction.transactionId,
        status: transaction.status,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        provider: transaction.provider,
            payment_method: transaction.paymentMethod,
        phone: transaction.phone,
        reference: transaction.reference,
            description: transaction.description,
        mpesa_receipt_number: transaction.mpesaReceiptNumber,
            equity_transaction_id: transaction.equityTransactionId,
            paybill_number: transaction.paybillNumber,
            till_number: transaction.tillNumber,
            account_reference: transaction.accountReference,
        created_at: transaction.createdAt.toISOString(),
            completed_at: transaction.completedAt?.toISOString(),
            expires_at: transaction.expiresAt?.toISOString(),
          },
      });
    } catch (error) {
        next(error);
      }
    }
  );

  // List user transactions
  app.get("/api/v1/transactions", 
    authenticateUser,
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const userId = req.user!.id;
        const { page = 1, limit = 20, status, provider } = req.query;

        const transactions = await storage.getTransactionsByUser(userId, {
          page: Number(page),
          limit: Number(limit),
          status: status as string,
          provider: provider as string,
        });
      
      res.json({
          success: true,
          data: {
        transactions: transactions.map(transaction => ({
          transaction_id: transaction.transactionId,
          status: transaction.status,
          amount: parseFloat(transaction.amount),
          currency: transaction.currency,
          provider: transaction.provider,
              payment_method: transaction.paymentMethod,
          phone: transaction.phone,
          reference: transaction.reference,
              description: transaction.description,
          created_at: transaction.createdAt.toISOString(),
              completed_at: transaction.completedAt?.toISOString(),
            })),
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: transactions.length,
            },
          },
      });
    } catch (error) {
        next(error);
      }
    }
  );

  // ==================== HEALTH CHECK ====================

  // Health check endpoint
  app.get("/api/v1/health", (req, res) => {
    res.json({
      success: true,
      message: "Payment API is healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // ==================== WEBHOOK ROUTES ====================

  // M-Pesa webhook
  app.post("/api/v1/webhooks/mpesa", async (req: AuthenticatedRequest, res, next) => {
    try {
      // Validate webhook payload
      const { Body } = req.body;
      if (!Body || !Body.stkCallback || !Body.stkCallback.CheckoutRequestID) {
        logger.error("Invalid webhook payload received");
        return res.status(400).json({ success: false, error: "Invalid webhook payload" });
      }

      const result = await mpesaService.handleWebhook(req.body);
      
      // Process webhook
      await webhookService.processWebhook(result);
      
      res.json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
      logger.error("M-Pesa webhook error:", error);
      
      // Return appropriate error status based on error type
      if (error instanceof Error && error.message.includes("Transaction not found")) {
        return res.status(404).json({ success: false, error: "Transaction not found" });
      }
      
      // For unexpected server errors, return 500
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Equity Bank webhook
  app.post("/api/v1/webhooks/equity", async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await equityService.handleWebhook(req.body);
      
      // Process webhook
      await webhookService.processWebhook(result);
      
      res.json({ success: true, message: "Webhook processed successfully" });
    } catch (error) {
      logger.error("Equity webhook error:", error);
      res.status(400).json({ success: false, message: "Webhook processing failed" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Get transaction statistics (admin only)
  app.get("/api/v1/admin/analytics/stats", 
    authenticateUser,
    authorizeRole(["admin"]),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const stats = await storage.getTransactionStats();
        res.json({
          success: true,
          data: stats,
        });
    } catch (error) {
        next(error);
      }
    }
  );

  // Get all transactions (admin only)
  app.get("/api/v1/admin/transactions", 
    authenticateUser,
    authorizeRole(["admin"]),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const { page = 1, limit = 50, status, provider, userId } = req.query;

        const transactions = await storage.getAllTransactions({
          page: Number(page),
          limit: Number(limit),
          status: status as string,
          provider: provider as string,
          userId: userId ? Number(userId) : undefined,
        });

      res.json({
          success: true,
          data: {
            transactions: transactions.map(transaction => ({
              transaction_id: transaction.transactionId,
              user_id: transaction.userId,
              status: transaction.status,
              amount: parseFloat(transaction.amount),
              currency: transaction.currency,
              provider: transaction.provider,
              payment_method: transaction.paymentMethod,
              created_at: transaction.createdAt.toISOString(),
              completed_at: transaction.completedAt?.toISOString(),
            })),
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: transactions.length,
            },
          },
      });
    } catch (error) {
        next(error);
      }
    }
  );
}
