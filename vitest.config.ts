import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Integrationstests teilen sich eine Testdatenbank und laufen deshalb nacheinander.
    fileParallelism: false,
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
