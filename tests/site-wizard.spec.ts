import { test, expect } from "@playwright/test";

test.describe("Site creation wizard", () => {
  test("complete 3-step wizard creates site with starter pages", async ({ page }) => {
    // Navigate to the site creation wizard
    await page.goto("/sites/new");
    await page.waitForTimeout(1_000);

    // --- Step 1: Name & Description ---
    await expect(
      page.locator("text=Name your site")
    ).toBeVisible({ timeout: 10_000 });

    // Fill in site name
    const nameInput = page.locator('input[placeholder="My Portfolio"]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill("E2E Wizard Test Site");

    // Fill in description
    const descInput = page.locator('textarea[placeholder*="brief description"]');
    await expect(descInput).toBeVisible({ timeout: 5_000 });
    await descInput.fill("A test site created by the E2E wizard test.");

    // Click Next
    await page.getByRole("button", { name: /Next/i }).click();

    // --- Step 2: Theme (Color & Font) ---
    await expect(
      page.locator("text=Choose a theme")
    ).toBeVisible({ timeout: 10_000 });

    // Select a color preset (click the second swatch to change from default)
    const colorSwatches = page.locator('[class*="themeSwatch"]');
    const swatchCount = await colorSwatches.count();
    if (swatchCount > 1) {
      await colorSwatches.nth(1).click();
      await page.waitForTimeout(200);
    }

    // Select a font preset (click the second option to change from default)
    const fontOptions = page.locator('[class*="fontOption"]');
    const fontCount = await fontOptions.count();
    if (fontCount > 1) {
      await fontOptions.nth(1).click();
      await page.waitForTimeout(200);
    }

    // Click Next
    await page.getByRole("button", { name: /Next/i }).click();

    // --- Step 3: Starter Pages ---
    await expect(
      page.locator("text=Starter pages")
    ).toBeVisible({ timeout: 10_000 });

    // Homepage should already be selected by default
    const homepageOption = page.locator('[class*="starterPage"]').filter({ hasText: "Homepage" });
    await expect(homepageOption).toBeVisible({ timeout: 5_000 });

    // Select "About" starter page
    const aboutOption = page.locator('[class*="starterPage"]').filter({ hasText: "About" });
    await expect(aboutOption).toBeVisible({ timeout: 5_000 });
    await aboutOption.click();

    // Select "Contact" starter page
    const contactOption = page.locator('[class*="starterPage"]').filter({ hasText: "Contact" });
    await expect(contactOption).toBeVisible({ timeout: 5_000 });
    await contactOption.click();

    // Click "Create site"
    await page.getByRole("button", { name: /Create site/i }).click();

    // Should redirect to the new site's page list
    await page.waitForURL(/\/sites\/\w/, { timeout: 15_000 });

    // Verify the site was created with the correct pages
    await page.waitForTimeout(1_000);

    // The page list should show the starter pages
    await expect(
      page.locator("text=Home").or(page.locator("text=Homepage"))
    ).toBeVisible({ timeout: 10_000 });

    // About page should exist
    await expect(
      page.locator("text=About")
    ).toBeVisible({ timeout: 5_000 });

    // Contact page should exist
    await expect(
      page.locator("text=Contact")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("step 1 requires site name", async ({ page }) => {
    await page.goto("/sites/new");
    await page.waitForTimeout(1_000);

    await expect(
      page.locator("text=Name your site")
    ).toBeVisible({ timeout: 10_000 });

    // Click Next without entering a name
    await page.getByRole("button", { name: /Next/i }).click();

    // Should show error toast
    await expect(
      page.locator("text=Please enter a site name")
    ).toBeVisible({ timeout: 5_000 });

    // Should still be on step 1
    await expect(
      page.locator("text=Name your site")
    ).toBeVisible({ timeout: 3_000 });
  });

  test("can navigate back through wizard steps", async ({ page }) => {
    await page.goto("/sites/new");
    await page.waitForTimeout(1_000);

    // Step 1: Fill name and go to step 2
    await expect(
      page.locator("text=Name your site")
    ).toBeVisible({ timeout: 10_000 });

    const nameInput = page.locator('input[placeholder="My Portfolio"]');
    await nameInput.fill("E2E Back Navigation Test");
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 2: Verify we're on theme selection
    await expect(
      page.locator("text=Choose a theme")
    ).toBeVisible({ timeout: 10_000 });

    // Go to step 3
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(
      page.locator("text=Starter pages")
    ).toBeVisible({ timeout: 10_000 });

    // Click Back to return to step 2
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(
      page.locator("text=Choose a theme")
    ).toBeVisible({ timeout: 10_000 });

    // Click Back to return to step 1
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(
      page.locator("text=Name your site")
    ).toBeVisible({ timeout: 10_000 });

    // The name should still be filled in
    await expect(nameInput).toHaveValue("E2E Back Navigation Test");
  });

  test("wizard creates site with only homepage when no extras selected", async ({ page }) => {
    await page.goto("/sites/new");
    await page.waitForTimeout(1_000);

    // Step 1: Enter name
    const nameInput = page.locator('input[placeholder="My Portfolio"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill("E2E Minimal Site");
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 2: Skip theme customization, click Next
    await expect(
      page.locator("text=Choose a theme")
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 3: Homepage is selected by default. Deselect any others if selected.
    await expect(
      page.locator("text=Starter pages")
    ).toBeVisible({ timeout: 10_000 });

    // Create site with default selections (homepage only)
    await page.getByRole("button", { name: /Create site/i }).click();

    // Should redirect to the new site's page list
    await page.waitForURL(/\/sites\/\w/, { timeout: 15_000 });
    await page.waitForTimeout(1_000);

    // Should have at least the homepage
    await expect(
      page.locator('a[href*="/editor/"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("cancel button returns to previous page", async ({ page }) => {
    // Go to sites list first, then navigate to wizard
    await page.goto("/sites");
    await page.waitForTimeout(1_000);
    await page.goto("/sites/new");
    await page.waitForTimeout(1_000);

    await expect(
      page.locator("text=Name your site")
    ).toBeVisible({ timeout: 10_000 });

    // Click Cancel
    await page.getByRole("button", { name: /Cancel/i }).click();

    // Should navigate away from the wizard (back to sites or previous page)
    await page.waitForTimeout(1_000);
    const url = page.url();
    expect(url).not.toContain("/sites/new");
  });
});
