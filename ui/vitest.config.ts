import path from "node:path";
import { defineConfig } from "vitest/config";
import { resolveRepoVitestMaxWorkers } from "../vitest.repo-cpu";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/Lexical.mjs"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: resolveRepoVitestMaxWorkers(),
    minWorkers: 1,
  },
});
