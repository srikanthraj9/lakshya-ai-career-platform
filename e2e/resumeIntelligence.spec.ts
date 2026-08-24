import { test, expect } from "@playwright/test";

test.describe("Resume Intelligence & Diagnostic Rewrite E2E Suite", () => {
  test("verifies resume studio route structure", async ({ page }) => {
    await page.goto("/resume");
    // Redirects to login when unauthenticated
    await expect(page).toHaveURL(/login/);
  });
});
