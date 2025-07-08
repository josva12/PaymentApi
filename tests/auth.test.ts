import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../server/app";
import { testUtils } from "./setup";
import { storage } from "../server/storage";

describe("Authentication Flow", () => {
  beforeEach(async () => {
    await storage.clearAllData();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "TestPassword123!",
        role: "user" as const,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.user).toMatchObject({
        username: userData.username,
        email: userData.email,
        role: userData.role,
      });
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.apiKey).toBeDefined();
    });

    it("should reject registration with existing username", async () => {
      // Create first user
      await testUtils.createTestUser();

      const userData = {
        username: "testuser_1", // Same username as created above
        email: "different@example.com",
        password: "TestPassword123!",
        role: "user" as const,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe("Username already exists");
    });

    it("should reject registration with existing email", async () => {
      // Create first user
      await testUtils.createTestUser();

      const userData = {
        username: "differentuser",
        email: "test_1@example.com", // Same email as created above
        password: "TestPassword123!",
        role: "user" as const,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe("Email already exists");
    });

    it("should reject registration with invalid data", async () => {
      const invalidData = {
        username: "te", // Too short
        email: "invalid-email",
        password: "123", // Too short
        role: "invalid_role",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      // Create a test user
      const user = await testUtils.createTestUser();

      const loginData = {
        username: user.username,
        password: "TestPassword123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data.user).toMatchObject({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
      expect(response.body.data.token).toBeDefined();
    });

    it("should reject login with invalid username", async () => {
      const loginData = {
        username: "nonexistentuser",
        password: "TestPassword123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should reject login with invalid password", async () => {
      // Create a test user
      const user = await testUtils.createTestUser();

      const loginData = {
        username: user.username,
        password: "WrongPassword123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should reject login with inactive user", async () => {
      // Create an inactive user
      const user = await storage.createUser({
        username: "inactiveuser",
        email: "inactive@example.com",
        password: "TestPassword123!",
        role: "user",
        isActive: false,
      });

      const loginData = {
        username: user.username,
        password: "TestPassword123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should reject login with missing credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Username and password are required");
    });
  });

  describe("Token Authentication", () => {
    it("should access protected route with valid token", async () => {
      // Create a test user
      const user = await testUtils.createTestUser("merchant");
      const token = testUtils.generateTestToken(user.id, user.role);

      const response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should reject access without token", async () => {
      const response = await request(app)
        .get("/api/v1/transactions")
        .expect(401);

      expect(response.body.error).toBe("Missing or invalid authorization header");
    });

    it("should reject access with invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.error).toBe("Invalid token");
    });

    it("should reject access with expired token", async () => {
      // Create a test user
      const user = await testUtils.createTestUser();
      
      // Generate expired token
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "test-jwt-secret",
        { expiresIn: "-1h" }
      );

      const response = await request(app)
        .get("/api/v1/transactions")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe("Invalid token");
    });
  });

  describe("Role-based Authorization", () => {
    it("should allow merchant to access payment endpoints", async () => {
      const user = await testUtils.createTestUser("merchant");
      const token = testUtils.generateTestToken(user.id, user.role);

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: "100.00",
          currency: "KES",
          provider: "mpesa",
          paymentMethod: "stk_push",
          phone: "254700000000",
          reference: "test_ref",
          description: "Test payment",
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it("should allow admin to access payment endpoints", async () => {
      const user = await testUtils.createTestUser("admin");
      const token = testUtils.generateTestToken(user.id, user.role);

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: "100.00",
          currency: "KES",
          provider: "mpesa",
          paymentMethod: "stk_push",
          phone: "254700000000",
          reference: "test_ref",
          description: "Test payment",
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it("should reject regular user from accessing payment endpoints", async () => {
      const user = await testUtils.createTestUser("user");
      const token = testUtils.generateTestToken(user.id, user.role);

      const response = await request(app)
        .post("/api/v1/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: "100.00",
          currency: "KES",
          provider: "mpesa",
          paymentMethod: "stk_push",
          phone: "254700000000",
          reference: "test_ref",
          description: "Test payment",
        })
        .expect(403);

      expect(response.body.error).toBe("Insufficient permissions");
    });

    it("should allow admin to access admin endpoints", async () => {
      const user = await testUtils.createTestUser("admin");
      const token = testUtils.generateTestToken(user.id, user.role);

      const response = await request(app)
        .get("/api/v1/admin/analytics/stats")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should reject non-admin from accessing admin endpoints", async () => {
      const user = await testUtils.createTestUser("merchant");
      const token = testUtils.generateTestToken(user.id, user.role);

      const response = await request(app)
        .get("/api/v1/admin/analytics/stats")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe("Insufficient permissions");
    });
  });
}); 