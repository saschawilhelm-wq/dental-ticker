import { loadEnv } from "vite";
import { defineConfig, devices } from "@playwright/test";

const env = loadEnv("test", process.cwd(), "");
const port = 3100;
const databaseUrl = env.TEST_DATABASE_URL;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
    // Optional: vorhandenes Chromium nutzen (z. B. PW_CHROMIUM_PATH=/opt/pw-browsers/chromium).
    launchOptions: env.PW_CHROMIUM_PATH ? { executablePath: env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Die Oberfläche läuft gegen die Testdatenbank, nie gegen die Arbeitsdatenbank.
    env: { DATABASE_URL: databaseUrl ?? "", APP_URL: `http://localhost:${port}` },
  },
});
