import { test, expect } from "@playwright/test";
import { goToFirstSite } from "./helpers";

test.describe("Export and Import", () => {
  test("export site as JSON", async ({ page, request }) => {
    const siteId = await goToFirstSite(page);

    // Use the API directly to test export
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const res = await request.get(`/api/sites/${siteId}/export`, {
      headers: { Cookie: cookieHeader },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();

    // Validate export structure
    expect(data).toHaveProperty("site");
    expect(data).toHaveProperty("pages");
    expect(data.site).toHaveProperty("name");
    expect(data.site).toHaveProperty("slug");
    expect(Array.isArray(data.pages)).toBeTruthy();
    expect(data.pages.length).toBeGreaterThan(0);

    // Each page should have blocks
    for (const p of data.pages) {
      expect(p).toHaveProperty("title");
      expect(p).toHaveProperty("slug");
      expect(p).toHaveProperty("blocks");
      expect(Array.isArray(p.blocks)).toBeTruthy();
    }
  });

  test("import site from JSON backup", async ({ page, request }) => {
    const siteId = await goToFirstSite(page);

    // First export
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const exportRes = await request.get(`/api/sites/${siteId}/export`, {
      headers: { Cookie: cookieHeader },
    });
    expect(exportRes.status()).toBe(200);
    const exportData = await exportRes.json();

    // Modify name to avoid slug collision
    exportData.site.name = "Imported E2E Test Site";
    exportData.site.slug = "imported-e2e-test";

    // Import
    const importRes = await request.post("/api/sites/import", {
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      data: exportData,
    });

    expect(importRes.status()).toBe(201);
    const imported = await importRes.json();

    expect(imported).toHaveProperty("id");
    expect(imported.name).toBe("Imported E2E Test Site");

    // Verify the imported site has pages
    await page.goto("/sites");
    await page.waitForTimeout(1_000);
    await expect(
      page.locator("text=Imported E2E Test Site")
    ).toBeVisible({ timeout: 10_000 });

    // Clean up: delete the imported site
    const deleteRes = await request.delete(`/api/sites/${imported.id}`, {
      headers: { Cookie: cookieHeader },
    });
    expect(deleteRes.status()).toBe(200);
  });

  test("import rejects invalid JSON structure", async ({ page, request }) => {
    await goToFirstSite(page);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const importRes = await request.post("/api/sites/import", {
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      data: { invalid: "structure" },
    });

    expect(importRes.status()).toBe(400);
  });
});
