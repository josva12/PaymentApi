import { 
  users, 
  transactions, 
  webhooks, 
  webhookDeliveries,
  auditLogs,
  paymentProviders,
  rateLimitLogs,
  type User, 
  type InsertUser, 
  type Transaction, 
  type InsertTransaction, 
  type Webhook, 
  type InsertWebhook,
  type WebhookDelivery,
  type AuditLog,
  type PaymentProvider,
  type RateLimitLog,
  PAYMENT_STATUS
} from "@shared/schema";
import { nanoid } from "nanoid";
import { logger } from "./utils/logger";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  incrementFailedLoginAttempts(id: number): Promise<void>;
  resetFailedLoginAttempts(id: number): Promise<void>;
  updateLastLogin(id: number): Promise<void>;
  
  // Transaction management
  getTransaction(transactionId: string): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number, options?: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
  }): Promise<Transaction[]>;
  getAllTransactions(options?: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    userId?: number;
  }): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction & { userId: number; ipAddress?: string; userAgent?: string }): Promise<Transaction>;
  updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Webhook management
  getWebhooksByUser(userId: number): Promise<Webhook[]>;
  createWebhook(webhook: InsertWebhook & { userId: number }): Promise<Webhook>;
  updateWebhook(id: number, updates: Partial<Webhook>): Promise<Webhook | undefined>;
  getWebhookDeliveries(webhookId: number): Promise<WebhookDelivery[]>;
  createWebhookDelivery(delivery: {
    webhookId: number;
    transactionId: string;
    event: string;
    payload: any;
    responseStatus?: number;
    responseBody?: string;
    attempt: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<WebhookDelivery>;
  
  // Audit logs
  createAuditLog(log: {
    userId?: number;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog>;
  
  // Analytics
  getTransactionStats(userId?: number): Promise<{
    totalTransactions: number;
    totalVolume: number;
    successRate: number;
    avgResponseTime: number;
    transactionsByProvider: Record<string, number>;
    transactionsByStatus: Record<string, number>;
  }>;
  
  // Rate limiting
  logRateLimit(log: {
    userId?: number;
    ipAddress: string;
    endpoint: string;
    method: string;
  }): Promise<RateLimitLog>;
  
  // Payment providers
  getPaymentProviders(): Promise<PaymentProvider[]>;
  updatePaymentProvider(id: number, updates: Partial<PaymentProvider>): Promise<PaymentProvider | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<string, Transaction>;
  private webhooks: Map<number, Webhook>;
  private webhookDeliveries: Map<number, WebhookDelivery>;
  private auditLogs: Map<number, AuditLog>;
  private paymentProviders: Map<number, PaymentProvider>;
  private rateLimitLogs: Map<number, RateLimitLog>;
  private currentUserId: number;
  private currentTransactionId: number;
  private currentWebhookId: number;
  private currentWebhookDeliveryId: number;
  private currentAuditLogId: number;
  private currentPaymentProviderId: number;
  private currentRateLimitLogId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.webhooks = new Map();
    this.webhookDeliveries = new Map();
    this.auditLogs = new Map();
    this.paymentProviders = new Map();
    this.rateLimitLogs = new Map();
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.currentWebhookId = 1;
    this.currentWebhookDeliveryId = 1;
    this.currentAuditLogId = 1;
    this.currentPaymentProviderId = 1;
    this.currentRateLimitLogId = 1;
    
    // Initialize default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    await this.createUser({
      username: "admin",
      email: "admin@kenyanpay.com",
      password: "admin123",
      role: "admin"
    });

    // Create default merchant user
    await this.createUser({
      username: "merchant",
      email: "merchant@kenyanpay.com",
      password: "merchant123",
      role: "merchant"
    });

    // Initialize payment providers
    await this.initializePaymentProviders();
  }

  private async initializePaymentProviders() {
    const providers = [
      {
        name: "mpesa",
        isActive: true,
        config: {
          shortcode: process.env.DARAJA_SHORTCODE || "174379",
          passkey: process.env.DARAJA_PASSKEY || "",
          environment: "sandbox"
        }
      },
      {
        name: "equity",
        isActive: true,
        config: {
          merchantId: process.env.EQUITY_MERCHANT_ID || "",
          environment: "sandbox"
        }
      },
      {
        name: "airtel",
        isActive: true,
        config: {
          merchantId: "",
          environment: "sandbox"
        }
      }
    ];

    for (const provider of providers) {
      await this.createPaymentProvider(provider);
    }
  }

  private async createPaymentProvider(provider: any): Promise<PaymentProvider> {
    const id = this.currentPaymentProviderId++;
    const newProvider: PaymentProvider = {
      id,
      name: provider.name,
      isActive: provider.isActive,
      config: provider.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.paymentProviders.set(id, newProvider);
    return newProvider;
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.apiKey === apiKey,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const apiKey = `sk_${insertUser.role === 'admin' ? 'admin' : 'test'}_${nanoid(32)}`;
    const user: User = {
      ...insertUser,
      id,
      apiKey,
      isActive: true,
      isEmailVerified: false,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async incrementFailedLoginAttempts(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockedUntil = null;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await this.updateUser(id, { 
        failedLoginAttempts: failedAttempts,
        lockedUntil
      });
    }
  }

  async resetFailedLoginAttempts(id: number): Promise<void> {
    await this.updateUser(id, { 
      failedLoginAttempts: 0,
      lockedUntil: null
    });
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.updateUser(id, { lastLoginAt: new Date() });
  }

  // Transaction management methods
  async getTransaction(transactionId: string): Promise<Transaction | undefined> {
    return this.transactions.get(transactionId);
  }

  async getTransactionsByUser(userId: number, options: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
  } = {}): Promise<Transaction[]> {
    let userTransactions = Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );

    // Apply filters
    if (options.status) {
      userTransactions = userTransactions.filter(t => t.status === options.status);
    }
    if (options.provider) {
      userTransactions = userTransactions.filter(t => t.provider === options.provider);
    }

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return userTransactions.slice(start, end);
  }

  async getAllTransactions(options: {
    page?: number;
    limit?: number;
    status?: string;
    provider?: string;
    userId?: number;
  } = {}): Promise<Transaction[]> {
    let allTransactions = Array.from(this.transactions.values());

    // Apply filters
    if (options.userId) {
      allTransactions = allTransactions.filter(t => t.userId === options.userId);
    }
    if (options.status) {
      allTransactions = allTransactions.filter(t => t.status === options.status);
    }
    if (options.provider) {
      allTransactions = allTransactions.filter(t => t.provider === options.provider);
    }

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;

    return allTransactions.slice(start, end);
  }

  async createTransaction(transaction: InsertTransaction & { userId: number; ipAddress?: string; userAgent?: string }): Promise<Transaction> {
    const transactionId = `txn_${nanoid(12)}`;
    const checkoutRequestId = transaction.provider === "mpesa" ? `ws_CO_${Date.now()}` : undefined;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry
    
    const newTransaction: Transaction = {
      ...transaction,
      id: this.currentTransactionId++,
      transactionId,
      checkoutRequestId,
      status: PAYMENT_STATUS.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      mpesaReceiptNumber: null,
      webhookAttempts: 0,
    };
    
    this.transactions.set(transactionId, newTransaction);
    
    // Simulate payment completion for demo purposes
    if (transaction.provider === "mpesa") {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        this.updateTransaction(transactionId, {
          status: success ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED,
          completedAt: new Date(),
          mpesaReceiptNumber: success ? `NLJ${nanoid(8).toUpperCase()}` : null,
        });
      }, 5000);
    }
    
    return newTransaction;
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...updates, updatedAt: new Date() };
    this.transactions.set(transactionId, updatedTransaction);
    return updatedTransaction;
  }

  // Webhook management methods
  async getWebhooksByUser(userId: number): Promise<Webhook[]> {
    return Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.userId === userId,
    );
  }

  async createWebhook(webhook: InsertWebhook & { userId: number }): Promise<Webhook> {
    const id = this.currentWebhookId++;
    const secret = `whsec_${nanoid(32)}`;
    
    const newWebhook: Webhook = {
      ...webhook,
      id,
      secret,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.webhooks.set(id, newWebhook);
    return newWebhook;
  }

  async updateWebhook(id: number, updates: Partial<Webhook>): Promise<Webhook | undefined> {
    const webhook = this.webhooks.get(id);
    if (!webhook) return undefined;
    
    const updatedWebhook = { ...webhook, ...updates, updatedAt: new Date() };
    this.webhooks.set(id, updatedWebhook);
    return updatedWebhook;
  }

  async getWebhookDeliveries(webhookId: number): Promise<WebhookDelivery[]> {
    return Array.from(this.webhookDeliveries.values()).filter(
      (delivery) => delivery.webhookId === webhookId,
    );
  }

  async createWebhookDelivery(delivery: {
    webhookId: number;
    transactionId: string;
    event: string;
    payload: any;
    responseStatus?: number;
    responseBody?: string;
    attempt: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<WebhookDelivery> {
    const id = this.currentWebhookDeliveryId++;
    
    const newDelivery: WebhookDelivery = {
      id,
      webhookId: delivery.webhookId,
      transactionId: delivery.transactionId,
      event: delivery.event,
      payload: delivery.payload,
      responseStatus: delivery.responseStatus,
      responseBody: delivery.responseBody,
      attempt: delivery.attempt,
      success: delivery.success,
      errorMessage: delivery.errorMessage,
      createdAt: new Date(),
    };
    
    this.webhookDeliveries.set(id, newDelivery);
    return newDelivery;
  }

  // Audit log methods
  async createAuditLog(log: {
    userId?: number;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const id = this.currentAuditLogId++;
    
    const newLog: AuditLog = {
      id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: new Date(),
    };
    
    this.auditLogs.set(id, newLog);
    return newLog;
  }

  // Analytics methods
  async getTransactionStats(userId?: number): Promise<{
    totalTransactions: number;
    totalVolume: number;
    successRate: number;
    avgResponseTime: number;
    transactionsByProvider: Record<string, number>;
    transactionsByStatus: Record<string, number>;
  }> {
    let userTransactions = Array.from(this.transactions.values());
    
    if (userId) {
      userTransactions = userTransactions.filter(t => t.userId === userId);
    }
    
    const completedTransactions = userTransactions.filter(t => t.status === PAYMENT_STATUS.COMPLETED);
    const totalVolume = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const successRate = userTransactions.length > 0 ? (completedTransactions.length / userTransactions.length) * 100 : 0;
    
    // Group by provider
    const transactionsByProvider: Record<string, number> = {};
    userTransactions.forEach(t => {
      transactionsByProvider[t.provider] = (transactionsByProvider[t.provider] || 0) + 1;
    });
    
    // Group by status
    const transactionsByStatus: Record<string, number> = {};
    userTransactions.forEach(t => {
      transactionsByStatus[t.status] = (transactionsByStatus[t.status] || 0) + 1;
    });
    
    return {
      totalTransactions: userTransactions.length,
      totalVolume,
      successRate: Math.round(successRate * 10) / 10,
      avgResponseTime: 2.3, // Simulated average response time
      transactionsByProvider,
      transactionsByStatus,
    };
  }

  // Rate limiting methods
  async logRateLimit(log: {
    userId?: number;
    ipAddress: string;
    endpoint: string;
    method: string;
  }): Promise<RateLimitLog> {
    const id = this.currentRateLimitLogId++;
    
    const newLog: RateLimitLog = {
      id,
      userId: log.userId,
      ipAddress: log.ipAddress,
      endpoint: log.endpoint,
      method: log.method,
      createdAt: new Date(),
    };
    
    this.rateLimitLogs.set(id, newLog);
    return newLog;
  }

  // Payment provider methods
  async getPaymentProviders(): Promise<PaymentProvider[]> {
    return Array.from(this.paymentProviders.values());
  }

  async updatePaymentProvider(id: number, updates: Partial<PaymentProvider>): Promise<PaymentProvider | undefined> {
    const provider = this.paymentProviders.get(id);
    if (!provider) return undefined;
    
    const updatedProvider = { ...provider, ...updates, updatedAt: new Date() };
    this.paymentProviders.set(id, updatedProvider);
    return updatedProvider;
  }
}

export const storage = new MemStorage();
