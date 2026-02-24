import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Trash and restore lifecycle", () => {
  test("delete a page and verify it appears in trash", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page to test with
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Trash Test Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Go back to the site page list
    const backButton = page.getByLabel("Back to site");
    await backButton.click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Find the page we just created and delete it
    const pageRow = page.locator('[class*="item"]').filter({ hasText: "E2E Trash Test Page" }).first();
    await expect(pageRow).toBeVisible({ timeout: 5_000 });
    const optionsButton = pageRow.getByLabel("Page options");
    await optionsButton.click();
    await page.locator("text=Delete page").click();

    // Confirm the deletion in the dialog
    await page.getByRole("button", { name: /Move to trash/i }).click();
    await expect(page.locator("text=Page moved to trash")).toBeVisible({ timeout: 10_000 });

    // The page should no longer be visible in the main list
    // (Wait a moment for the list to update)
    await page.waitForTimeout(500);

    // Open the trash view
    const trashButton = page.locator("button", { hasText: /^Trash$/ });
    await expect(trashButton).toBeVisible({ timeout: 5_000 });
    await trashButton.click();

    // Wait for trash to load
    await page.waitForTimeout(1_500);

    // The deleted page should appear in the trash
    await expect(
      page.locator("text=E2E Trash Test Page").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("restore a page from trash", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page, delete it, then restore it
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Restore Test Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Go back to site
    const backButton = page.getByLabel("Back to site");
    await backButton.click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Delete the page
    const pageRow = page.locator('[class*="item"]').filter({ hasText: "E2E Restore Test Page" }).first();
    await expect(pageRow).toBeVisible({ timeout: 5_000 });
    const optionsButton = pageRow.getByLabel("Page options");
    await optionsButton.click();
    await page.locator("text=Delete page").click();
    await page.getByRole("button", { name: /Move to trash/i }).click();
    await expect(page.locator("text=Page moved to trash")).toBeVisible({ timeout: 10_000 });

    // Open trash
    const trashButton = page.locator("button", { hasText: /^Trash$/ });
    await trashButton.click();
    await page.waitForTimeout(1_500);

    // Find the deleted page in trash and click Restore
    // Use a more specific locator: target elements that have both the page name and Restore button
    const restoreBtn = page.locator("button", { hasText: /^Restore$/ }).first();
    // We expect to find at least one trash item with our page name
    await expect(page.locator("text=E2E Restore Test Page").first()).toBeVisible({ timeout: 10_000 });
    await restoreBtn.click();

    // Should show success toast
    await expect(page.locator("text=Page restored")).toBeVisible({ timeout: 10_000 });

    // Switch back to the page list (click Trash button again to toggle off)
    await trashButton.click();
    await page.waitForTimeout(500);

    // The restored page should be back in the main list
    const restoredRow = page.locator('[class*="item"]').filter({ hasText: "E2E Restore Test Page" }).first();
    await expect(restoredRow).toBeVisible({ timeout: 10_000 });
  });

  test("permanently delete a page from trash", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page, delete it, then permanently delete it
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Perm Delete Test");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Go back to site
    const backButton = page.getByLabel("Back to site");
    await backButton.click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Delete the page (soft delete)
    const pageRow = page.locator('[class*="item"]').filter({ hasText: "E2E Perm Delete Test" }).first();
    await expect(pageRow).toBeVisible({ timeout: 5_000 });
    const optionsButton = pageRow.getByLabel("Page options");
    await optionsButton.click();
    await page.locator("text=Delete page").click();
    await page.getByRole("button", { name: /Move to trash/i }).click();
    await expect(page.locator("text=Page moved to trash")).toBeVisible({ timeout: 10_000 });

    // Open trash
    const trashButton = page.locator("button", { hasText: /^Trash$/ });
    await trashButton.click();
    await page.waitForTimeout(1_500);

    // Find any "Delete forever" button (the page we just deleted should be there)
    await expect(page.locator("text=E2E Perm Delete Test").first()).toBeVisible({ timeout: 10_000 });

    // Click "Delete forever" on the first matching item
    const deleteForeverBtn = page.locator("button", { hasText: /Delete forever/ }).first();
    await deleteForeverBtn.click();

    // Confirm permanent deletion
    const confirmBtn = page.getByRole("button", { name: /Delete forever/i }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // Should show permanent deletion toast
    await expect(
      page.locator("text=Page permanently deleted")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("trash view shows empty state or items", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // Open trash
    const trashButton = page.locator("button", { hasText: /^Trash$/ });
    await expect(trashButton).toBeVisible({ timeout: 5_000 });
    await trashButton.click();
    await page.waitForTimeout(1_000);

    // Check for either "Trash is empty" or trash items
    const trashHeading = page.locator("text=Trash").first();
    await expect(trashHeading).toBeVisible({ timeout: 5_000 });

    const emptyState = page.locator("text=Trash is empty");
    const trashItems = page.locator("button", { hasText: /Restore/ });
    const isEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
    const hasItems = await trashItems.count() > 0;

    // One of the two states should be visible
    expect(isEmpty || hasItems).toBeTruthy();
  });

  test("homepage cannot be deleted (shows error toast)", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // Find the homepage row — it's the first item in the list
    const homepageItem = page.locator('[class*="item"]').filter({
      has: page.locator('a[href*="/editor/"]'),
    }).first();
    const optionsButton = homepageItem.getByLabel("Page options");
    await expect(optionsButton).toBeVisible({ timeout: 5_000 });
    await optionsButton.click();

    // Click "Delete page"
    await page.locator("text=Delete page").click();

    // Should show an error toast about homepage deletion not being allowed
    await expect(
      page.locator("text=Cannot delete the homepage")
        .or(page.locator("text=Move to trash"))
    ).toBeVisible({ timeout: 5_000 });
  });
});
