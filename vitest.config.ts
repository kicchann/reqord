import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@reqord/shared": resolve(__dirname, "./packages/shared/dist/index.js"),
    },
  },
});
