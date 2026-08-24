import { test, expect } from "@playwright/test";

test.describe("Admin Control Center & Governance E2E Suite", () => {
  test("prevents anonymous access to admin control center", async ({ page }) => {
    await page.goto("/admin");
    // Anonymous visitors redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
