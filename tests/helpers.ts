import { type Page, expect } from "@playwright/test";

/** Navigate to the first site's page list. */
export async function goToFirstSite(page: Page): Promise<string> {
  await page.goto("/sites");
  // Wait for site cards to load (h3 with site name indicates a site card rendered)
  const siteCardName = page.locator("h3").first();
  await expect(siteCardName).toBeVisible({ timeout: 10_000 });
  // Click on the first site card link (which is the parent <a> of the h3)
  await siteCardName.click();
  await page.waitForURL(/\/sites\/\w/, { timeout: 10_000 });
  const url = page.url();
  const match = url.match(/\/sites\/([\w-]+)/);
  return match?.[1] ?? "";
}

/** Open the editor for the first page in the current site. */
export async function openFirstPageEditor(page: Page) {
  // Wait for the page list to load
  await page.waitForTimeout(1_000);
  // Page items have links to /editor/[pageId]
  const editorLink = page.locator('a[href*="/editor/"]').first();
  await expect(editorLink).toBeVisible({ timeout: 10_000 });
  await editorLink.click();
  await page.waitForURL(/\/editor\//, { timeout: 10_000 });
}
