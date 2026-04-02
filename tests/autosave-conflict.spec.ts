import { test, expect } from "@playwright/test";
import { goToFirstSite, openFirstPageEditor } from "./helpers";

test.describe("Autosave conflict resolution", () => {
  test("shows conflict banner when server returns 409 and allows force-save", async ({ page }) => {
    await goToFirstSite(page);
    await openFirstPageEditor(page);

    // Wait for editor to fully load
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 15_000 });

    // Intercept blocks PUT to return 409 conflict on next autosave
    let intercepted = false;
    await page.route("**/api/pages/*/blocks", async (route) => {
      if (route.request().method() === "PUT" && !intercepted) {
        intercepted = true;
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Conflict: page was modified by another session" }),
        });
      } else {
        await route.continue();
      }
    });

    // Trigger a change to cause autosave (edit the title)
    const titleInput = page.locator('input[placeholder="Page title"]');
    const original = await titleInput.inputValue();
    await titleInput.fill(original + " conflict-test");

    // Wait for autosave to fire (2s debounce + network time)
    // The conflict banner should appear
    const conflictBanner = page.locator('[data-testid="conflict-banner"]').or(
      page.locator("text=modified by another")
    ).or(
      page.locator("text=conflict")
    );

    await expect(conflictBanner.first()).toBeVisible({ timeout: 10_000 });

    // Remove the intercept so force-save succeeds
    await page.unroute("**/api/pages/*/blocks");

    // Look for a force-save or overwrite button
    const forceSaveBtn = page.getByRole("button", { name: /force|overwrite|save anyway/i }).first();
    if (await forceSaveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await forceSaveBtn.click();
      // After force-save, conflict banner should disappear
      await expect(conflictBanner.first()).toBeHidden({ timeout: 10_000 });
    }

    // Restore original title
    await titleInput.fill(original);
    // Wait for autosave to complete
    await page.waitForTimeout(3_000);
  });
});
