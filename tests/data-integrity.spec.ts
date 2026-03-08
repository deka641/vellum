import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";
import crypto from "crypto";

function uniqueId() {
  return crypto.randomBytes(12).toString("hex");
}

test.describe("Data integrity", () => {
  test("soft-deleted pages do not appear in site page list", async ({ page }) => {
    const _siteId = await goToFirstSite(page);

    // Create a new page
    await page.getByRole("button", { name: /New page/i }).click();
    const titleInput = page.locator(
      'input[placeholder*="About"], input[placeholder*="Blog"], input[placeholder*="Contact"]'
    );
    await titleInput.fill("E2E Soft Delete Visibility Test");
    await page.getByRole("button", { name: /Create page/i }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15_000 });
    await expect(
      page.locator('input[placeholder="Page title"]')
    ).toBeVisible({ timeout: 10_000 });

    // Go back to site
    await page.getByLabel("Back to site").click();
    await page.waitForURL(/\/sites\//, { timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Verify page is visible
    await expect(
      page.locator("text=E2E Soft Delete Visibility Test").first()
    ).toBeVisible({ timeout: 5_000 });

    // Delete the page (soft delete)
    const pageRow = page.locator('[class*="item"]').filter({ hasText: "E2E Soft Delete Visibility Test" }).first();
    const optionsButton = pageRow.getByLabel("Page options");
    await optionsButton.click();
    await page.locator("text=Delete page").click();
    await page.getByRole("button", { name: /Move to trash/i }).click();
    await expect(page.locator("text=Page moved to trash")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);

    // Verify the deleted page is NOT in the main list anymore
    // Reload the page to get fresh data from the API
    await page.reload();
    await page.waitForTimeout(2_000);

    // The page should not appear in the main list (not in trash view)
    const mainPageItems = page.locator('[class*="item"]').filter({ hasText: "E2E Soft Delete Visibility Test" });
    // If trash button is not active, we're in the main view
    const trashButton = page.locator("button", { hasText: /^Trash$/ });
    const isTrashActive = await trashButton.getAttribute("class").then(c => c?.includes("active")).catch(() => false);
    if (!isTrashActive) {
      const count = await mainPageItems.count();
      expect(count).toBe(0);
    }
  });

  test("soft-deleted page cannot be published via API", async ({ request }) => {
    // First create a page via API
    const sitesRes = await request.get("/api/sites");
    expect(sitesRes.ok()).toBeTruthy();
    const sites = await sitesRes.json();
    expect(sites.length).toBeGreaterThan(0);
    const siteId = sites[0].id;

    // Create a page
    const createRes = await request.post("/api/pages", {
      data: { title: "API Soft Delete Publish Test", siteId },
    });
    expect(createRes.ok()).toBeTruthy();
    const newPage = await createRes.json();

    // Soft-delete it
    const deleteRes = await request.delete(`/api/pages/${newPage.id}`);
    expect(deleteRes.ok()).toBeTruthy();

    // Try to publish the soft-deleted page
    const publishRes = await request.post(`/api/pages/${newPage.id}/publish`);
    expect(publishRes.status()).toBe(404);
  });

  test("soft-deleted page blocks cannot be updated via API", async ({ request }) => {
    const sitesRes = await request.get("/api/sites");
    const sites = await sitesRes.json();
    const siteId = sites[0].id;

    // Create a page
    const createRes = await request.post("/api/pages", {
      data: { title: "API Soft Delete Blocks Test", siteId },
    });
    const newPage = await createRes.json();

    // Soft-delete it
    await request.delete(`/api/pages/${newPage.id}`);

    // Try to update blocks on the soft-deleted page
    const blocksRes = await request.put(`/api/pages/${newPage.id}/blocks`, {
      data: {
        blocks: [{
          id: uniqueId(),
          type: "heading",
          content: { text: "Hello", level: 2 },
          settings: {},
        }],
      },
    });
    expect(blocksRes.status()).toBe(404);
  });

  test("optimistic locking returns 409 on conflict", async ({ request }) => {
    const sitesRes = await request.get("/api/sites");
    const sites = await sitesRes.json();
    const siteId = sites[0].id;

    // Create a page
    const createRes = await request.post("/api/pages", {
      data: { title: "API Optimistic Lock Test", siteId },
    });
    expect(createRes.ok()).toBeTruthy();
    const newPage = await createRes.json();

    // First save WITHOUT expectedUpdatedAt (always succeeds)
    const firstSave = await request.put(`/api/pages/${newPage.id}/blocks`, {
      data: {
        blocks: [{
          id: uniqueId(),
          type: "heading",
          content: { text: "First save", level: 2 },
          settings: {},
        }],
        title: "First Save",
      },
    });
    expect(firstSave.ok()).toBeTruthy();
    const firstSaveBody = await firstSave.json();

    // Second save uses the updatedAt from first save (valid, should succeed)
    const secondSave = await request.put(`/api/pages/${newPage.id}/blocks`, {
      data: {
        blocks: [{
          id: uniqueId(),
          type: "heading",
          content: { text: "Second save", level: 2 },
          settings: {},
        }],
        title: "Second Save",
        expectedUpdatedAt: firstSaveBody.updatedAt,
      },
    });
    expect(secondSave.ok()).toBeTruthy();

    // Third save uses the STALE updatedAt from first save (should conflict)
    const thirdSave = await request.put(`/api/pages/${newPage.id}/blocks`, {
      data: {
        blocks: [{
          id: uniqueId(),
          type: "heading",
          content: { text: "Third save", level: 2 },
          settings: {},
        }],
        title: "Third Save",
        expectedUpdatedAt: firstSaveBody.updatedAt, // stale!
      },
    });
    expect(thirdSave.status()).toBe(409);

    const conflictBody = await thirdSave.json();
    expect(conflictBody.error).toContain("Conflict");
    expect(conflictBody.serverState).toBeDefined();
  });

  test("revision restore replaces blocks via API", async ({ request }) => {
    const sitesRes = await request.get("/api/sites");
    const sites = await sitesRes.json();
    const siteId = sites[0].id;

    // Create a page
    const createRes = await request.post("/api/pages", {
      data: { title: "API Revision Restore Test", siteId },
    });
    expect(createRes.ok()).toBeTruthy();
    const newPage = await createRes.json();

    // Save initial blocks
    const blockId1 = uniqueId();
    const saveRes = await request.put(`/api/pages/${newPage.id}/blocks`, {
      data: {
        blocks: [{
          id: blockId1,
          type: "heading",
          content: { text: "Original Heading", level: 1 },
          settings: {},
        }],
        title: "Original Title",
      },
    });
    expect(saveRes.ok()).toBeTruthy();

    // Publish to create a revision
    const publishRes = await request.post(`/api/pages/${newPage.id}/publish`);
    expect(publishRes.ok()).toBeTruthy();

    // Modify blocks (different content)
    const blockId2 = uniqueId();
    const modifyRes = await request.put(`/api/pages/${newPage.id}/blocks`, {
      data: {
        blocks: [{
          id: blockId2,
          type: "text",
          content: { html: "<p>Modified content</p>" },
          settings: {},
        }],
        title: "Modified Title",
      },
    });
    expect(modifyRes.ok()).toBeTruthy();

    // Get revisions
    const revisionsRes = await request.get(`/api/pages/${newPage.id}/revisions`);
    expect(revisionsRes.ok()).toBeTruthy();
    const revisions = await revisionsRes.json();
    expect(revisions.length).toBeGreaterThan(0);

    // Restore the first revision
    const restoreRes = await request.post(
      `/api/pages/${newPage.id}/revisions/${revisions[0].id}/restore`
    );
    expect(restoreRes.ok()).toBeTruthy();

    // Verify blocks are restored
    const blocksRes = await request.get(`/api/pages/${newPage.id}/blocks`);
    expect(blocksRes.ok()).toBeTruthy();
    const blocks = await blocksRes.json();
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("heading");
    expect((blocks[0].content as Record<string, unknown>).text).toBe("Original Heading");
  });

  test("bulk unpublish protects homepage", async ({ request }) => {
    const sitesRes = await request.get("/api/sites");
    const sites = await sitesRes.json();
    const siteId = sites[0].id;

    // Get site pages to find the homepage
    const siteRes = await request.get(`/api/sites/${siteId}`);
    const siteData = await siteRes.json();
    const homepage = siteData.pages?.find((p: { isHomepage: boolean }) => p.isHomepage);

    if (!homepage) {
      // Skip if no homepage found
      return;
    }

    // Ensure homepage is published first
    if (homepage.status !== "PUBLISHED") {
      await request.post(`/api/pages/${homepage.id}/publish`);
    }

    // Try to bulk unpublish the homepage
    const bulkRes = await request.post("/api/pages/bulk-status", {
      data: {
        pageIds: [homepage.id],
        action: "unpublish",
      },
    });

    // Should return 400 because the homepage can't be unpublished
    // OR return success with 0 updated (since homepage is filtered out)
    if (bulkRes.ok()) {
      const body = await bulkRes.json();
      // Homepage should be filtered out, so 0 pages were updated
      // Or the endpoint returns an error for no valid pages
      expect(body.updated === 0 || body.error).toBeTruthy();
    } else {
      expect(bulkRes.status()).toBe(400);
    }
  });
});
