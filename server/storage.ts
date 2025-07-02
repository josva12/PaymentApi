import { users, transactions, webhooks, type User, type InsertUser, type Transaction, type InsertTransaction, type Webhook, type InsertWebhook } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transaction management
  getTransaction(transactionId: string): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction & { userId: number }): Promise<Transaction>;
  updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Webhook management
  getWebhooksByUser(userId: number): Promise<Webhook[]>;
  createWebhook(webhook: InsertWebhook & { userId: number }): Promise<Webhook>;
  updateWebhook(id: number, updates: Partial<Webhook>): Promise<Webhook | undefined>;
  
  // Analytics
  getTransactionStats(userId: number): Promise<{
    totalTransactions: number;
    totalVolume: number;
    successRate: number;
    avgResponseTime: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<string, Transaction>;
  private webhooks: Map<number, Webhook>;
  private currentUserId: number;
  private currentTransactionId: number;
  private currentWebhookId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.webhooks = new Map();
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.currentWebhookId = 1;
    
    // Create a default user for demo purposes
    this.createUser({
      username: "developer",
      email: "developer@kenyanpay.com",
      password: "password123"
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.apiKey === apiKey,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const apiKey = `sk_test_${nanoid(32)}`;
    const user: User = {
      ...insertUser,
      id,
      apiKey,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getTransaction(transactionId: string): Promise<Transaction | undefined> {
    return this.transactions.get(transactionId);
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );
  }

  async createTransaction(transaction: InsertTransaction & { userId: number }): Promise<Transaction> {
    const transactionId = `txn_${nanoid(12)}`;
    const checkoutRequestId = transaction.provider === "mpesa" ? `ws_CO_${Date.now()}` : undefined;
    
    const newTransaction: Transaction = {
      ...transaction,
      id: this.currentTransactionId++,
      transactionId,
      checkoutRequestId,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      mpesaReceiptNumber: null,
    };
    
    this.transactions.set(transactionId, newTransaction);
    
    // Simulate M-Pesa STK push completion after 5 seconds
    if (transaction.provider === "mpesa") {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        this.updateTransaction(transactionId, {
          status: success ? "completed" : "failed",
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
    
    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(transactionId, updatedTransaction);
    return updatedTransaction;
  }

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
    };
    
    this.webhooks.set(id, newWebhook);
    return newWebhook;
  }

  async updateWebhook(id: number, updates: Partial<Webhook>): Promise<Webhook | undefined> {
    const webhook = this.webhooks.get(id);
    if (!webhook) return undefined;
    
    const updatedWebhook = { ...webhook, ...updates };
    this.webhooks.set(id, updatedWebhook);
    return updatedWebhook;
  }

  async getTransactionStats(userId: number): Promise<{
    totalTransactions: number;
    totalVolume: number;
    successRate: number;
    avgResponseTime: number;
  }> {
    const userTransactions = await this.getTransactionsByUser(userId);
    const completedTransactions = userTransactions.filter(t => t.status === "completed");
    
    const totalVolume = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const successRate = userTransactions.length > 0 ? (completedTransactions.length / userTransactions.length) * 100 : 0;
    
    return {
      totalTransactions: userTransactions.length,
      totalVolume,
      successRate: Math.round(successRate * 10) / 10,
      avgResponseTime: 2.3, // Simulated average response time
    };
  }
}

export const storage = new MemStorage();
