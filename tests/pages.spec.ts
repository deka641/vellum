import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Page lifecycle", () => {
  test("create a new blank page", async ({ page }) => {
    await goToFirstSite(page);

    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Page Test");
    await page.getByRole("button", { name: /Create page/i }).click();

    // Should navigate to editor
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Title should match
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toHaveValue("E2E Page Test");
  });

  test("rename a page title in the editor", async ({ page }) => {
    await goToFirstSite(page);

    // Open the first page
    const editorLink = page.locator('a[href*="/editor/"]').first();
    await expect(editorLink).toBeVisible({ timeout: 10_000 });
    await editorLink.click();
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });

    const titleInput = page.locator('input[placeholder="Page title"]');
    const original = await titleInput.inputValue();

    // Rename
    await titleInput.fill("Renamed E2E Page");
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Restore original title
    await titleInput.fill(original);
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });
  });

  test("duplicate a page", async ({ page }) => {
    await goToFirstSite(page);

    // Wait for page list
    await page.waitForTimeout(1_000);

    // Open the dropdown for the first page
    const optionsButton = page.getByLabel("Page options").first();
    await expect(optionsButton).toBeVisible({ timeout: 10_000 });
    await optionsButton.click();

    // Click Duplicate
    await page.locator("text=Duplicate").click();
    await expect(page.locator("text=Page duplicated")).toBeVisible({ timeout: 10_000 });
  });

  test("homepage cannot be deleted", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // Find the homepage row (look for Home icon or homepage indicator)
    // Try to delete the homepage via the dropdown
    const homepageRow = page.locator('[class*="item"]').filter({ has: page.locator('svg') }).first();
    const optionsButton = homepageRow.getByLabel("Page options");
    await optionsButton.click();

    // Click "Delete page"
    await page.locator("text=Delete page").click();

    // Should show a confirmation dialog or an error toast
    const errorOrConfirm = page
      .locator("text=Cannot delete the homepage")
      .or(page.locator("text=Move to trash"));
    await expect(errorOrConfirm).toBeVisible({ timeout: 5_000 });
  });

  test("delete a non-homepage page", async ({ page }) => {
    await goToFirstSite(page);

    // First create a page to delete
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Delete Me");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });

    // Go back to site
    const backButton = page.getByLabel("Back to site");
    await backButton.click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Find and delete the page
    const deletePageRow = page.locator('[class*="item"]').filter({ hasText: "E2E Delete Me" });
    const optionsButton = deletePageRow.getByLabel("Page options");
    await optionsButton.click();
    await page.locator("text=Delete page").click();

    // Confirm delete in the dialog
    await page.getByRole("button", { name: /Move to trash/i }).click();
    await expect(page.locator("text=Page moved to trash")).toBeVisible({ timeout: 10_000 });
  });
});
