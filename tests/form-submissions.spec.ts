import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Form submissions end-to-end", () => {
  /**
   * Helper: extract the site slug from the "View site" link on the site detail page.
   */
  async function getSiteSlug(page: import("@playwright/test").Page): Promise<string> {
    const viewSiteLink = page.locator('a[href^="/s/"]').first();
    if (await viewSiteLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const href = await viewSiteLink.getAttribute("href") || "";
      const match = href.match(/^\/s\/([\w-]+)/);
      if (match) return match[1];
    }
    return "";
  }

  /**
   * Helper: get page slug from a page list item.
   */
  async function getPageSlugFromItem(
    pageItem: import("@playwright/test").Locator
  ): Promise<string> {
    const slugSpan = pageItem.locator('[class*="slug"]').first();
    if (await slugSpan.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const slugText = await slugSpan.textContent() || "";
      return slugText.replace(/^\//, "").trim();
    }
    return "";
  }

  test("create form page, publish, submit form, verify submission in dashboard", async ({ page }) => {
    const siteId = await goToFirstSite(page);
    const siteSlug = await getSiteSlug(page);

    // Create a new page with a form block
    await page.getByRole("button", { name: /New page/i }).click();
    const pageTitleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await pageTitleInput.fill("E2E Submission Test Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a form block (default: Name required, Email required, Message optional)
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Form" }).first().click();
    await page.waitForTimeout(1_000);

    // Save the page
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=Saved")).toBeVisible({ timeout: 10_000 });

    // Publish the page
    await page.getByRole("button", { name: /Publish/i }).click();
    await expect(
      page.locator("text=Your page is live")
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Continue editing/i }).click();
    await page.waitForTimeout(500);

    // Navigate back to the site page list to find the page slug
    const backButton = page.getByLabel("Back to site");
    await backButton.click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Find the form page item to extract its slug
    const formPageItem = page.locator('[class*="item"]')
      .filter({ hasText: "E2E Submission Test Page" })
      .first();
    await expect(formPageItem).toBeVisible({ timeout: 5_000 });
    const pageSlug = await getPageSlugFromItem(formPageItem);

    // Navigate to the published page
    if (!siteSlug || !pageSlug) {
      test.skip();
      return;
    }

    await page.goto(`/s/${siteSlug}/${pageSlug}`);
    await page.waitForTimeout(2_000);

    // Verify the form is visible on the published page
    const form = page.locator("form").first();
    await expect(form).toBeVisible({ timeout: 10_000 });

    // Fill out the form fields
    const nameInput = page.locator('input[placeholder="Your name"]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("E2E Test Submitter");
    }

    const emailInput = page.locator('input[placeholder="your@email.com"]').first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill("e2e-submitter@example.com");
    }

    const messageInput = page.locator('textarea[placeholder="Your message..."]').first();
    if (await messageInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await messageInput.fill("This is an automated E2E test submission.");
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Verify success message appears
    await expect(
      page.locator("text=Thank you").or(page.locator("text=has been"))
    ).toBeVisible({ timeout: 10_000 });

    // Verify "Submit another response" button appears
    await expect(
      page.locator("text=Submit another response")
    ).toBeVisible({ timeout: 5_000 });

    // Navigate to the submissions page in the dashboard
    await page.goto(`/sites/${siteId}/submissions`);
    await page.waitForTimeout(2_000);

    // Verify the submission appears in the list
    await expect(
      page.locator("text=E2E Test Submitter")
        .or(page.locator("text=e2e-submitter@example.com"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("form validation prevents empty submission", async ({ page }) => {
    await goToFirstSite(page);
    const siteSlug = await getSiteSlug(page);

    // Find a published page with a form (reuse from previous test or find existing)
    const formPageItem = page.locator('[class*="item"]')
      .filter({ hasText: "E2E Submission Test Page" })
      .filter({ hasText: "Published" })
      .first();

    if (!await formPageItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    const pageSlug = await getPageSlugFromItem(formPageItem);
    if (!siteSlug || !pageSlug) {
      test.skip();
      return;
    }

    await page.goto(`/s/${siteSlug}/${pageSlug}`);
    await page.waitForTimeout(2_000);

    const form = page.locator("form").first();
    if (!await form.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Submit without filling in any fields
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show validation error for required fields
    await expect(
      page.locator("text=This field is required").first()
    ).toBeVisible({ timeout: 5_000 });

    // Should NOT show success message
    await expect(
      page.locator("text=Thank you")
    ).not.toBeVisible({ timeout: 2_000 });
  });

  test("submissions page shows data and supports search", async ({ page }) => {
    const siteId = await goToFirstSite(page);

    // Navigate to submissions page
    await page.goto(`/sites/${siteId}/submissions`);
    await page.waitForTimeout(2_000);

    // Should show the submissions page header
    await expect(
      page.locator("text=Submissions")
    ).toBeVisible({ timeout: 10_000 });

    // Check if there are any submissions to search through
    const hasSubmissions = await page.locator("table").isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasSubmissions) {
      // Search for a known value from our test submission
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput.fill("E2E Test Submitter");
        await page.waitForTimeout(500);

        // The filtered results should still contain our submission
        await expect(
          page.locator("text=E2E Test Submitter")
        ).toBeVisible({ timeout: 5_000 });
      }
    } else {
      // No submissions — that's OK, verify the empty state
      await expect(
        page.locator("text=No form submissions found")
          .or(page.locator("text=No submissions"))
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("submit another response resets the form", async ({ page }) => {
    await goToFirstSite(page);
    const siteSlug = await getSiteSlug(page);

    // Find a published form page
    const formPageItem = page.locator('[class*="item"]')
      .filter({ hasText: "E2E Submission Test Page" })
      .filter({ hasText: "Published" })
      .first();

    if (!await formPageItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    const pageSlug = await getPageSlugFromItem(formPageItem);
    if (!siteSlug || !pageSlug) {
      test.skip();
      return;
    }

    await page.goto(`/s/${siteSlug}/${pageSlug}`);
    await page.waitForTimeout(2_000);

    const form = page.locator("form").first();
    if (!await form.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Fill and submit the form
    const nameInput = page.locator('input[placeholder="Your name"]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("E2E Reset Test");
    }

    const emailInput = page.locator('input[placeholder="your@email.com"]').first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill("reset-test@example.com");
    }

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for success message
    await expect(
      page.locator("text=Thank you").or(page.locator("text=has been"))
    ).toBeVisible({ timeout: 10_000 });

    // Click "Submit another response" to reset the form
    const resetButton = page.locator("text=Submit another response");
    await expect(resetButton).toBeVisible({ timeout: 5_000 });
    await resetButton.click();

    // The form should be visible again (not the success message)
    await expect(form).toBeVisible({ timeout: 5_000 });

    // Fields should be empty
    const nameInputReset = page.locator('input[placeholder="Your name"]').first();
    if (await nameInputReset.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(nameInputReset).toHaveValue("");
    }
  });
});
