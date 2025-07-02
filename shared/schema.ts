import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("KES"),
  provider: text("provider").notNull(), // mpesa, airtel, bank
  phone: text("phone"),
  reference: text("reference"),
  status: text("status").notNull().default("pending"), // pending, completed, failed, cancelled
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  checkoutRequestId: text("checkout_request_id"),
  callbackUrl: text("callback_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  url: text("url").notNull(),
  events: text("events").array().notNull(), // array of event types
  isActive: boolean("is_active").notNull().default(true),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  amount: true,
  currency: true,
  provider: true,
  phone: true,
  reference: true,
  callbackUrl: true,
}).extend({
  amount: z.number().positive(),
  provider: z.enum(["mpesa", "airtel", "bank"]),
  phone: z.string().regex(/^254\d{9}$/, "Phone number must be in format 254XXXXXXXXX"),
});

export const insertWebhookSchema = createInsertSchema(webhooks).pick({
  url: true,
  events: true,
}).extend({
  url: z.string().url(),
  events: z.array(z.enum(["payment.completed", "payment.failed", "payment.refunded"])),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
