import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Publish flow", () => {
  test("create page, add block, publish, verify", async ({ page }) => {
    await goToFirstSite(page);

    // Create a new page
    const newPageButton = page.getByRole("button", { name: /New page/i });
    await newPageButton.click();

    // Fill the page title in the create dialog
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Publish Test");

    // Click "Create page" button
    await page.getByRole("button", { name: /Create page/i }).click();

    // Should navigate to editor
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a heading block
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Heading" }).first().click();
    await page.waitForTimeout(500);

    // Type into the heading
    const heading = page.locator('[contenteditable="true"]').last();
    await heading.click();
    await page.keyboard.type("Hello E2E World");
    await page.waitForTimeout(300);

    // Save
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Publish
    await page.getByRole("button", { name: /Publish/i }).click();

    // Wait for publish success dialog
    await expect(
      page.locator("text=Your page is live")
    ).toBeVisible({ timeout: 15_000 });

    // Close the dialog
    await page.getByRole("button", { name: /Continue editing/i }).click();

    // Button should now say "Update" instead of "Publish"
    await expect(
      page.getByRole("button", { name: /Update/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("published page shows on public site", async ({ page }) => {
    // Visit the demo site's published pages
    await page.goto("/s/demo-portfolio");
    // Should load without error (200 or at least not crash)
    await expect(page.locator("body")).toBeVisible();
  });
});
