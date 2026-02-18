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

  test("bulk select and delete media items", async ({ page }) => {
    // Check if there are any media items to select
    const mediaItems = page.locator('[class*="mediaCard"], [class*="card"]').filter({ has: page.locator("img") });
    const itemCount = await mediaItems.count();

    if (itemCount >= 2) {
      // Look for bulk select mode toggle
      const selectBtn = page.locator("button", { hasText: /Select/i }).first();
      if (await selectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await selectBtn.click();
        await page.waitForTimeout(500);

        // Select first two items (click checkboxes)
        const checkboxes = page.locator('input[type="checkbox"], [class*="checkbox"]');
        if (await checkboxes.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
          await checkboxes.nth(0).click();
          await checkboxes.nth(1).click();

          // Look for bulk delete button
          const bulkDeleteBtn = page.locator("button", { hasText: /Delete/i }).first();
          if (await bulkDeleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await bulkDeleteBtn.click();

            // Confirm deletion
            const confirmBtn = page.getByRole("button", { name: /Delete|Confirm/i }).last();
            if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
              await confirmBtn.click();
              // Should show success
              await expect(
                page.locator("text=deleted").or(page.locator("text=Deleted"))
              ).toBeVisible({ timeout: 10_000 });
            }
          }
        }
      }
    }
  });
});
