import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("login with valid credentials redirects to /sites", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "demo@vellum.app");
    await page.fill('input[name="password"]', "password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/sites", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/sites/);
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "wrong@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Should show an error (could be "Invalid email or password" or generic)
    await expect(
      page.locator('[class*="errorAlert"], [class*="error"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("text=Create your account")).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("forgot password page renders and submits", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: "Reset your password" })
    ).toBeVisible();
    await page.fill('input[type="email"]', "demo@vellum.app");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page.getByRole("heading", { name: "Check your email" })
    ).toBeVisible({ timeout: 10_000 });
  });
});
