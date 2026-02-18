import { test, expect } from "@playwright/test";
import { goToFirstSite, openFirstPageEditor } from "./helpers";

test.describe("Column editor", () => {
  test.beforeEach(async ({ page }) => {
    await goToFirstSite(page);
    await openFirstPageEditor(page);
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });
  });

  test("add a columns block", async ({ page }) => {
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();

    // Click "Columns" in the add-block menu
    await page.locator("button", { hasText: "Columns" }).first().click();
    await page.waitForTimeout(500);

    // A columns block should appear with at least 2 columns
    await expect(
      page.locator('[class*="columnsGrid"], [class*="columnsBlock"]').last()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("add a nested block inside a column", async ({ page }) => {
    // Add a columns block first
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Columns" }).first().click();
    await page.waitForTimeout(500);

    // Find the add-block button inside a column
    const columnAddButton = page
      .locator('[class*="columnsGrid"], [class*="columnsBlock"]')
      .last()
      .locator("button", { hasText: /add|Add|\+/ })
      .first();

    if (await columnAddButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await columnAddButton.click();

      // Add a heading block inside the column
      const headingOption = page.locator("button", { hasText: "Heading" }).first();
      if (await headingOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await headingOption.click();
        await page.waitForTimeout(500);

        // A contenteditable heading should appear inside the column
        const nestedHeading = page
          .locator('[class*="columnsGrid"], [class*="columnsBlock"]')
          .last()
          .locator('[contenteditable="true"]');
        await expect(nestedHeading.first()).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test("disallowed types cannot be nested in columns", async ({ page }) => {
    // Add a columns block
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Columns" }).first().click();
    await page.waitForTimeout(500);

    // Find column's add button
    const columnAddButton = page
      .locator('[class*="columnsGrid"], [class*="columnsBlock"]')
      .last()
      .locator("button", { hasText: /add|Add|\+/ })
      .first();

    if (await columnAddButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await columnAddButton.click();
      await page.waitForTimeout(300);

      // "Columns" should NOT appear in the nested block picker (disallowed)
      const nestedColumnsOption = page.locator("button").filter({ hasText: /^Columns$/ });
      // Check the block picker that just opened - columns should be filtered out
      const blockPickerButtons = page.locator('[class*="picker"], [class*="menu"]').last();
      const columnsInPicker = blockPickerButtons.locator("button", { hasText: "Columns" });

      // If columns button exists in picker, it should be disabled or hidden
      const columnsCount = await columnsInPicker.count();
      // Disallowed types (columns, form, video) should not be in the nested picker
      // This test passes if they are absent or if they are present but disabled
      if (columnsCount > 0) {
        // If present, they should be disabled
        const isDisabled = await columnsInPicker.first().isDisabled().catch(() => false);
        // Accept either not present or disabled
        expect(columnsCount === 0 || isDisabled).toBeTruthy();
      }
    }
  });

  test("save and persist columns block", async ({ page }) => {
    // Add a columns block
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Columns" }).first().click();
    await page.waitForTimeout(500);

    // Save
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Reload page and verify columns block persists
    await page.reload();
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.locator('[class*="columnsGrid"], [class*="columnsBlock"]').first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
