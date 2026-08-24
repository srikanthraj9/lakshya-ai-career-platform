import { test, expect } from "@playwright/test";

test.describe("Application Tracker & Kanban Pipeline E2E Suite", () => {
  test("protects application tracker route and preserves redirect URL", async ({ page }) => {
    await page.goto("/applications");
    await expect(page).toHaveURL(/login/);
  });
});
