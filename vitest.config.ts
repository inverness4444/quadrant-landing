import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    coverage: {
      reporter: ["text", "html"],
    },
    exclude: ["node_modules/**", "tests/e2e/**"],
    sequence: {
      concurrent: false,
    },
    maxConcurrency: 1,
  },
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${resolve(rootDir, ".")}/`,
      },
    ],
    extensions: [".ts", ".tsx", ".js", ".mjs", ".jsx", ".json"],
  },
});
