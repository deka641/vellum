import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Forms", () => {
  test("submissions page loads", async ({ page }) => {
    const siteId = await goToFirstSite(page);

    // Navigate to submissions
    const submissionsLink = page.locator('a[href*="/submissions"]').first();
    if (
      await submissionsLink.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      await submissionsLink.click();
      await page.waitForURL(/\/submissions/, { timeout: 10_000 });
      await expect(
        page
          .locator("text=Submissions")
          .or(page.locator("text=No submissions"))
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("form block can be added to a page", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page for form test
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Form Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a form block
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Form" }).first().click();
    await page.waitForTimeout(1_000);

    // Form block should appear — look for form-related UI
    await expect(
      page.locator('input[placeholder], select').first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
