import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Bulk page actions", () => {
  test("select pages via checkboxes and bulk publish", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // Ensure we have at least two draft pages to work with.
    // Create two pages for this test.
    for (const title of ["E2E Bulk Page A", "E2E Bulk Page B"]) {
      await page.getByRole("button", { name: /New page/i }).click();
      const titleInput = page.locator(
        'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
      );
      await titleInput.fill(title);
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
    }

    // Now we should see the pages in the list. Find "E2E Bulk Page A" and "E2E Bulk Page B"
    // and click their checkboxes. Use .first() to handle duplicate names from previous runs.
    const pageItemA = page.locator('[class*="item"]').filter({ hasText: "E2E Bulk Page A" }).first();
    const pageItemB = page.locator('[class*="item"]').filter({ hasText: "E2E Bulk Page B" }).first();

    // Click the checkbox for page A
    const checkboxA = pageItemA.locator('input[type="checkbox"]');
    await expect(checkboxA).toBeAttached({ timeout: 5_000 });
    await checkboxA.click({ force: true });

    // The bulk bar should appear with "1 selected"
    await expect(page.locator("text=1 selected")).toBeVisible({ timeout: 5_000 });

    // Click the checkbox for page B
    const checkboxB = pageItemB.locator('input[type="checkbox"]');
    await checkboxB.click({ force: true });

    // Should show "2 selected"
    await expect(page.locator("text=2 selected")).toBeVisible({ timeout: 5_000 });

    // Click "Publish" bulk action button
    const bulkPublishBtn = page.locator('[class*="bulkActions"], [class*="bulkBar"]')
      .locator("button", { hasText: /^Publish$/ });
    await expect(bulkPublishBtn).toBeVisible({ timeout: 3_000 });
    await bulkPublishBtn.click();

    // Should show success toast
    await expect(
      page.locator("text=pages published").or(page.locator("text=2 pages published"))
    ).toBeVisible({ timeout: 10_000 });

    // The pages should now show "Published" badge
    const publishedBadgeA = pageItemA.locator("text=Published");
    await expect(publishedBadgeA).toBeVisible({ timeout: 5_000 });
    const publishedBadgeB = pageItemB.locator("text=Published");
    await expect(publishedBadgeB).toBeVisible({ timeout: 5_000 });
  });

  test("bulk unpublish pages", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // Target a non-homepage page. Look for a page that is not "Home" and is published.
    // The second item in the list should be a non-homepage page (e.g. "About")
    const allPageItems = page.locator('[class*="item"]').filter({
      has: page.locator('a[href*="/editor/"]'),
    });
    const itemCount = await allPageItems.count();

    if (itemCount < 2) {
      test.skip();
      return;
    }

    // The second item (index 1) should be non-homepage and published
    // First ensure it's published by checking for the "Published" badge
    const secondItem = allPageItems.nth(1);
    const isPublished = await secondItem.locator("text=Published").isVisible({ timeout: 3_000 }).catch(() => false);

    if (!isPublished) {
      // If not published, publish it first via dropdown
      const optionsBtn = secondItem.getByLabel("Page options");
      await optionsBtn.click();
      const publishMenuItem = page.locator("text=Publish").last();
      if (await publishMenuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await publishMenuItem.click();
        await expect(page.locator("text=Page published")).toBeVisible({ timeout: 5_000 });
        await page.waitForTimeout(500);
      }
    }

    // Now select this page via checkbox
    const checkbox = secondItem.locator('input[type="checkbox"]');
    await checkbox.click({ force: true });

    // The bulk bar should appear
    await expect(page.locator("text=1 selected")).toBeVisible({ timeout: 5_000 });

    // Click "Unpublish" bulk action button
    const bulkUnpublishBtn = page.locator('[class*="bulkActions"], [class*="bulkBar"]')
      .locator("button", { hasText: /Unpublish/ });
    await expect(bulkUnpublishBtn).toBeVisible({ timeout: 3_000 });
    await bulkUnpublishBtn.click();

    // Should show success toast — matches "1 page unpublished" or "pages unpublished"
    await expect(
      page.locator("text=unpublished").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("bulk unpublish protects homepage", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // The homepage is the first item in the page list (has a Home icon).
    // Verify it is published first.
    const allItems = page.locator('[class*="item"]').filter({
      has: page.locator('a[href*="/editor/"]'),
    });
    const homepageItem = allItems.first();
    await expect(homepageItem.locator("text=Published")).toBeVisible({ timeout: 5_000 });

    // Select only the homepage via its checkbox
    const homepageCheckbox = homepageItem.locator('input[type="checkbox"]');
    await expect(homepageCheckbox).toBeAttached({ timeout: 5_000 });
    await homepageCheckbox.click({ force: true });

    // Bulk bar should appear with "1 selected"
    await expect(page.locator("text=1 selected")).toBeVisible({ timeout: 5_000 });

    // Click "Unpublish" in the bulk bar
    const bulkUnpublishBtn = page.locator('[class*="bulkActions"], [class*="bulkBar"]')
      .locator("button", { hasText: /Unpublish/ });
    await expect(bulkUnpublishBtn).toBeVisible({ timeout: 3_000 });
    await bulkUnpublishBtn.click();

    // The API should reject unpublishing the homepage.
    // Should show "No valid pages to update" error toast.
    await expect(
      page.locator("text=No valid pages to update")
    ).toBeVisible({ timeout: 10_000 });

    // The homepage should still show "Published" badge
    await expect(homepageItem.locator("text=Published")).toBeVisible({ timeout: 5_000 });
  });

  test("clear selection removes bulk bar", async ({ page }) => {
    await goToFirstSite(page);
    await page.waitForTimeout(1_000);

    // Select a page
    const firstItem = page.locator('[class*="item"]').filter({
      has: page.locator('a[href*="/editor/"]'),
    }).first();
    const checkbox = firstItem.locator('input[type="checkbox"]');
    await checkbox.click({ force: true });

    // Bulk bar should appear
    await expect(page.locator("text=1 selected")).toBeVisible({ timeout: 5_000 });

    // Click "Clear" to deselect
    const clearBtn = page.locator("button", { hasText: /Clear/ });
    await expect(clearBtn).toBeVisible({ timeout: 3_000 });
    await clearBtn.click();

    // Bulk bar should disappear (no more "selected" text)
    await expect(page.locator("text=selected")).not.toBeVisible({ timeout: 5_000 });
  });
});
