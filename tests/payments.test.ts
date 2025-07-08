import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../server/app";
import { testUtils } from "./setup";
import { storage } from "../server/storage";
import { PAYMENT_STATUS, PAYMENT_PROVIDERS, PAYMENT_METHODS } from "../shared/schema";

describe("Payment Flow", () => {
  let merchant: any;
  let merchantToken: string;

  beforeEach(async () => {
    await storage.clearAllData();
    
    // Create a test merchant
    merchant = await testUtils.createTestUser("merchant");
    merchantToken = testUtils.generateTestToken(merchant.id, merchant.role);
  });

  describe("POST /api/v1/payments/create-intent", () => {
    it("should create payment intent successfully", async () => {
      const paymentData = {
        amount: "100.00",
        currency: "KES",
        provider: PAYMENT_PROVIDERS.MPESA,
        paymentMethod: PAYMENT_METHODS.STK_PUSH,
        phone: "254700000000",
        reference: "test_ref_001",
        description: "Test payment for goods",
      };

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Payment intent created successfully");
      expect(response.body.data).toMatchObject({
        status: PAYMENT_STATUS.PENDING,
        amount: 100.00,
        currency: "KES",
        provider: PAYMENT_PROVIDERS.MPESA,
        payment_method: PAYMENT_METHODS.STK_PUSH,
      });
      expect(response.body.data.transaction_id).toBeDefined();
      expect(response.body.data.expires_at).toBeDefined();
    });

    it("should reject payment intent creation with invalid amount", async () => {
      const paymentData = {
        amount: "invalid_amount",
        currency: "KES",
        provider: PAYMENT_PROVIDERS.MPESA,
        paymentMethod: PAYMENT_METHODS.STK_PUSH,
        phone: "254700000000",
        reference: "test_ref_002",
        description: "Test payment",
      };

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it("should reject payment intent creation with invalid phone number", async () => {
      const paymentData = {
        amount: "100.00",
        currency: "KES",
        provider: PAYMENT_PROVIDERS.MPESA,
        paymentMethod: PAYMENT_METHODS.STK_PUSH,
        phone: "invalid_phone",
        reference: "test_ref_003",
        description: "Test payment",
      };

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${merchantToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it("should reject payment intent creation without authentication", async () => {
      const paymentData = {
        amount: "100.00",
        currency: "KES",
        provider: PAYMENT_PROVIDERS.MPESA,
        paymentMethod: PAYMENT_METHODS.STK_PUSH,
        phone: "254700000000",
        reference: "test_ref_004",
        description: "Test payment",
      };

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .send(paymentData)
        .expect(401);

      expect(response.body.error).toBe("Missing or invalid authorization header");
    });

    it("should reject payment intent creation with regular user role", async () => {
      const user = await testUtils.createTestUser("user");
      const userToken = testUtils.generateTestToken(user.id, user.role);

      const paymentData = {
        amount: "100.00",
        currency: "KES",
        provider: PAYMENT_PROVIDERS.MPESA,
        paymentMethod: PAYMENT_METHODS.STK_PUSH,
        phone: "254700000000",
        reference: "test_ref_005",
        description: "Test payment",
      };

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${userToken}`)
        .send(paymentData)
        .expect(403);

      expect(response.body.error).toBe("Insufficient permissions");
    });
  });

  describe("POST /api/v1/payments/initiate/:transactionId", () => {
    it("should initiate M-Pesa payment successfully", async () => {
      // Create a payment intent first
      const transaction = await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);

      const response = await request(app)
        .post(`/api/v1/payments/initiate/${transaction.transactionId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Payment initiated successfully");
      expect(response.body.data).toMatchObject({
        transaction_id: transaction.transactionId,
        status: PAYMENT_STATUS.PROCESSING,
      });
      expect(response.body.data.checkout_request_id).toBeDefined();
    });

    it("should reject payment initiation for non-existent transaction", async () => {
      const response = await request(app)
        .post("/api/v1/payments/initiate/nonexistent_transaction")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(404);

      expect(response.body.error).toBe("Transaction not found");
    });

    it("should reject payment initiation for completed transaction", async () => {
      // Create a completed transaction
      const transaction = await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.COMPLETED);

      const response = await request(app)
        .post(`/api/v1/payments/initiate/${transaction.transactionId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(400);

      expect(response.body.error).toBe("Transaction is not in pending status");
    });

    it("should reject payment initiation for another user's transaction", async () => {
      // Create another user
      const otherUser = await testUtils.createTestUser("merchant");
      
      // Create transaction for other user
      const transaction = await testUtils.createTestTransaction(otherUser.id, PAYMENT_STATUS.PENDING);

      const response = await request(app)
        .post(`/api/v1/payments/initiate/${transaction.transactionId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(403);

      expect(response.body.error).toBe("Access denied");
    });
  });

  describe("GET /api/v1/transactions/:transactionId", () => {
    it("should get transaction status successfully", async () => {
      const transaction = await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);

      const response = await request(app)
        .get(`/api/v1/transactions/${transaction.transactionId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        transaction_id: transaction.transactionId,
        status: transaction.status,
        amount: 100.00,
        currency: "KES",
        provider: "mpesa",
        payment_method: "stk_push",
      });
    });

    it("should reject access to non-existent transaction", async () => {
      const response = await request(app)
        .get("/api/v1/transactions/nonexistent_transaction")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(404);

      expect(response.body.error).toBe("Transaction not found");
    });

    it("should reject access to another user's transaction", async () => {
      const otherUser = await testUtils.createTestUser("merchant");
      const transaction = await testUtils.createTestTransaction(otherUser.id, PAYMENT_STATUS.PENDING);

      const response = await request(app)
        .get(`/api/v1/transactions/${transaction.transactionId}`)
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(403);

      expect(response.body.error).toBe("Access denied");
    });

    it("should allow admin to access any transaction", async () => {
      const admin = await testUtils.createTestUser("admin");
      const adminToken = testUtils.generateTestToken(admin.id, admin.role);
      
      const transaction = await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);

      const response = await request(app)
        .get(`/api/v1/transactions/${transaction.transactionId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction_id).toBe(transaction.transactionId);
    });
  });

  describe("GET /api/v1/transactions", () => {
    it("should list user transactions successfully", async () => {
      // Create multiple transactions
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.COMPLETED);
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.FAILED);

      const response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
      });
    });

    it("should filter transactions by status", async () => {
      // Create transactions with different statuses
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.COMPLETED);
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.FAILED);

      const response = await request(app)
        .get("/api/v1/transactions?status=completed")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].status).toBe(PAYMENT_STATUS.COMPLETED);
    });

    it("should filter transactions by provider", async () => {
      // Create transactions with different providers
      await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);
      
      // Create equity transaction
      await storage.createTransaction({
        transactionId: `test_${Date.now()}`,
        userId: merchant.id,
        amount: "200.00",
        currency: "KES",
        provider: PAYMENT_PROVIDERS.EQUITY,
        paymentMethod: PAYMENT_METHODS.CARD,
        phone: "254700000000",
        reference: `ref_${Date.now()}`,
        description: "Test equity transaction",
        status: PAYMENT_STATUS.PENDING,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      });

      const response = await request(app)
        .get("/api/v1/transactions?provider=equity")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].provider).toBe(PAYMENT_PROVIDERS.EQUITY);
    });

    it("should paginate transactions correctly", async () => {
      // Create more than 20 transactions
      for (let i = 0; i < 25; i++) {
        await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);
      }

      const response = await request(app)
        .get("/api/v1/transactions?page=2&limit=10")
        .set("Authorization", `Bearer ${merchantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(10);
      expect(response.body.data.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 25,
      });
    });
  });

  describe("Webhook Processing", () => {
    it("should process M-Pesa webhook successfully", async () => {
      const webhookData = {
        Body: {
          stkCallback: {
            CheckoutRequestID: "test_checkout_request_id",
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 100.00 },
                { Name: "MpesaReceiptNumber", Value: "QK12345678" },
                { Name: "TransactionDate", Value: "20231201123456" },
                { Name: "PhoneNumber", Value: "254700000000" },
              ],
            },
          },
        },
      };

      const response = await request(app)
        .post("/api/v1/webhooks/mpesa")
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Webhook processed successfully");
    });

    it("should process Equity webhook successfully", async () => {
      const webhookData = {
        transactionId: "EQ123456789",
        status: "success",
        amount: "100.00",
        currency: "KES",
        merchantReference: "test_ref_001",
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post("/api/v1/webhooks/equity")
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Webhook processed successfully");
    });

    it("should handle webhook processing errors gracefully", async () => {
      const invalidWebhookData = {
        invalid: "data",
      };

      const response = await request(app)
        .post("/api/v1/webhooks/mpesa")
        .send(invalidWebhookData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid webhook payload");
    });
  });
}); 