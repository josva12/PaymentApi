import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced user table with roles and security
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Will be hashed with bcrypt
  apiKey: text("api_key").notNull().unique(),
  role: text("role").notNull().default("merchant"), // admin, merchant, user
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  roleIdx: index("role_idx").on(table.role),
}));

// Enhanced transactions table with comprehensive payment tracking
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KES"),
  provider: text("provider").notNull(), // mpesa, airtel, equity, paybill, till
  paymentMethod: text("payment_method").notNull(), // stk_push, paybill, till, card, bank_transfer
  phone: text("phone"),
  reference: text("reference"),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled, refunded
  failureReason: text("failure_reason"),
  
  // M-Pesa specific fields
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  checkoutRequestId: text("checkout_request_id"),
  merchantRequestId: text("merchant_request_id"),
  
  // Equity Bank specific fields
  equityTransactionId: text("equity_transaction_id"),
  accountNumber: text("account_number"),
  
  // Paybill/Till specific fields
  paybillNumber: text("paybill_number"),
  tillNumber: text("till_number"),
  accountReference: text("account_reference"),
  
  // Card payment fields
  cardLast4: text("card_last_4"),
  cardBrand: text("card_brand"),
  cardToken: text("card_token"), // Encrypted token for future payments
  
  // Webhook and callback
  callbackUrl: text("callback_url"),
  webhookAttempts: integer("webhook_attempts").notNull().default(0),
  lastWebhookAttempt: timestamp("last_webhook_attempt"),
  
  // Metadata and tracking
  metadata: jsonb("metadata"), // Additional provider-specific data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // For payment intents
}, (table) => ({
  transactionIdIdx: index("transaction_id_idx").on(table.transactionId),
  userIdIdx: index("user_id_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
  providerIdx: index("provider_idx").on(table.provider),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

// Enhanced webhooks table with security
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: text("events").array().notNull(), // array of event types
  isActive: boolean("is_active").notNull().default(true),
  secret: text("secret").notNull(), // HMAC secret for signature verification
  retryCount: integer("retry_count").notNull().default(3),
  timeout: integer("timeout").notNull().default(30000), // milliseconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("webhook_user_id_idx").on(table.userId),
}));

// Webhook delivery logs for audit
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  attempt: integer("attempt").notNull().default(1),
  success: boolean("success").notNull().default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  webhookIdIdx: index("webhook_delivery_webhook_id_idx").on(table.webhookId),
  transactionIdIdx: index("webhook_delivery_transaction_id_idx").on(table.transactionId),
}));

// Audit logs for security and compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(), // login, payment_created, payment_completed, etc.
  resource: text("resource").notNull(), // user, transaction, webhook, etc.
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_user_id_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));

// Payment provider configurations
export const paymentProviders = pgTable("payment_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // mpesa, equity, airtel, etc.
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").notNull(), // Provider-specific configuration
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Rate limiting and abuse protection
export const rateLimitLogs = pgTable("rate_limit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  ipAddress: text("ip_address").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  ipAddressIdx: index("rate_limit_ip_idx").on(table.ipAddress),
  userIdIdx: index("rate_limit_user_id_idx").on(table.userId),
  createdAtIdx: index("rate_limit_created_at_idx").on(table.createdAt),
}));

// Enhanced schemas with validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
}).extend({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "merchant", "user"]).default("merchant"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  amount: true,
  currency: true,
  provider: true,
  paymentMethod: true,
  phone: true,
  reference: true,
  description: true,
  callbackUrl: true,
  paybillNumber: true,
  tillNumber: true,
  accountReference: true,
  cardToken: true,
  metadata: true,
}).extend({
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["KES", "USD", "EUR"]).default("KES"),
  provider: z.enum(["mpesa", "airtel", "equity", "paybill", "till", "card"]),
  paymentMethod: z.enum(["stk_push", "paybill", "till", "card", "bank_transfer"]),
  phone: z.string().regex(/^254\d{9}$/, "Phone number must be in format 254XXXXXXXXX").optional(),
  reference: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  callbackUrl: z.string().url().optional(),
  paybillNumber: z.string().regex(/^\d{5,8}$/, "Paybill number must be 5-8 digits").optional(),
  tillNumber: z.string().regex(/^\d{5,8}$/, "Till number must be 5-8 digits").optional(),
  accountReference: z.string().max(50).optional(),
  cardToken: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).pick({
  name: true,
  url: true,
  events: true,
  retryCount: true,
  timeout: true,
}).extend({
  name: z.string().min(1).max(100),
  url: z.string().url("Invalid webhook URL"),
  events: z.array(z.enum([
    "payment.completed", 
    "payment.failed", 
    "payment.refunded",
    "payment.cancelled",
    "payment.processing"
  ])),
  retryCount: z.number().min(0).max(10).default(3),
  timeout: z.number().min(5000).max(60000).default(30000),
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type RateLimitLog = typeof rateLimitLogs.$inferSelect;

// Payment status enum
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing", 
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export const PAYMENT_PROVIDERS = {
  MPESA: "mpesa",
  AIRTEL: "airtel", 
  EQUITY: "equity",
  PAYBILL: "paybill",
  TILL: "till",
  CARD: "card",
} as const;

export const PAYMENT_METHODS = {
  STK_PUSH: "stk_push",
  PAYBILL: "paybill",
  TILL: "till", 
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
} as const;
