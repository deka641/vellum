import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Scheduled publishing", () => {
  let editorUrl: string;

  test("schedule a page for future publication from editor", async ({ page }) => {
    await goToFirstSite(page);

    // Create a new page for this test
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Schedule Test Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Save the editor URL for later tests
    editorUrl = page.url();

    // Add a heading block so the page has content
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Heading" }).first().click();
    await page.waitForTimeout(500);

    const heading = page.locator('[contenteditable="true"]').last();
    await heading.click();
    await page.keyboard.type("Scheduled Test Content");
    await page.waitForTimeout(300);

    // Save the page first
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Click the "Schedule" button in the toolbar
    const scheduleButton = page.locator("button", { hasText: /^Schedule$/ }).first();
    await expect(scheduleButton).toBeVisible({ timeout: 5_000 });
    await scheduleButton.click();

    // The schedule dropdown should appear with a datetime-local input
    const dateInput = page.locator('input[type="datetime-local"]').first();
    await expect(dateInput).toBeVisible({ timeout: 5_000 });

    // Set a future date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const offset = tomorrow.getTimezoneOffset();
    const local = new Date(tomorrow.getTime() - offset * 60_000);
    const formatted = local.toISOString().slice(0, 16);
    await dateInput.fill(formatted);

    // Click "Schedule publish" button inside the dropdown
    const schedulePublishBtn = page.locator("button", { hasText: /Schedule publish/ });
    await expect(schedulePublishBtn).toBeVisible({ timeout: 3_000 });
    await schedulePublishBtn.click();

    // Should show a toast confirming schedule
    await expect(
      page.locator("text=Page scheduled for publishing")
    ).toBeVisible({ timeout: 10_000 });

    // The toolbar "Schedule" button should now say "Scheduled"
    await expect(
      page.locator("button", { hasText: /^Scheduled$/ })
    ).toBeVisible({ timeout: 5_000 });

    // A scheduled badge should appear in the toolbar
    await expect(
      page.locator("text=Scheduled").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("cancel a scheduled publication from editor", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page and schedule it
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Cancel Schedule Test");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Save the page
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Click Schedule button
    const scheduleButton = page.locator("button", { hasText: /^Schedule$/ }).first();
    await expect(scheduleButton).toBeVisible({ timeout: 5_000 });
    await scheduleButton.click();

    // Set a future date
    const dateInput = page.locator('input[type="datetime-local"]').first();
    await expect(dateInput).toBeVisible({ timeout: 5_000 });
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);
    const offset = nextWeek.getTimezoneOffset();
    const local = new Date(nextWeek.getTime() - offset * 60_000);
    const formatted = local.toISOString().slice(0, 16);
    await dateInput.fill(formatted);

    // Schedule it
    const schedulePublishBtn = page.locator("button", { hasText: /Schedule publish/ });
    await schedulePublishBtn.click();
    await expect(
      page.locator("text=Page scheduled for publishing")
    ).toBeVisible({ timeout: 10_000 });

    // Verify "Scheduled" button is visible
    await expect(
      page.locator("button", { hasText: /^Scheduled$/ })
    ).toBeVisible({ timeout: 5_000 });

    // Click the "Scheduled" button to open the schedule dropdown
    await page.locator("button", { hasText: /^Scheduled$/ }).click();

    // Click "Cancel schedule" in the dropdown
    const cancelBtn = page.locator("button", { hasText: /Cancel schedule/ });
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
    await cancelBtn.click();

    // Should show cancellation toast
    await expect(
      page.locator("text=Schedule cancelled")
    ).toBeVisible({ timeout: 10_000 });

    // The button should revert to "Schedule" (not "Scheduled")
    await expect(
      page.locator("button", { hasText: /^Schedule$/ }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("scheduled badge appears in site page list", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page and schedule it
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Scheduled Badge Test");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Save first
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Schedule
    const scheduleButton = page.locator("button", { hasText: /^Schedule$/ }).first();
    await scheduleButton.click();
    const dateInput = page.locator('input[type="datetime-local"]').first();
    await expect(dateInput).toBeVisible({ timeout: 5_000 });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(10, 0, 0, 0);
    const offset = tomorrow.getTimezoneOffset();
    const local = new Date(tomorrow.getTime() - offset * 60_000);
    await dateInput.fill(local.toISOString().slice(0, 16));
    await page.locator("button", { hasText: /Schedule publish/ }).click();
    await expect(
      page.locator("text=Page scheduled for publishing")
    ).toBeVisible({ timeout: 10_000 });

    // Navigate back to site page list
    const backButton = page.getByLabel("Back to site");
    await backButton.click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // The "Scheduled" badge should be visible in the page list
    await expect(
      page.locator("text=Scheduled").first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
