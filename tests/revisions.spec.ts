import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Revision history and restore", () => {
  test("create content, publish, modify, then restore from revision", async ({ page }) => {
    await goToFirstSite(page);

    // Create a new page for the revision test
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Revision Test");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a heading block with initial content
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Heading" }).first().click();
    await page.waitForTimeout(500);

    const heading = page.locator('[contenteditable="true"]').last();
    await heading.click();
    await heading.press("Control+a");
    await page.keyboard.type("Original Heading Content");
    await page.waitForTimeout(300);

    // Save the page
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Publish the page to create a revision
    await page.getByRole("button", { name: /Publish/i }).click();
    await expect(
      page.locator("text=Your page is live")
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Continue editing/i }).click();
    await page.waitForTimeout(500);

    // Now modify the content: change the page title
    const titleInput = page.locator('input[placeholder="Page title"]');
    await titleInput.fill("E2E Revision Test Modified");

    // Add another block to make the change more visible
    const addButton2 = page.locator("button", { hasText: "Add block" }).first();
    await addButton2.click();
    await page.locator("button", { hasText: "Text" }).first().click();
    await page.waitForTimeout(500);

    // Save the modified content
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Navigate to History tab in the sidebar
    const historyTab = page.locator("button", { hasText: "History" }).first();
    await expect(historyTab).toBeVisible({ timeout: 5_000 });
    await historyTab.click();

    // Verify at least one revision appears with "Published" note
    await expect(
      page.locator("text=Published").first()
    ).toBeVisible({ timeout: 10_000 });

    // Click Restore on the first (most recent) revision
    const restoreBtn = page.locator("button", { hasText: /Restore/i }).first();
    await expect(restoreBtn).toBeVisible({ timeout: 5_000 });
    await restoreBtn.click();

    // Confirm the restore in the ConfirmDialog
    // The ConfirmDialog has a "Restore" confirm button — it will be the last one
    const confirmRestoreBtn = page.getByRole("button", { name: /Restore/i }).last();
    await expect(confirmRestoreBtn).toBeVisible({ timeout: 5_000 });
    await confirmRestoreBtn.click();

    // Wait for restore to complete — the title should revert
    await page.waitForTimeout(1_000);

    // The page title should be restored to the original
    await expect(titleInput).toHaveValue("E2E Revision Test", { timeout: 10_000 });
  });

  test("revision history shows empty state when no revisions exist", async ({ page }) => {
    await goToFirstSite(page);

    // Create a brand new page (no publishes = no revisions)
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E No Revisions Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Navigate to History tab
    const historyTab = page.locator("button", { hasText: "History" }).first();
    await expect(historyTab).toBeVisible({ timeout: 5_000 });
    await historyTab.click();

    // Should show empty state
    await expect(
      page.locator("text=No revisions yet")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("multiple publishes create multiple revisions", async ({ page }) => {
    await goToFirstSite(page);

    // Create a new page
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Multi Revision Test");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a heading block
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Heading" }).first().click();
    await page.waitForTimeout(500);

    const heading = page.locator('[contenteditable="true"]').last();
    await heading.click();
    await heading.press("Control+a");
    await page.keyboard.type("First Version");
    await page.waitForTimeout(300);

    // Save and publish (first revision)
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Publish/i }).click();
    await expect(
      page.locator("text=Your page is live")
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Continue editing/i }).click();
    await page.waitForTimeout(500);

    // Modify and publish again (second revision)
    const headingBlock = page.locator('[contenteditable="true"]').last();
    await headingBlock.click();
    await headingBlock.press("Control+a");
    await page.keyboard.type("Second Version");
    await page.waitForTimeout(300);

    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Update/i }).click();
    await expect(
      page.locator("text=Your page is live")
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Continue editing/i }).click();
    await page.waitForTimeout(500);

    // Open History tab
    const historyTab = page.locator("button", { hasText: "History" }).first();
    await historyTab.click();

    // Should show at least 2 revisions (each with "Published" note)
    const restoreButtons = page.locator("button", { hasText: /Restore/i });
    await expect(restoreButtons.first()).toBeVisible({ timeout: 10_000 });

    const count = await restoreButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
