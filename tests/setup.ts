import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { config } from "dotenv";
import path from "path";
import { storage } from "../server/storage";

// Load test environment variables
config({ path: path.resolve(process.cwd(), ".env.test") });

// Global test setup
beforeAll(async () => {
  // Test environment is ready
  console.log("Test environment initialized");
});

// Clean up after each test
afterEach(async () => {
  // Clear all data after each test for isolation
  await storage.clearAllData();
});

// Clean up after all tests
afterAll(async () => {
  // No cleanup needed for in-memory storage
});

// Global test utilities
export const testUtils = {
  // Create a test user
  async createTestUser(role: "user" | "merchant" | "admin" = "user") {
    const user = await storage.createUser({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: "TestPassword123!",
      role,
      isActive: true,
    });
    return user;
  },

  // Create a test transaction
  async createTestTransaction(userId: number, status = "pending") {
    const transaction = await storage.createTransaction({
      userId,
      amount: "100.00",
      currency: "KES",
      provider: "mpesa",
      paymentMethod: "stk_push",
      phone: "254700000000",
      reference: `ref_${Date.now()}`,
      description: "Test transaction",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });
    
    // Update status if needed
    if (status !== "pending") {
      await storage.updateTransaction(transaction.transactionId, { status });
    }
    
    return transaction;
  },

  // Generate a valid JWT token
  generateTestToken(userId: number, role: string) {
    const jwt = require("jsonwebtoken");
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || "test-jwt-secret",
      { expiresIn: "1h" }
    );
  },
}; 