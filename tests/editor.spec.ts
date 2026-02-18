import { test, expect } from "@playwright/test";
import { goToFirstSite, openFirstPageEditor } from "./helpers";

test.describe("Editor", () => {
  test.beforeEach(async ({ page }) => {
    await goToFirstSite(page);
    await openFirstPageEditor(page);
    // Wait for editor to fully load
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });
  });

  test("editor loads with toolbar and canvas", async ({ page }) => {
    await expect(page.locator('input[placeholder="Page title"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Save/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Publish|Update/ })
    ).toBeVisible();
  });

  test("can edit page title", async ({ page }) => {
    const titleInput = page.locator('input[placeholder="Page title"]');
    const original = await titleInput.inputValue();
    await titleInput.fill("E2E Test Title");
    await expect(titleInput).toHaveValue("E2E Test Title");
    // Restore
    await titleInput.fill(original);
  });

  test("add a heading block via add-block menu", async ({ page }) => {
    // Click the add-block button at the bottom of the canvas
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();

    // The AddBlockMenu should appear — click "Heading"
    await page.locator("button", { hasText: "Heading" }).first().click();
    await page.waitForTimeout(500);

    // A heading block should appear (contenteditable)
    await expect(
      page.locator('[contenteditable="true"]').last()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("add a text block via add-block menu", async ({ page }) => {
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();

    await page.locator("button", { hasText: "Text" }).first().click();
    await page.waitForTimeout(500);

    // TipTap editor should appear
    await expect(
      page.locator(".tiptap, .ProseMirror").last()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("save via Ctrl+S shows saved indicator", async ({ page }) => {
    const titleInput = page.locator('input[placeholder="Page title"]');
    const original = await titleInput.inputValue();
    await titleInput.fill(original + " (test)");

    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Restore
    await titleInput.fill(original);
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });
  });

  test("keyboard shortcuts dialog opens with ?", async ({ page }) => {
    // Click on empty area to ensure no input is focused
    await page.locator("body").press("Escape");
    await page.waitForTimeout(200);
    await page.keyboard.press("?");
    await expect(
      page.getByRole("heading", { name: /keyboard shortcuts/i })
    ).toBeVisible({ timeout: 5_000 });
  });
});
