import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", "client"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "client/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "server/vite.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "./shared"),
      "@server": resolve(__dirname, "./server"),
      "@client": resolve(__dirname, "./client"),
    },
  },
}); 