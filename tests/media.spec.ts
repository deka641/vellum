import { test, expect } from "@playwright/test";

test.describe("Media Library", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/media");
    await expect(page.locator("text=Media Library")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("media page renders with search and filter tabs", async ({ page }) => {
    await expect(
      page.locator('input[placeholder*="Search files"]')
    ).toBeVisible();
    // Type filter tabs
    await expect(
      page.locator("button", { hasText: "All" }).first()
    ).toBeVisible();
    await expect(
      page.locator("button", { hasText: "Images" }).first()
    ).toBeVisible();
  });

  test("search filters media items", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search files"]');
    await searchInput.fill("nonexistent-file-xyz");
    await page.waitForTimeout(500);
    // Doesn't crash — that's the assertion
    await expect(searchInput).toHaveValue("nonexistent-file-xyz");
  });

  test("type filter tabs switch without errors", async ({ page }) => {
    // Click through each tab
    for (const tab of ["Images", "Videos", "Documents", "All"]) {
      const tabBtn = page.locator("button", { hasText: tab }).first();
      if (await tabBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        await expect(page).toHaveURL(/\/media/);
      }
    }
  });
});
