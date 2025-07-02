import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertWebhookSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

// Authentication middleware
async function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Missing or invalid API key" });
  }

  const apiKey = authHeader.substring(7);
  const user = await storage.getUserByApiKey(apiKey);
  
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  req.user = user;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0" 
    });
  });

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          apiKey: user.apiKey,
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user (requires authentication)
  app.get("/api/user", authenticate, (req, res) => {
    const { password, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });

  // Payment initiation
  app.post("/api/v1/payments/initiate", authenticate, async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction({
        ...transactionData,
        userId: req.user.id,
      });

      res.json({
        status: "success",
        transaction_id: transaction.transactionId,
        payment_status: transaction.status,
        checkout_request_id: transaction.checkoutRequestId,
        message: transaction.provider === "mpesa" ? "STK push sent successfully" : "Payment initiated successfully",
        created_at: transaction.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Transaction status
  app.get("/api/v1/transactions/:transactionId", authenticate, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({
        transaction_id: transaction.transactionId,
        status: transaction.status,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        provider: transaction.provider,
        phone: transaction.phone,
        reference: transaction.reference,
        mpesa_receipt_number: transaction.mpesaReceiptNumber,
        created_at: transaction.createdAt.toISOString(),
        completed_at: transaction.completedAt?.toISOString() || null,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // List user transactions
  app.get("/api/v1/transactions", authenticate, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUser(req.user.id);
      
      res.json({
        transactions: transactions.map(transaction => ({
          transaction_id: transaction.transactionId,
          status: transaction.status,
          amount: parseFloat(transaction.amount),
          currency: transaction.currency,
          provider: transaction.provider,
          phone: transaction.phone,
          reference: transaction.reference,
          mpesa_receipt_number: transaction.mpesaReceiptNumber,
          created_at: transaction.createdAt.toISOString(),
          completed_at: transaction.completedAt?.toISOString() || null,
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Transaction statistics
  app.get("/api/v1/analytics/stats", authenticate, async (req, res) => {
    try {
      const stats = await storage.getTransactionStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Webhook management
  app.get("/api/v1/webhooks", authenticate, async (req, res) => {
    try {
      const webhooks = await storage.getWebhooksByUser(req.user.id);
      res.json({ webhooks });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/v1/webhooks", authenticate, async (req, res) => {
    try {
      const webhookData = insertWebhookSchema.parse(req.body);
      const webhook = await storage.createWebhook({
        ...webhookData,
        userId: req.user.id,
      });

      res.json({ webhook });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generate new API key
  app.post("/api/v1/api-keys/generate", authenticate, async (req, res) => {
    try {
      const newApiKey = `sk_${req.body.type === 'live' ? 'live' : 'test'}_${nanoid(32)}`;
      
      // In a real implementation, you'd update the user's API key in the database
      // For demo purposes, we'll just return a new key
      res.json({
        api_key: newApiKey,
        type: req.body.type || 'test',
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
