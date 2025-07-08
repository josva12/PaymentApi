import { createServer } from "http";
import app from "./app";
import { setupVite, serveStatic, log } from "./vite";
import { logger } from "./utils/logger";

(async () => {
  try {
    const server = createServer(app);

    // Unhandled promise rejection handler
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

    // Uncaught exception handler
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Development setup
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = process.env.PORT || 5000;
    server.listen({
      port: Number(port),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`🚀 Kenyan Payment API server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Health check: http://localhost:${port}/api/health`);
      logger.info(`Metrics: http://localhost:${port}/api/metrics`);
    });

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
})();
