import { defineConfig, devices } from "@playwright/test";
import path from "path";

export const STORAGE_STATE = path.join(__dirname, "tests/.auth/user.json");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // 1) Login once, save cookies
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // 2) Authenticated tests (use saved cookies — no extra logins)
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.spec\.ts/, /auth\.setup\.ts/],
    },
    // 3) Auth tests run last (they hit the login endpoint multiple times)
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["chromium"],
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
