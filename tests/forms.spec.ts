import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Forms", () => {
  test("submissions page loads", async ({ page }) => {
    const siteId = await goToFirstSite(page);

    // Navigate to submissions
    const submissionsLink = page.locator('a[href*="/submissions"]').first();
    if (
      await submissionsLink.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      await submissionsLink.click();
      await page.waitForURL(/\/submissions/, { timeout: 10_000 });
      await expect(
        page
          .locator("text=Submissions")
          .or(page.locator("text=No submissions"))
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("form block can be added to a page", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page for form test
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Form Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a form block
    const addButton = page.locator("button", { hasText: "Add block" }).first();
    await addButton.click();
    await page.locator("button", { hasText: "Form" }).first().click();
    await page.waitForTimeout(1_000);

    // Form block should appear — look for form-related UI
    await expect(
      page.locator('input[placeholder], select').first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Form validation on published page", () => {
  /**
   * Helper: extract the site slug from the "View site" link on the site detail page.
   * The link has `href="/s/{slug}"` and wraps a button labeled "View site".
   */
  async function getSiteSlug(page: import("@playwright/test").Page): Promise<string> {
    // The "View site" link is an <a> with href starting with "/s/"
    const viewSiteLink = page.locator('a[href^="/s/"]').first();
    if (await viewSiteLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const href = await viewSiteLink.getAttribute("href") || "";
      const match = href.match(/^\/s\/([\w-]+)/);
      if (match) return match[1];
    }
    return "";
  }

  /**
   * Helper: navigate to the published form page and return whether the form is visible.
   * Finds the PUBLISHED form validation page in the page list (handles slug collisions from repeated runs).
   */
  async function goToPublishedForm(page: import("@playwright/test").Page): Promise<boolean> {
    await goToFirstSite(page);
    await page.waitForTimeout(500);
    const siteSlug = await getSiteSlug(page);
    if (!siteSlug) return false;

    // Find all "E2E Form Validation Page" items and pick the PUBLISHED one
    const formPageItems = page.locator('[class*="item"]').filter({ hasText: "E2E Form Validation Page" });
    const count = await formPageItems.count();
    let pageSlug = "";

    for (let i = 0; i < count; i++) {
      const item = formPageItems.nth(i);
      const isPublished = await item.locator("text=Published").isVisible({ timeout: 1_000 }).catch(() => false);
      if (isPublished) {
        const slugSpan = item.locator('[class*="slug"]').first();
        if (await slugSpan.isVisible({ timeout: 1_000 }).catch(() => false)) {
          const slugText = await slugSpan.textContent() || "";
          const cleaned = slugText.replace(/^\//, "").trim();
          if (cleaned) {
            pageSlug = cleaned;
            break;
          }
        }
      }
    }

    if (!pageSlug) return false;

    await page.goto(`/s/${siteSlug}/${pageSlug}`);
    await page.waitForTimeout(2_000);

    const form = page.locator("form").first();
    return await form.isVisible({ timeout: 5_000 }).catch(() => false);
  }

  test("create a form page, publish it, and get the URL", async ({ page }) => {
    await goToFirstSite(page);

    // Create a page with a form block
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Form Validation Page");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Add a form block (default has Name required, Email required, Message optional)
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

    // Close the dialog
    await page.getByRole("button", { name: /Continue editing/i }).click();
  });

  test("required field validation shows error on empty submit", async ({ page }) => {
    const isFormVisible = await goToPublishedForm(page);

    if (!isFormVisible) {
      test.skip();
      return;
    }

    // Submit the form without filling in any fields
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show error messages for required fields
    // The form has Name (required) and Email (required)
    await expect(
      page.locator("text=This field is required").first()
    ).toBeVisible({ timeout: 5_000 });

    // The form should NOT show success message
    await expect(
      page.locator("text=Thank you")
    ).not.toBeVisible({ timeout: 2_000 });
  });

  test("email validation shows error for invalid email", async ({ page }) => {
    const isFormVisible = await goToPublishedForm(page);

    if (!isFormVisible) {
      test.skip();
      return;
    }

    // Fill in the Name field
    const nameInput = page.locator('input[placeholder="Your name"]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("Test User");
    }

    // Fill in an invalid email
    const emailInput = page.locator('input[placeholder="your@email.com"]').first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill("not-a-valid-email");
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show email validation error
    await expect(
      page.locator("text=Please enter a valid email address")
    ).toBeVisible({ timeout: 5_000 });

    // Should NOT show success
    await expect(
      page.locator("text=Thank you")
    ).not.toBeVisible({ timeout: 2_000 });
  });

  test("successful form submission shows success message", async ({ page }) => {
    const isFormVisible = await goToPublishedForm(page);

    if (!isFormVisible) {
      test.skip();
      return;
    }

    // Fill in all required fields correctly
    const nameInput = page.locator('input[placeholder="Your name"]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill("E2E Test User");
    }

    const emailInput = page.locator('input[placeholder="your@email.com"]').first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill("test@example.com");
    }

    // Optionally fill in the message
    const messageInput = page.locator('textarea[placeholder="Your message..."]').first();
    if (await messageInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await messageInput.fill("This is an E2E test submission.");
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show success message
    await expect(
      page.locator("text=Thank you").or(page.locator("text=has been"))
    ).toBeVisible({ timeout: 10_000 });

    // Should show "Submit another response" button
    await expect(
      page.locator("text=Submit another response")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("field error clears when user starts typing", async ({ page }) => {
    const isFormVisible = await goToPublishedForm(page);

    if (!isFormVisible) {
      test.skip();
      return;
    }

    // Submit empty to trigger errors
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for error messages to appear
    const errorMessage = page.locator("text=This field is required").first();
    await expect(errorMessage).toBeVisible({ timeout: 5_000 });

    // The Name field should have an error next to it (its sibling span[role="alert"])
    const nameInput = page.locator('input[placeholder="Your name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 3_000 });

    // Locate the error span that is a sibling of the Name input (within the same form field div)
    const nameFieldContainer = nameInput.locator("xpath=..");
    const nameError = nameFieldContainer.locator('[role="alert"]');
    await expect(nameError).toBeVisible({ timeout: 3_000 });

    // Start typing in the Name field to clear its error
    await nameInput.fill("Clearing the error");

    // The error message for the Name field should clear (onChange calls clearFieldError)
    await expect(nameError).not.toBeVisible({ timeout: 5_000 });

    // The Email field error should still be visible
    const emailInput = page.locator('input[placeholder="your@email.com"]').first();
    const emailFieldContainer = emailInput.locator("xpath=..");
    const emailError = emailFieldContainer.locator('[role="alert"]');
    await expect(emailError).toBeVisible({ timeout: 3_000 });
  });
});
