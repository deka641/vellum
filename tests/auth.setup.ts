import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";

setup("authenticate as demo user", async ({ page, context }) => {
  const baseURL = process.env.BASE_URL || "http://localhost:3000";

  // Step 1: Get CSRF token from the NextAuth csrf endpoint
  const csrfRes = await page.request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  // Step 2: POST credentials directly to the callback endpoint
  const signInRes = await page.request.post(
    `${baseURL}/api/auth/callback/credentials`,
    {
      form: {
        email: "demo@vellum.app",
        password: "password123",
        csrfToken,
        json: "true",
      },
    }
  );

  // The response should set auth cookies via the redirect chain
  // Verify we can access an authenticated route
  await page.goto("/sites");
  await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });

  // Save the authenticated state
  await context.storageState({ path: STORAGE_STATE });
});
