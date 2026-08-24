import { test, expect } from "@playwright/test";

test.describe("Responsive Multi-Screen Matrix E2E Suite", () => {
  const VIEWPORTS = [
    { name: "320px Mobile", width: 320, height: 568 },
    { name: "375px Mobile", width: 375, height: 667 },
    { name: "768px Tablet", width: 768, height: 1024 },
    { name: "1024px Laptop", width: 1024, height: 768 },
    { name: "1440px Desktop", width: 1440, height: 900 },
  ];

  for (const vp of VIEWPORTS) {
    test(`renders landing page cleanly at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      
      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px margin of error for subpixel rendering
    });
  }
});
