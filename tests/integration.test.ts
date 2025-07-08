import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../server/app";
import { testUtils } from "./setup";
import { storage } from "../server/storage";
import { PAYMENT_STATUS, PAYMENT_PROVIDERS, PAYMENT_METHODS } from "../shared/schema";

describe("Integration Tests", () => {
  beforeEach(async () => {
    await storage.clearAllData();
  });

  describe("Complete Payment Flow", () => {
    it("should complete full payment flow from registration to payment", async () => {
      // Step 1: Register a new merchant
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testmerchant",
          email: "merchant@example.com",
          password: "TestPassword123!",
          role: "merchant",
        })
        .expect(201);

      const { token, user } = registerResponse.body.data;

      // Step 2: Create a payment intent
      const paymentIntentResponse = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: "500.00",
          currency: "KES",
          provider: PAYMENT_PROVIDERS.MPESA,
          paymentMethod: PAYMENT_METHODS.STK_PUSH,
          phone: "254700000000",
          reference: "INTEGRATION_TEST_001",
          description: "Integration test payment",
        })
        .expect(201);

      const { transaction_id } = paymentIntentResponse.body.data;

      // Step 3: Check transaction status
      const statusResponse = await request(app)
        .get(`/api/v1/transactions/${transaction_id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe(PAYMENT_STATUS.PENDING);

      // Step 4: Initiate payment
      const initiateResponse = await request(app)
        .post(`/api/v1/payments/initiate/${transaction_id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(initiateResponse.body.data.status).toBe(PAYMENT_STATUS.PROCESSING);

      // Step 5: Simulate webhook callback
      const webhookData = {
        Body: {
          stkCallback: {
            CheckoutRequestID: initiateResponse.body.data.checkout_request_id,
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 500.00 },
                { Name: "MpesaReceiptNumber", Value: "QK12345678" },
                { Name: "TransactionDate", Value: "20231201123456" },
                { Name: "PhoneNumber", Value: "254700000000" },
              ],
            },
          },
        },
      };

      const webhookResponse = await request(app)
        .post("/api/v1/webhooks/mpesa")
        .send(webhookData)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);

      // Step 6: Verify final transaction status
      const finalStatusResponse = await request(app)
        .get(`/api/v1/transactions/${transaction_id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(finalStatusResponse.body.data.status).toBe(PAYMENT_STATUS.COMPLETED);
      expect(finalStatusResponse.body.data.mpesa_receipt_number).toBe("QK12345678");

      // Step 7: List transactions
      const listResponse = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(listResponse.body.data.transactions).toHaveLength(1);
      expect(listResponse.body.data.transactions[0].transaction_id).toBe(transaction_id);
    });

    it("should handle failed payment flow", async () => {
      // Register merchant
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testmerchant2",
          email: "merchant2@example.com",
          password: "TestPassword123!",
          role: "merchant",
        })
        .expect(201);

      const { token } = registerResponse.body.data;

      // Create payment intent
      const paymentIntentResponse = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: "100.00",
          currency: "KES",
          provider: PAYMENT_PROVIDERS.MPESA,
          paymentMethod: PAYMENT_METHODS.STK_PUSH,
          phone: "254700000000",
          reference: "FAILED_TEST_001",
          description: "Failed payment test",
        })
        .expect(201);

      const { transaction_id } = paymentIntentResponse.body.data;

      // Initiate payment
      const initiateResponse = await request(app)
        .post(`/api/v1/payments/initiate/${transaction_id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Simulate failed webhook
      const failedWebhookData = {
        Body: {
          stkCallback: {
            CheckoutRequestID: initiateResponse.body.data.checkout_request_id,
            ResultCode: 1,
            ResultDesc: "The balance is insufficient for the transaction.",
          },
        },
      };

      const webhookResponse = await request(app)
        .post("/api/v1/webhooks/mpesa")
        .send(failedWebhookData)
        .expect(200);

      // Verify transaction is marked as failed
      const finalStatusResponse = await request(app)
        .get(`/api/v1/transactions/${transaction_id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(finalStatusResponse.body.data.status).toBe(PAYMENT_STATUS.FAILED);
    });
  });

  describe("Multi-User Scenarios", () => {
    it("should handle multiple merchants with separate transactions", async () => {
      // Register two merchants
      const merchant1Response = await request(app)
        .post("/api/auth/register")
        .send({
          username: "merchant1",
          email: "merchant1@example.com",
          password: "TestPassword123!",
          role: "merchant",
        })
        .expect(201);

      const merchant2Response = await request(app)
        .post("/api/auth/register")
        .send({
          username: "merchant2",
          email: "merchant2@example.com",
          password: "TestPassword123!",
          role: "merchant",
        })
        .expect(201);

      const token1 = merchant1Response.body.data.token;
      const token2 = merchant2Response.body.data.token;

      // Create transactions for both merchants
      const transaction1Response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token1}`)
        .send({
          amount: "100.00",
          currency: "KES",
          provider: PAYMENT_PROVIDERS.MPESA,
          paymentMethod: PAYMENT_METHODS.STK_PUSH,
          phone: "254700000000",
          reference: "MERCHANT1_001",
          description: "Merchant 1 transaction",
        })
        .expect(201);

      const transaction2Response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token2}`)
        .send({
          amount: "200.00",
          currency: "KES",
          provider: PAYMENT_PROVIDERS.MPESA,
          paymentMethod: PAYMENT_METHODS.STK_PUSH,
          phone: "254700000000",
          reference: "MERCHANT2_001",
          description: "Merchant 2 transaction",
        })
        .expect(201);

      // Verify merchants can only see their own transactions
      const list1Response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${token1}`)
        .expect(200);

      const list2Response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${token2}`)
        .expect(200);

      expect(list1Response.body.data.transactions).toHaveLength(1);
      expect(list2Response.body.data.transactions).toHaveLength(1);
      expect(list1Response.body.data.transactions[0].reference).toBe("MERCHANT1_001");
      expect(list2Response.body.data.transactions[0].reference).toBe("MERCHANT2_001");
    });
  });

  describe("Admin Functionality", () => {
    it("should allow admin to view all transactions", async () => {
      // Create admin
      const adminResponse = await request(app)
        .post("/api/auth/register")
        .send({
          username: "admin",
          email: "admin@example.com",
          password: "TestPassword123!",
          role: "admin",
        })
        .expect(201);

      const adminToken = adminResponse.body.data.token;

      // Create some test transactions
      const merchant1 = await testUtils.createTestUser("merchant");
      const merchant2 = await testUtils.createTestUser("merchant");

      await testUtils.createTestTransaction(merchant1.id, PAYMENT_STATUS.COMPLETED);
      await testUtils.createTestTransaction(merchant2.id, PAYMENT_STATUS.PENDING);

      // Admin should be able to see all transactions
      const adminTransactionsResponse = await request(app)
        .get("/api/v1/admin/transactions")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(adminTransactionsResponse.body.data.transactions).toHaveLength(2);

      // Admin should be able to see analytics
      const analyticsResponse = await request(app)
        .get("/api/v1/admin/analytics/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toBeDefined();
    });
  });

  describe("Error Recovery", () => {
    it("should handle concurrent payment attempts gracefully", async () => {
      const merchant = await testUtils.createTestUser("merchant");
      const token = testUtils.generateTestToken(merchant.id, merchant.role);

      const transaction = await testUtils.createTestTransaction(merchant.id, PAYMENT_STATUS.PENDING);

      // Attempt to initiate payment multiple times concurrently
      const concurrentRequests = Array(3).fill(null).map(() =>
        request(app)
          .post(`/api/v1/payments/initiate/${transaction.transactionId}`)
          .set("Authorization", `Bearer ${token}`)
      );

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed or be handled gracefully
      responses.forEach(response => {
        expect([200, 400, 409]).toContain(response.status);
      });
    });

    it("should handle webhook retries", async () => {
      const transaction = await testUtils.createTestTransaction(1, PAYMENT_STATUS.PROCESSING);

      // Simulate webhook retry
      const webhookData = {
        Body: {
          stkCallback: {
            CheckoutRequestID: "retry_test_id",
            ResultCode: 0,
            ResultDesc: "Success",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 100.00 },
                { Name: "MpesaReceiptNumber", Value: "RETRY123" },
                { Name: "TransactionDate", Value: "20231201123456" },
                { Name: "PhoneNumber", Value: "254700000000" },
              ],
            },
          },
        },
      };

      // Send webhook multiple times
      const webhookResponses = await Promise.all([
        request(app).post("/api/v1/webhooks/mpesa").send(webhookData),
        request(app).post("/api/v1/webhooks/mpesa").send(webhookData),
        request(app).post("/api/v1/webhooks/mpesa").send(webhookData),
      ]);

      // All webhook calls should succeed
      webhookResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
}); 