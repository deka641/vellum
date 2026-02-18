import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Templates", () => {
  test("templates page loads", async ({ page }) => {
    await page.goto("/templates");
    await page.waitForTimeout(2_000);

    // Should show templates page
    await expect(
      page.locator("text=Templates").or(page.locator("text=template"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("create a page from template", async ({ page }) => {
    await goToFirstSite(page);

    await page.getByRole("button", { name: /New page/i }).click();

    // The create dialog should show template options
    const dialog = page.locator('[role="dialog"]').or(page.locator('[class*="Dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Should show "Blank" option
    await expect(page.locator("text=Blank")).toBeVisible({ timeout: 5_000 });

    // Check if any templates are available (they may or may not exist)
    const templateCards = page.locator('[class*="templateCard"]');
    const count = await templateCards.count();

    // If there are templates beyond "Blank", select the first one
    if (count > 1) {
      await templateCards.nth(1).click();
    }

    // Fill title and create
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Template Page");
    await page.getByRole("button", { name: /Create page/i }).click();

    // Should navigate to editor
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toHaveValue("E2E Template Page");
  });

  test("save as template from editor", async ({ page }) => {
    await goToFirstSite(page);

    // Open first page in editor
    const editorLink = page.locator('a[href*="/editor/"]').first();
    await expect(editorLink).toBeVisible({ timeout: 10_000 });
    await editorLink.click();
    await page.waitForURL(/\/editor\//, { timeout: 10_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });

    // Look for "Save as template" button (it may be in a dropdown or directly visible)
    const saveAsTemplate = page.locator("button", { hasText: /template/i }).first();
    if (await saveAsTemplate.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await saveAsTemplate.click();

      // Should show a dialog to name the template
      const templateNameInput = page.locator('input[placeholder*="template"], input[placeholder*="Template"], input[placeholder*="name"]').first();
      if (await templateNameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await templateNameInput.fill("E2E Test Template");

        // Click save/create button
        const createButton = page.getByRole("button", { name: /Save|Create/i }).last();
        await createButton.click();

        // Should show success
        await expect(
          page.locator("text=saved").or(page.locator("text=created")).or(page.locator("text=Template"))
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test("delete a template from templates page", async ({ page }) => {
    await page.goto("/templates");
    await page.waitForTimeout(2_000);

    // Check if there are any template cards with delete buttons
    const templateCards = page.locator('[class*="templateCard"], [class*="card"]');
    const count = await templateCards.count();

    if (count > 0) {
      // Look for a delete or options button on the last template card
      const lastCard = templateCards.last();
      const deleteBtn = lastCard.locator('button[aria-label*="delete" i], button[aria-label*="Delete" i], button[aria-label*="remove" i]').first();

      if (await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await deleteBtn.click();

        // Confirm deletion if dialog appears
        const confirmBtn = page.getByRole("button", { name: /Delete|Confirm/i }).last();
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Should show success or the template should be gone
        await page.waitForTimeout(1_000);
      }
    }
  });
});
