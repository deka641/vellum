import { test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";

setup("authenticate as demo user", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "demo@vellum.app");
  await page.fill('input[name="password"]', "password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/sites", { timeout: 15_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
