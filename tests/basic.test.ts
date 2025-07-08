import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server/app";

describe("Basic API Tests", () => {
  it("should return health check", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.body.status).toBe("healthy");
    expect(response.body.timestamp).toBeDefined();
  });

  it("should return metrics", async () => {
    const response = await request(app)
      .get("/api/metrics")
      .expect(200);

    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
  });

  it("should handle 404 routes", async () => {
    const response = await request(app)
      .get("/api/nonexistent")
      .expect(404);

    expect(response.body.error).toBe("Route not found");
  });
}); 