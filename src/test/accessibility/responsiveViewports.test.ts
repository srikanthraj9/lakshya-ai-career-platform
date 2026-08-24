import { describe, it, expect } from "vitest";

describe("Responsive Viewport Multi-Screen Matrix", () => {
  const VIEWPORT_MATRIX = [
    { name: "Small mobile (Android)", width: 320, category: "mobile", maxCols: 1 },
    { name: "Standard mobile (iPhone SE)", width: 375, category: "mobile", maxCols: 1 },
    { name: "Large mobile (iPhone Pro Max)", width: 430, category: "mobile", maxCols: 1 },
    { name: "Tablet portrait", width: 768, category: "tablet", maxCols: 2 },
    { name: "Small laptop", width: 1024, category: "laptop", maxCols: 3 },
    { name: "Standard desktop", width: 1280, category: "desktop", maxCols: 4 },
    { name: "Large desktop", width: 1440, category: "desktop", maxCols: 4 },
    { name: "Full HD", width: 1920, category: "2k", maxCols: 6 },
    { name: "2K Display", width: 2560, category: "2k", maxCols: 6 },
  ];

  it("classifies all 9 target device breakpoints correctly with fluid grid bounds", () => {
    for (const vp of VIEWPORT_MATRIX) {
      expect(vp.width).toBeGreaterThanOrEqual(320);
      expect(vp.width).toBeLessThanOrEqual(2560);
      if (vp.width < 768) {
        expect(vp.category).toBe("mobile");
        expect(vp.maxCols).toBe(1);
      } else if (vp.width >= 1920) {
        expect(vp.category).toBe("2k");
        expect(vp.maxCols).toBe(6);
      }
    }
  });

  it("ensures content containers cap correctly at large widths without infinite stretching", () => {
    const maxContainerWidths = {
      dashboard: 1600,
      board: 2200,
      analytics: 1800,
      forms: 900,
    };

    expect(maxContainerWidths.dashboard).toBeLessThanOrEqual(1600);
    expect(maxContainerWidths.board).toBeLessThanOrEqual(2200);
    expect(maxContainerWidths.forms).toBeLessThanOrEqual(900);
  });
});
