import { test, expect } from "@playwright/test";

test.describe("Visual showcase", () => {
  test.describe.configure({ retries: 3 });

  const pages = [
    "",
    "/about",
    "/services",
    "/journal",
    "/contact",
    "/gallery",
  ];

  for (const path of pages) {
    test(`desktop screenshot: ${path || "/"}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/s/atlas-studio${path}`, { waitUntil: "load" });
      await page.waitForTimeout(2000);
      // Verify no client-side application error
      await expect(page.locator("text=Application error")).not.toBeVisible({ timeout: 5000 });
      // Scroll to trigger all ScrollReveal animations
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight)
      );
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `test-results/showcase-desktop${path.replace(/\//g, "-") || "-home"}.png`,
        fullPage: true,
      });
    });

    test(`mobile screenshot: ${path || "/"}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/s/atlas-studio${path}`, { waitUntil: "load" });
      await page.waitForTimeout(2000);
      await expect(page.locator("text=Application error")).not.toBeVisible({ timeout: 5000 });
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight)
      );
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `test-results/showcase-mobile${path.replace(/\//g, "-") || "-home"}.png`,
        fullPage: true,
      });
    });
  }

  // 404 page screenshot
  test("404 page screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/s/atlas-studio/nonexistent-page", { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: "test-results/showcase-desktop-404.png",
      fullPage: true,
    });
  });
});
