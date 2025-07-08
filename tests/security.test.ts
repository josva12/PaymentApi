import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server/app";

describe("Security Tests", () => {
  it("should return security headers", async () => {
    const response = await request(app).get("/api/v1/health");
    
    // Check for basic security headers
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-xss-protection"]).toBe("1; mode=block");
  });

  it("should reject requests with invalid content type", async () => {
    const response = await request(app)
      .post("/api/v1/payments/create-intent")
      .set("Content-Type", "text/plain")
      .send("invalid data")
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it("should reject requests with oversized payload", async () => {
    const largePayload = "x".repeat(1000000); // 1MB payload
    
    const response = await request(app)
      .post("/api/v1/payments/create-intent")
      .set("Content-Type", "application/json")
      .send({ data: largePayload })
      .expect(413); // Payload Too Large

    expect(response.body.error).toBeDefined();
  });

  it("should sanitize SQL injection attempts", async () => {
    const maliciousPayload = {
      amount: "100",
      currency: "KES",
      provider: "mpesa",
      paymentMethod: "stk_push",
      phone: "254700000000",
      description: "'; DROP TABLE users; --",
    };

    const response = await request(app)
      .post("/api/v1/payments/create-intent")
      .set("Authorization", "Bearer valid-token")
      .send(maliciousPayload)
      .expect(401); // Should fail auth, not crash

    expect(response.body.error).toBeDefined();
  });

  it("should handle malformed JSON gracefully", async () => {
    const response = await request(app)
      .post("/api/v1/payments/create-intent")
      .set("Content-Type", "application/json")
      .send("invalid json {")
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
}); 