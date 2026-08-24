import { test, expect } from "@playwright/test";

test.describe("Authentication & Session Invariant E2E Suite", () => {
  test("loads landing page and presents login navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lakshya/i);
    const loginBtn = page.locator('a[href="/login"]').first();
    await expect(loginBtn).toBeVisible();
  });

  test("validates unauthenticated redirect for protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    // Should gracefully redirect unauthenticated visitors to login
    await expect(page).toHaveURL(/login/);
  });
});
