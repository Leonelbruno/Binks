import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgres://binks:binks@localhost:5434/binks_test",
    },
  },
});
