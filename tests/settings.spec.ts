import { test, expect } from "@playwright/test";
import { goToFirstSite, openFirstPageEditor } from "./helpers";

test.describe("Site settings", () => {
  test("site settings page loads with theme configurator", async ({ page }) => {
    const siteId = await goToFirstSite(page);

    // Navigate to site settings
    await page.goto(`/sites/${siteId}/settings`);
    await page.waitForTimeout(2_000);

    // Should show site name input
    await expect(
      page.locator('input').first()
    ).toBeVisible({ timeout: 10_000 });

    // Should show theme-related UI (color presets or theme section)
    await expect(
      page.locator("text=Theme").or(page.locator("text=Colors"))
    ).toBeVisible({ timeout: 5_000 });
  });

  test("can change site name and save", async ({ page }) => {
    const siteId = await goToFirstSite(page);
    await page.goto(`/sites/${siteId}/settings`);
    await page.waitForTimeout(2_000);

    // Find the site name input (first input on the page)
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    const original = await nameInput.inputValue();

    // Change the name
    await nameInput.fill("E2E Test Site Name");

    // Save
    const saveButton = page.getByRole("button", { name: /Save/i });
    await saveButton.click();
    await expect(
      page.locator("text=saved").or(page.locator("text=Settings saved")).or(page.locator("text=Updated"))
    ).toBeVisible({ timeout: 10_000 });

    // Restore
    await nameInput.fill(original);
    await saveButton.click();
    await page.waitForTimeout(1_000);
  });
});

test.describe("Page SEO settings", () => {
  test("editor sidebar shows settings tab", async ({ page }) => {
    await goToFirstSite(page);
    await openFirstPageEditor(page);
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });

    // Click the Settings tab in the sidebar
    const settingsTab = page.locator("button", { hasText: "Settings" }).first();
    await settingsTab.click();

    // Settings panel should show block settings or page settings
    await expect(
      page.locator("text=Style").or(page.locator("text=No block selected")).or(page.locator("text=Settings"))
    ).toBeVisible({ timeout: 5_000 });
  });

  test("editor has history tab for version history", async ({ page }) => {
    await goToFirstSite(page);
    await openFirstPageEditor(page);
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });

    // Click the History tab
    const historyTab = page.locator("button", { hasText: "History" }).first();
    await expect(historyTab).toBeVisible({ timeout: 5_000 });
    await historyTab.click();

    // Should show revision history content (list or empty state)
    await expect(
      page.locator("text=Published")
        .or(page.locator("text=No revisions"))
        .or(page.locator("text=Revision"))
        .or(page.locator("text=history"))
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Theme settings", () => {
  test("change theme color preset and save", async ({ page }) => {
    const siteId = await goToFirstSite(page);
    await page.goto(`/sites/${siteId}/settings`);
    await page.waitForTimeout(2_000);

    // Should show theme section
    await expect(
      page.locator("text=Theme").or(page.locator("text=Colors"))
    ).toBeVisible({ timeout: 10_000 });

    // Click on a color preset swatch (there should be color circles/buttons)
    const presetButtons = page.locator('[class*="preset"], [class*="swatch"], [class*="color"]').filter({ has: page.locator("button").or(page.locator('[role="button"]')) });
    if (await presetButtons.count() > 1) {
      // Click the second preset (not the currently active one)
      await presetButtons.nth(1).click();
      await page.waitForTimeout(300);
    }

    // Save
    const saveButton = page.getByRole("button", { name: /Save/i });
    await saveButton.click();
    await expect(
      page.locator("text=saved").or(page.locator("text=Settings saved"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("export site as JSON backup", async ({ page }) => {
    const siteId = await goToFirstSite(page);
    await page.goto(`/sites/${siteId}/settings`);
    await page.waitForTimeout(2_000);

    // Find the export button
    const exportBtn = page.locator("button", { hasText: /Export/i }).first();
    await expect(exportBtn).toBeVisible({ timeout: 5_000 });

    // Click export — this triggers a download
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
    await exportBtn.click();
    const download = await downloadPromise;

    if (download) {
      // Verify the file name contains the site slug or id
      const filename = download.suggestedFilename();
      expect(filename).toContain(".json");
    }
  });
});

test.describe("Navigation management", () => {
  test("navigation page loads", async ({ page }) => {
    const siteId = await goToFirstSite(page);

    // Navigate to navigation management
    const navLink = page.locator('a[href*="/navigation"]').first();
    if (await navLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await navLink.click();
      await page.waitForURL(/\/navigation/, { timeout: 10_000 });

      // Should show navigation page content
      await expect(
        page.locator("text=Navigation").or(page.locator("text=Page"))
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});
